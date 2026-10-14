"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/catalog";
import { convert, formatFromUsd, toUsd, type CurrencyCode } from "@/lib/currency";

const SOURCES = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram", label: "Instagram" },
  { key: "phone", label: "Phone call" },
  { key: "walk_in", label: "Walk-in" },
  { key: "other", label: "Other" },
];

const METHODS = [
  { key: "cash", label: "Cash" },
  { key: "transfer", label: "Transfer" },
  { key: "pos", label: "POS" },
  { key: "pod", label: "Pay on delivery" },
];

const STATUSES = [
  { key: "paid", label: "Paid" },
  { key: "fulfilled", label: "Delivered" },
  { key: "pending", label: "Not yet paid" },
];

export function ManualSaleForm({
  products,
  defaultCurrency,
}: {
  products: Product[];
  defaultCurrency: string;
}) {
  const router = useRouter();
  const currency = defaultCurrency as CurrencyCode;

  const [lines, setLines] = useState<{ productId: number; quantity: number }[]>([]);
  const [picker, setPicker] = useState("");
  const [customer, setCustomer] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    addressLine: "",
    city: "",
    state: "",
    sellerNote: "",
  });
  const [source, setSource] = useState("whatsapp");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [status, setStatus] = useState("paid");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const subtotalUsd = lines.reduce(
    (sum, line) => sum + (byId.get(line.productId)?.priceUsd ?? 0) * line.quantity,
    0,
  );

  const set = (key: keyof typeof customer) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setCustomer((current) => ({ ...current, [key]: event.target.value }));

  function addLine(id: number) {
    setLines((current) => {
      const existing = current.find((line) => line.productId === id);
      if (existing) {
        return current.map((line) =>
          line.productId === id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, { productId: id, quantity: 1 }];
    });
  }

  async function save() {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/admin/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...customer,
        country: "NG",
        countryName: "Nigeria",
        currency,
        source,
        paymentMethod,
        status,
        items: lines,
      }),
    });
    const data = (await response.json()) as { ok?: boolean; reference?: string; error?: string };
    setBusy(false);
    if (!response.ok || !data.reference) {
      setError(data.error ?? "Could not record the sale.");
      return;
    }
    setDone(data.reference);
    router.refresh();
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-line bg-white px-6 py-14 text-center">
        <p className="text-[17px] font-semibold tracking-[-0.015em]">Sale recorded</p>
        <p className="nums mt-2 text-[13.5px] text-muted">{done}</p>
        <p className="mt-3 text-[13px] text-muted">
          It now counts towards total sales and appears on the buyer&apos;s history.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          <Link href={`/orders/${done}`} className="btn btn-ghost btn-sm">
            Open the order
          </Link>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setDone(null);
              setLines([]);
              setCustomer({
                customerName: "",
                customerPhone: "",
                customerEmail: "",
                addressLine: "",
                city: "",
                state: "",
                sellerNote: "",
              });
            }}
          >
            Record another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Link href="/admin/orders" className="text-[12.5px] text-muted hover:text-ink">
            ← Orders
          </Link>
          <h1 className="title mt-3">Record a sale</h1>
          <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-muted">
            For orders taken on WhatsApp, Instagram, by phone or in the studio — so your totals show
            real revenue, not just the website.
          </p>
        </div>
      </header>

      {error ? (
        <p className="mt-6 rounded-xl bg-[#fbeaea] px-4 py-3 text-[13px] text-[#8c2f2f]">{error}</p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card title="What was sold">
            <label className="block">
              <span className="label">Add a product</span>
              <select
                className="field"
                value={picker}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (value) addLine(value);
                  setPicker("");
                }}
              >
                <option value="">Choose from the catalogue…</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {formatFromUsd(product.priceUsd, currency)}
                  </option>
                ))}
              </select>
            </label>

            {lines.length === 0 ? (
              <p className="mt-4 rounded-xl bg-mist px-4 py-5 text-center text-[12.5px] text-muted">
                Nothing added yet.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {lines.map((line) => {
                  const product = byId.get(line.productId);
                  if (!product) return null;
                  return (
                    <li
                      key={line.productId}
                      className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3"
                    >
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-mist">
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image.url} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{product.name}</p>
                        <p className="text-[11.5px] text-muted">{product.sizeLabel ?? "Morena"}</p>
                      </div>
                      <div className="flex items-center rounded-full border border-line">
                        <button
                          type="button"
                          onClick={() =>
                            setLines((current) =>
                              current
                                .map((l) =>
                                  l.productId === line.productId
                                    ? { ...l, quantity: l.quantity - 1 }
                                    : l,
                                )
                                .filter((l) => l.quantity > 0),
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center text-[13px] text-ink-soft"
                          aria-label="Decrease"
                        >
                          −
                        </button>
                        <span className="nums w-7 text-center text-[12.5px]">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setLines((current) =>
                              current.map((l) =>
                                l.productId === line.productId
                                  ? { ...l, quantity: Math.min(l.quantity + 1, 99) }
                                  : l,
                              ),
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center text-[13px] text-ink-soft"
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>
                      <p className="nums w-24 text-right text-[13px] font-medium">
                        {formatFromUsd(product.priceUsd * line.quantity, currency)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Who bought it">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Buyer name" required>
                <input className="field" value={customer.customerName} onChange={set("customerName")} />
              </Field>
              <Field label="Phone" required>
                <input
                  className="field nums"
                  value={customer.customerPhone}
                  onChange={set("customerPhone")}
                  placeholder="+234 …"
                />
              </Field>
              <Field label="Email (for the receipt)" className="sm:col-span-2">
                <input
                  className="field"
                  type="email"
                  value={customer.customerEmail}
                  onChange={set("customerEmail")}
                />
              </Field>
              <Field label="Delivery address" className="sm:col-span-2">
                <input
                  className="field"
                  value={customer.addressLine}
                  onChange={set("addressLine")}
                  placeholder="Leave blank if collected in person"
                />
              </Field>
              <Field label="City / town">
                <input className="field" value={customer.city} onChange={set("city")} />
              </Field>
              <Field label="State">
                <input className="field" value={customer.state} onChange={set("state")} />
              </Field>
              <Field label="Note for your records" className="sm:col-span-2">
                <textarea
                  className="field"
                  value={customer.sellerNote}
                  onChange={set("sellerNote")}
                  placeholder="How it was settled, who referred them, anything worth remembering"
                />
              </Field>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="The sale">
            <div className="flex flex-col gap-4">
              <RadioGroup label="Where it came from" name="source" options={SOURCES} value={source} onChange={setSource} />
              <RadioGroup label="How it was paid" name="method" options={METHODS} value={paymentMethod} onChange={setPaymentMethod} />
              <RadioGroup label="Status" name="status" options={STATUSES} value={status} onChange={setStatus} />
            </div>
          </Card>

          <Card title="Total">
            {lines.length === 0 ? (
              <p className="nums text-[22px] font-semibold tracking-[-0.02em]">
                {formatFromUsd(0, currency)}
              </p>
            ) : (
              <>
                <p className="nums text-[28px] font-semibold tracking-[-0.025em]">
                  {formatFromUsd(subtotalUsd, currency)}
                </p>
                <p className="mt-1 text-[11.5px] text-muted">
                  ≈ ${toUsd(convert(subtotalUsd, currency), currency).toFixed(2)} · {currency}
                </p>
                <ul className="mt-4 flex flex-col gap-1.5 border-t border-line pt-4 text-[12.5px]">
                  {lines.map((line) => {
                    const product = byId.get(line.productId);
                    if (!product) return null;
                    return (
                      <li key={line.productId} className="flex justify-between gap-3">
                        <span className="truncate text-muted">
                          {product.name} × {line.quantity}
                        </span>
                        <span className="nums shrink-0">
                          {formatFromUsd(product.priceUsd * line.quantity, currency)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy || lines.length === 0}
              className="btn btn-primary mt-5 w-full"
            >
              {busy ? "Saving…" : "Record this sale"}
            </button>
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
  required,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">
        {label}
        {required ? <span className="text-accent"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${
              value === option.key ? "bg-ink text-white" : "bg-mist text-ink-soft hover:bg-[#ebe9e5]"
            }`}
            aria-pressed={value === option.key}
            aria-label={name}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
