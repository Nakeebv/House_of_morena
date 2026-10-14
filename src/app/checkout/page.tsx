"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/store";
import {
  FREE_SHIPPING_USD,
  ZONE_LABELS,
  estimatedDelivery,
  shippingUsd,
  shippingZone,
} from "@/lib/currency";
import { SITE, whatsappLink } from "@/lib/site";

const COUNTRIES: { code: string; name: string }[] = [
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "BJ", name: "Benin" },
  { code: "TG", name: "Togo" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "SN", name: "Senegal" },
  { code: "ZA", name: "South Africa" },
  { code: "KE", name: "Kenya" },
  { code: "GB", name: "United Kingdom" },
  { code: "IE", name: "Ireland" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "IN", name: "India" },
  { code: "AU", name: "Australia" },
];

const PAYMENT_OPTIONS = [
  { key: "transfer", title: "Bank transfer", note: "Account details at the next step" },
  { key: "whatsapp", title: "Confirm on WhatsApp", note: "We finalise the order in chat" },
  { key: "pod", title: "Pay on delivery", note: "Iwo, Osogbo and Ibadan only" },
];

export default function CheckoutPage() {
  const { cart, ready, subtotalUsd, money, currency, country, countryName, clear, setQuantity, remove } =
    useStore();
  const router = useRouter();

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    addressLine: "",
    city: "",
    state: "",
    note: "",
  });
  const [selectedCountry, setSelectedCountry] = useState(country);
  const [fulfilment, setFulfilment] = useState<"delivery" | "pickup">(
    country === "NG" ? "delivery" : "delivery",
  );
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zone = shippingZone(selectedCountry);
  const delivery = shippingUsd({ country: selectedCountry, fulfilment, subtotalUsd });
  const total = subtotalUsd + delivery;

  const countryOptions = useMemo(() => {
    const list = [...COUNTRIES];
    if (!list.some((c) => c.code === selectedCountry)) {
      list.push({ code: selectedCountry, name: countryName });
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [countryName, selectedCountry]);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          country: selectedCountry,
          countryName: countryOptions.find((c) => c.code === selectedCountry)?.name ?? countryName,
          currency,
          fulfilment,
          paymentMethod,
          items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        }),
      });
      const data = (await response.json()) as { reference?: string; error?: string };
      if (!response.ok || !data.reference) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      clear();
      router.push(`/pay/${data.reference}`);
    } catch {
      setError("Network problem. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="shell py-24">
        <div className="h-5 w-40 animate-pulse rounded bg-mist" />
        <div className="mt-6 h-10 w-72 animate-pulse rounded bg-mist" />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="shell flex flex-col items-center justify-center py-28 text-center">
        <h1 className="title">Your bag is empty</h1>
        <p className="mt-4 max-w-sm text-[14.5px] leading-relaxed text-muted">
          Add a bottle, a bag or a pair of shoes and the order will be priced for your location.
        </p>
        <Link href="/shop" className="btn btn-primary mt-7">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="shell py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/shop" className="text-[12.5px] text-muted hover:text-ink">
            ← Continue shopping
          </Link>
          <h1 className="title mt-3">Checkout</h1>
        </div>
        <p className="text-[12.5px] text-muted">
          Priced in {currency} · {countryOptions.find((c) => c.code === selectedCountry)?.name}
        </p>
      </div>

      <form onSubmit={submit} className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div className="flex flex-col gap-10">
          <Section step="01" title="Contact">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required>
                <input
                  className="field"
                  value={form.customerName}
                  onChange={set("customerName")}
                  required
                  autoComplete="name"
                />
              </Field>
              <Field label="Phone (WhatsApp)" required>
                <input
                  className="field"
                  value={form.customerPhone}
                  onChange={set("customerPhone")}
                  placeholder="+234 ..."
                  required
                  autoComplete="tel"
                />
              </Field>
              <Field label="Email" className="sm:col-span-2">
                <input
                  className="field"
                  type="email"
                  value={form.customerEmail}
                  onChange={set("customerEmail")}
                  autoComplete="email"
                />
              </Field>
            </div>
          </Section>

          <Section step="02" title="Delivery">
            <div className="grid gap-4">
              <Field label="Country / region">
                <select
                  className="field"
                  value={selectedCountry}
                  onChange={(event) => setSelectedCountry(event.target.value)}
                >
                  {countryOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setFulfilment("delivery")}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    fulfilment === "delivery" ? "border-ink" : "border-line hover:border-muted"
                  }`}
                >
                  <p className="text-[14px] font-medium">Deliver to me</p>
                  <p className="mt-1 text-[12.5px] text-muted">
                    {ZONE_LABELS[zone]} · {estimatedDelivery(zone)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setFulfilment("pickup")}
                  disabled={selectedCountry !== "NG"}
                  className={`rounded-2xl border p-4 text-left transition-colors disabled:opacity-40 ${
                    fulfilment === "pickup" ? "border-ink" : "border-line hover:border-muted"
                  }`}
                >
                  <p className="text-[14px] font-medium">Collect in Iwo</p>
                  <p className="mt-1 text-[12.5px] text-muted">Free · ready within 24 hours</p>
                </button>
              </div>

              {fulfilment === "delivery" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Address" required className="sm:col-span-2">
                    <input
                      className="field"
                      value={form.addressLine}
                      onChange={set("addressLine")}
                      autoComplete="street-address"
                      required
                    />
                  </Field>
                  <Field label="City / town" required>
                    <input
                      className="field"
                      value={form.city}
                      onChange={set("city")}
                      autoComplete="address-level2"
                      required
                    />
                  </Field>
                  <Field label="State / region">
                    <input
                      className="field"
                      value={form.state}
                      onChange={set("state")}
                      autoComplete="address-level1"
                    />
                  </Field>
                </div>
              ) : (
                <div className="rounded-2xl bg-mist p-4 text-[13px] leading-relaxed text-ink-soft">
                  Collect from {SITE.address}. We will message you on WhatsApp when it is packed and
                  ready.
                </div>
              )}

              <Field label="Order note">
                <textarea
                  className="field"
                  value={form.note}
                  onChange={set("note")}
                  placeholder="Landmark, preferred delivery time, gift message…"
                />
              </Field>
            </div>
          </Section>

          <Section step="03" title="Payment">
            <div className="flex flex-col gap-2.5">
              {PAYMENT_OPTIONS.map((option) => {
                const disabled = option.key === "transfer" && selectedCountry !== "NG";
                return (
                  <label
                    key={option.key}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors ${
                      paymentMethod === option.key ? "border-ink" : "border-line hover:border-muted"
                    } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      className="accent-ink"
                      checked={paymentMethod === option.key}
                      disabled={disabled}
                      onChange={() => setPaymentMethod(option.key)}
                    />
                    <span>
                      <span className="block text-[14px] font-medium">{option.title}</span>
                      <span className="mt-0.5 block text-[12.5px] text-muted">{option.note}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </Section>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-line p-6">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Order summary</h2>

            <ul className="mt-5 flex flex-col gap-4">
              {cart.map((item) => (
                <li key={`${item.productId}-${item.sizeLabel ?? ""}`} className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-mist">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{item.name}</p>
                    <p className="truncate text-[11.5px] text-muted">{item.sizeLabel ?? "Morena"}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex items-center rounded-full border border-line">
                        <button
                          type="button"
                          onClick={() => setQuantity(item.productId, item.sizeLabel, item.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center text-[12px] text-ink-soft"
                          aria-label="Decrease"
                        >
                          −
                        </button>
                        <span className="nums w-5 text-center text-[11.5px]">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item.productId, item.sizeLabel, item.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center text-[12px] text-ink-soft"
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.productId, item.sizeLabel)}
                        className="text-[11.5px] text-muted hover:text-ink"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="nums text-[13px] font-medium">
                    {money(item.unitPriceUsd * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-6 flex flex-col gap-2.5 border-t border-line pt-5 text-[13.5px]">
              <Row label="Subtotal" value={money(subtotalUsd)} />
              <Row
                label={fulfilment === "pickup" ? "Collection" : `Delivery · ${ZONE_LABELS[zone]}`}
                value={delivery === 0 ? "Free" : money(delivery)}
              />
              <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4">
                <dt className="text-[14px] font-medium">Total</dt>
                <dd className="nums text-[21px] font-semibold tracking-[-0.02em]">{money(total)}</dd>
              </div>
            </dl>

            {subtotalUsd < FREE_SHIPPING_USD ? (
              <p className="mt-3 text-[11.5px] text-muted">
                Spend {money(FREE_SHIPPING_USD - subtotalUsd)} more for free delivery.
              </p>
            ) : (
              <p className="mt-3 text-[11.5px] text-muted">Free delivery applied.</p>
            )}

            {error ? (
              <p className="mt-4 rounded-xl bg-[#fbeaea] px-3.5 py-2.5 text-[12.5px] text-[#8c2f2f]">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={submitting} className="btn btn-primary mt-5 w-full">
              {submitting ? "Placing order…" : `Continue to payment · ${money(total)}`}
            </button>

            <p className="mt-3 text-center text-[11.5px] leading-relaxed text-muted">
              By continuing you agree to our returns policy. Need help?{" "}
              <a
                href={whatsappLink("Hello Morena Collection, I need help checking out.")}
                target="_blank"
                rel="noreferrer"
                className="link text-ink-soft"
              >
                WhatsApp us
              </a>
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Section({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3">
        <span className="nums text-[12px] tracking-[0.12em] text-accent">{step}</span>
        <h2 className="text-[19px] font-semibold tracking-[-0.02em]">{title}</h2>
      </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="nums font-medium">{value}</dd>
    </div>
  );
}
