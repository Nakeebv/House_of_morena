"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  CURRENCIES,
  CURRENCY_ORDER,
  convert,
  formatFromUsd,
  toUsd,
  type CurrencyCode,
} from "@/lib/currency";

type FormImage = { id?: number; url: string; alt?: string };

type FormState = {
  name: string;
  slug: string;
  categoryId: number | null;
  shortDescription: string;
  description: string;
  details: string;
  sizeLabel: string;
  stock: number;
  status: string;
  featured: boolean;
  sortOrder: number;
};

export type ProductFormValues = {
  id?: number;
  name: string;
  slug: string;
  categoryId: number | null;
  shortDescription: string | null;
  description: string | null;
  details: string | null;
  sizeLabel: string | null;
  priceUsd: number;
  compareUsd: number | null;
  stock: number;
  status: string;
  featured: boolean;
  sortOrder: number;
  images: FormImage[];
};

const PREVIEW: CurrencyCode[] = ["NGN", "USD", "GBP", "EUR"];

/**
 * Resizes a photo in the browser to 1400px JPEG before upload — smaller
 * payloads, faster pages. Handles the iPhone camera's EXIF rotation, and
 * produces a clean JPEG blob even when the source was PNG/WebP.
 */
async function toUploadBlob(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const max = 1400;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (blob) return blob;
    throw new Error("browser could not re-encode");
  } catch {
    // The browser could not decode the file (typical for iPhone HEIC photos).
    // Pass the original through when it is a type the server accepts.
    if (["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
    throw new Error(
      "That photo is in a format the browser cannot read (iPhone HEIC?). Convert it to JPG and try again.",
    );
  }
}

/** Sends the image as raw bytes — half the payload of a base64 JSON envelope. */
async function uploadImageBlob(blob: Blob, alt: string): Promise<{ id: number; url: string }> {
  let response: Response;
  try {
    response = await fetch("/api/admin/images", {
      method: "POST",
      headers: { "Content-Type": blob.type || "image/jpeg", "x-image-alt": alt },
      body: blob,
    });
  } catch {
    throw new Error("Could not reach the server — check your connection and try again.");
  }
  const text = await response.text();
  let data: { id?: number; url?: string; error?: string } = {};
  try {
    data = JSON.parse(text) as { id?: number; url?: string; error?: string };
  } catch {
    throw new Error(
      response.ok
        ? "The server sent an unreadable reply — try that photo once more."
        : `Upload failed (${response.status}). Try a smaller photo or report this to support.`,
    );
  }
  if (!response.ok || !data.url || typeof data.id !== "number") {
    throw new Error(data.error ?? "The image could not be uploaded.");
  }
  return { id: data.id, url: data.url };
}

export function ProductForm({
  categories,
  product,
}: {
  categories: { id: number; name: string; slug: string }[];
  product?: ProductFormValues;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState<FormState>({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    categoryId: product?.categoryId ?? categories[0]?.id ?? null,
    shortDescription: product?.shortDescription ?? "",
    description: product?.description ?? "",
    details: product?.details ?? "",
    sizeLabel: product?.sizeLabel ?? "",
    stock: product?.stock ?? 10,
    status: product?.status ?? "live",
    featured: product?.featured ?? false,
    sortOrder: product?.sortOrder ?? 100,
  });

  const [priceAmount, setPriceAmount] = useState<string>(
    product ? String(Math.round(convert(product.priceUsd, "NGN"))) : "",
  );
  const [priceCurrency, setPriceCurrency] = useState<string>("NGN");
  const [compareAmount, setCompareAmount] = useState<string>(
    product?.compareUsd ? String(Math.round(convert(product.compareUsd, "NGN"))) : "",
  );

  const [images, setImages] = useState<FormImage[]>(product?.images ?? []);
  const [urlInput, setUrlInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amount = Number(priceAmount.replace(/,/g, "")) || 0;
  const priceUsd = amount > 0 ? toUsd(amount, priceCurrency as CurrencyCode) : 0;
  const compare = Number(compareAmount.replace(/,/g, "")) || 0;

  const set = (key: keyof typeof values) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setValues((current) => ({ ...current, [key]: event.target.value }));

  function moveImage(index: number, delta: number) {
    setImages((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function makeMain(index: number) {
    setImages((current) => [current[index], ...current.filter((_, i) => i !== index)]);
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploading(true);
    setError(null);
    let index = 0;
    let failures = 0;
    try {
      for (const file of list) {
        index += 1;
        setStatus(`Uploading ${index} of ${list.length}…`);
        try {
          const blob = await toUploadBlob(file);
          const uploaded = await uploadImageBlob(blob, values.name || file.name);
          setImages((current) => [...current, { id: uploaded.id, url: uploaded.url, alt: values.name }]);
        } catch (fileError) {
          failures += 1;
          setError(fileError instanceof Error ? fileError.message : "One image could not be uploaded.");
        }
      }
    } finally {
      setUploading(false);
      setStatus(null);
    }
    if (failures === 0 && index > 0) setError(null);
  }

  async function removeImage(index: number) {
    const image = images[index];
    setImages((current) => current.filter((_, i) => i !== index));
    if (image?.id) {
      await fetch("/api/admin/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: image.id }),
      });
    }
  }

  async function save(view = false) {
    setBusy(true);
    setError(null);
    const payload = {
      id: product?.id,
      ...values,
      categoryId: values.categoryId,
      priceAmount: amount,
      priceCurrency,
      compareAmount: compare > 0 ? compare : null,
      imageIds: images.filter((image) => image.id).map((image) => image.id) as number[],
      imageUrls: images
        .filter((image) => !image.id)
        .map((image) => ({ url: image.url, alt: image.alt ?? values.name })),
    };

    const response = await fetch("/api/admin/products", {
      method: product?.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { ok?: boolean; error?: string; slug?: string };
    if (!response.ok) {
      setError(data.error ?? "Could not save the product.");
      setBusy(false);
      return;
    }

    router.refresh();
    if (view && data.slug) {
      router.push(`/product/${data.slug}`);
      return;
    }
    router.push("/admin/products");
  }

  return (
    <div className="pb-16">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Link href="/admin/products" className="text-[12.5px] text-muted hover:text-ink">
            ← Products
          </Link>
          <h1 className="title mt-3">{product?.id ? "Edit product" : "New product"}</h1>
        </div>
        <div className="flex gap-2.5">
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void save(true)}>
            Save &amp; view
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void save(false)}>
            {busy ? "Saving…" : "Save product"}
          </button>
        </div>
      </header>

      {error ? (
        <p className="mt-6 rounded-xl bg-[#fbeaea] px-4 py-3 text-[13px] text-[#8c2f2f]">{error}</p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card title="Details">
            <div className="grid gap-4">
              <Field label="Product name">
                <input className="field" value={values.name} onChange={set("name")} placeholder="e.g. Morena Noir" />
              </Field>
              <Field label="One-line summary">
                <input
                  className="field"
                  value={values.shortDescription}
                  onChange={set("shortDescription")}
                  placeholder="Smoked amber, black pepper, cedar."
                />
              </Field>
              <Field label="Description">
                <textarea className="field" value={values.description} onChange={set("description")} />
              </Field>
              <Field label="Notes / materials">
                <input
                  className="field"
                  value={values.details}
                  onChange={set("details")}
                  placeholder="Top: … Heart: … Base: …"
                />
              </Field>
              <Field label="Size or variant label">
                <input
                  className="field"
                  value={values.sizeLabel}
                  onChange={set("sizeLabel")}
                  placeholder="100 ml · Eau de Parfum"
                />
              </Field>
            </div>
          </Card>

          <Card title="Photos">
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void uploadFiles(event.dataTransfer.files);
              }}
              className="rounded-2xl border border-dashed border-line px-5 py-8 text-center"
            >
              <p className="text-[13.5px] font-medium">Drop images here</p>
              <p className="mt-1 text-[12px] text-muted">
                JPG, PNG or WebP · add as many as you like · the first photo is the main one
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) void uploadFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <button type="button" className="btn btn-quiet btn-sm mt-4" onClick={() => fileRef.current?.click()}>
                {uploading ? status ?? "Uploading…" : "Choose files"}
              </button>
            </div>

            {images.length > 0 ? (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((image, index) => (
                  <div
                    key={`${image.url}-${index}`}
                    className="group relative aspect-square overflow-hidden rounded-xl bg-mist"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt="" className="h-full w-full object-cover" />
                    {index === 0 ? (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-ink px-2 py-0.5 text-[9.5px] font-medium text-white">
                        Main
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => makeMain(index)}
                        className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[9.5px] font-medium text-ink shadow-sm transition-opacity hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        Make main
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void removeImage(index)}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[13px] text-ink shadow-sm sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                    <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-black/45 to-transparent pb-1.5 pt-4 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => moveImage(index, -1)}
                        disabled={index === 0}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[12px] text-ink disabled:opacity-30"
                        aria-label="Move image left"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(index, 1)}
                        disabled={index === images.length - 1}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[12px] text-ink disabled:opacity-30"
                        aria-label="Move image right"
                      >
                        →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <p className="mt-3 text-[11.5px] text-muted">
              Hover a photo to reorder it (← →) or set it as the main image. Removed photos are deleted
              when you remove them here.
            </p>

            <div className="mt-4 flex gap-2">
              <input
                className="field h-10 text-[13px]"
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
                placeholder="…or paste an image URL"
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (!urlInput.trim()) return;
                  setImages((current) => [...current, { url: urlInput.trim(), alt: values.name }]);
                  setUrlInput("");
                }}
              >
                Add
              </button>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Pricing">
            <div className="grid grid-cols-[1fr_112px] gap-3">
              <Field label="Price">
                <input
                  className="field nums"
                  value={priceAmount}
                  onChange={(event) => setPriceAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="45000"
                />
              </Field>
              <Field label="Currency">
                <select
                  className="field"
                  value={priceCurrency}
                  onChange={(event) => setPriceCurrency(event.target.value)}
                >
                  {CURRENCY_ORDER.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Compare-at price (optional)" className="mt-4">
              <input
                className="field nums"
                value={compareAmount}
                onChange={(event) => setCompareAmount(event.target.value)}
                inputMode="decimal"
                placeholder="52000"
              />
            </Field>

            {amount > 0 ? (
              <div className="mt-4 rounded-xl bg-mist p-4">
                <p className="eyebrow text-muted">Buyers will see</p>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {PREVIEW.map((code) => (
                    <p key={code} className="nums text-[13px]">
                      <span className="text-muted">{code} </span>
                      {formatFromUsd(priceUsd, code)}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
              One price is stored and converted for every market using today&apos;s rate (1 USD ={" "}
              <span className="nums">{CURRENCIES.NGN.perUsd}</span> NGN).
            </p>
          </Card>

          <Card title="Inventory">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stock on hand">
                <input
                  className="field nums"
                  value={values.stock}
                  onChange={(event) => setValues((c) => ({ ...c, stock: Number(event.target.value) || 0 }))}
                  inputMode="numeric"
                />
              </Field>
              <Field label="Sort order">
                <input
                  className="field nums"
                  value={values.sortOrder}
                  onChange={(event) => setValues((c) => ({ ...c, sortOrder: Number(event.target.value) || 0 }))}
                  inputMode="numeric"
                />
              </Field>
            </div>
            <Field label="Category" className="mt-4">
              <select
                className="field"
                value={values.categoryId ?? ""}
                onChange={(event) =>
                  setValues((c) => ({
                    ...c,
                    categoryId: event.target.value ? Number(event.target.value) : null,
                  }))
                }
              >
                <option value="">Uncategorised</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="mt-5 flex flex-col gap-3">
              <Toggle
                label="Live on the storefront"
                note="Turn off to hide it without deleting"
                checked={values.status === "live"}
                onChange={(checked) => setValues((c) => ({ ...c, status: checked ? "live" : "draft" }))}
              />
              <Toggle
                label="Feature on the homepage"
                note="Shown in the collection grid"
                checked={values.featured}
                onChange={(checked) => setValues((c) => ({ ...c, featured: checked }))}
              />
            </div>
          </Card>

          <Card title="Link">
            <Field label="URL handle">
              <input className="field" value={values.slug} onChange={set("slug")} placeholder="morena-noir" />
            </Field>
            <p className="mt-2 text-[11.5px] text-muted">
              Leave blank and we generate one from the name.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 md:p-6">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  note,
  checked,
  onChange,
}: {
  label: string;
  note: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-left transition-colors hover:border-muted"
    >
      <span
        className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
          checked ? "bg-ink" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all ${
            checked ? "left-[19px]" : "left-[3px]"
          }`}
        />
      </span>
      <span>
        <span className="block text-[13.5px] font-medium">{label}</span>
        <span className="block text-[11.5px] text-muted">{note}</span>
      </span>
    </button>
  );
}
