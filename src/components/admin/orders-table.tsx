"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatFromUsd, type CurrencyCode } from "@/lib/currency";
import { SITE, whatsappLink } from "@/lib/site";

export type AdminOrderItem = {
  name: string;
  quantity: number;
  unitPriceUsd: number;
  sizeLabel: string | null;
};

export type AdminOrder = {
  id: number;
  reference: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  countryName: string;
  country: string;
  currency: string;
  fulfilment: string;
  paymentMethod: string;
  status: string;
  sourceLabel: string;
  sellerNote: string | null;
  note: string | null;
  totalUsd: number;
  subtotalUsd: number;
  shippingUsd: number;
  placedLabel: string;
  items: AdminOrderItem[];
};

const STATUSES = [
  { value: "pending", label: "Awaiting payment" },
  { value: "awaiting_confirmation", label: "Confirming payment" },
  { value: "paid", label: "Paid" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
];

const METHOD: Record<string, string> = {
  card: "Card",
  transfer: "Transfer",
  whatsapp: "WhatsApp",
  pod: "On delivery",
  cash: "Cash",
  pos: "POS",
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-[#fdf3e4] text-[#8a5a13]",
  awaiting_confirmation: "bg-[#fdf3e4] text-[#8a5a13]",
  paid: "bg-[#e9f3ec] text-[#26603a]",
  fulfilled: "bg-[#e9f3ec] text-[#26603a]",
  cancelled: "bg-[#fbeaea] text-[#8c2f2f]",
};

export function OrdersTable({ orders }: { orders: AdminOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [dispatch, setDispatch] = useState<{ reference: string; email: string | null } | null>(null);

  async function setStatus(id: number, status: string) {
    setBusy(id);
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    router.refresh();
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white px-6 py-16 text-center">
        <p className="text-[15px] font-medium">No orders yet</p>
        <p className="mt-2 text-[13px] text-muted">
          Website checkouts appear here instantly. Sales taken elsewhere can be added by hand.
        </p>
        <Link href="/admin/orders/new" className="btn btn-primary btn-sm mt-6">
          Record a sale
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {orders.map((order) => {
          const currency = order.currency as CurrencyCode;
          const money = (usd: number) => formatFromUsd(usd, currency);
          const expanded = open === order.id;

          return (
            <div
              key={order.id}
              className={`overflow-hidden rounded-2xl border border-line bg-white transition-opacity ${
                busy === order.id ? "opacity-50" : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : order.id)}
                  className="flex min-w-0 flex-[1.4] items-center gap-3 text-left"
                >
                  <span className="nums text-[13px] font-medium">{order.reference}</span>
                  <span className="hidden text-[12px] text-muted sm:block">{order.placedLabel}</span>
                  <span className="hidden rounded-full bg-mist px-2 py-0.5 text-[10.5px] font-medium text-ink-soft md:block">
                    {order.sourceLabel}
                  </span>
                </button>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px]">{order.customerName}</p>
                  <p className="truncate text-[11.5px] text-muted">
                    {order.city ? `${order.city}, ` : ""}
                    {order.countryName} · {METHOD[order.paymentMethod] ?? order.paymentMethod}
                  </p>
                </div>

                <p className="nums w-28 text-right text-[13.5px] font-medium">
                  {money(order.totalUsd)}
                  <span className="ml-1 text-[10.5px] text-muted">{order.currency}</span>
                </p>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    STATUS_TONE[order.status] ?? "bg-mist text-ink-soft"
                  }`}
                >
                  {STATUSES.find((s) => s.value === order.status)?.label ?? order.status}
                </span>

                <select
                  className="field h-9 w-[150px] shrink-0 text-[12px]"
                  value={order.status}
                  onChange={(event) => void setStatus(order.id, event.target.value)}
                  aria-label="Order status"
                >
                  {STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {expanded ? (
                <div className="border-t border-line bg-[#faf9f8] px-5 py-5">
                  <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
                    <div>
                      <p className="eyebrow text-muted">Prepare this</p>
                      <ul className="mt-3 flex flex-col gap-2">
                        {order.items.map((item, index) => (
                          <li
                            key={`${order.reference}-${index}`}
                            className="flex items-baseline justify-between gap-3 text-[13px]"
                          >
                            <span>
                              {item.name}
                              {item.sizeLabel ? (
                                <span className="text-muted"> · {item.sizeLabel}</span>
                              ) : null}
                              <span className="text-muted"> × {item.quantity}</span>
                            </span>
                            <span className="nums">
                              {money(item.unitPriceUsd * item.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <dl className="mt-4 flex flex-col gap-1.5 border-t border-line pt-4 text-[12.5px]">
                        <div className="flex justify-between">
                          <dt className="text-muted">Subtotal</dt>
                          <dd className="nums">{money(order.subtotalUsd)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted">
                            {order.fulfilment === "pickup" ? "Collection" : "Delivery"}
                          </dt>
                          <dd className="nums">
                            {order.shippingUsd === 0 ? "Free" : money(order.shippingUsd)}
                          </dd>
                        </div>
                        <div className="flex justify-between font-medium">
                          <dt>Total</dt>
                          <dd className="nums">{money(order.totalUsd)}</dd>
                        </div>
                      </dl>

                      {order.note ? (
                        <p className="mt-3 rounded-lg bg-white px-3 py-2 text-[12px] text-ink-soft">
                          Buyer&apos;s note: {order.note}
                        </p>
                      ) : null}
                      {order.sellerNote ? (
                        <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[12px] text-ink-soft">
                          Your note: {order.sellerNote}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="rounded-xl border border-line bg-white p-3.5">
                        <p className="eyebrow text-muted">Deliver to</p>
                        <address className="mt-1.5 text-[12px] not-italic leading-relaxed">
                          {order.fulfilment === "pickup" || !order.addressLine ? (
                            <>
                              Collect from
                              <br />
                              {SITE.address}
                            </>
                          ) : (
                            <>
                              <span className="font-medium">{order.customerName}</span>
                              <br />
                              {order.addressLine}
                              <br />
                              {order.city}
                              {order.state ? `, ${order.state}` : ""}
                              <br />
                              {order.countryName}
                            </>
                          )}
                        </address>
                      </div>

                      <a className="btn btn-ghost btn-sm" href={`tel:${order.customerPhone}`}>
                        Call {order.customerPhone}
                      </a>
                      <a
                        className="btn btn-ghost btn-sm"
                        href={whatsappLink(
                          `Hello ${order.customerName}, this is ${SITE.brand} about order ${order.reference}.`,
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        className="btn btn-quiet btn-sm"
                        disabled={!order.customerEmail}
                        onClick={() =>
                          setDispatch({ reference: order.reference, email: order.customerEmail })
                        }
                      >
                        {order.customerEmail ? "Email dispatch note" : "No email on order"}
                      </button>
                      <Link href={`/orders/${order.reference}`} className="btn btn-quiet btn-sm">
                        Open receipt
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {dispatch ? (
        <DispatchNote
          reference={dispatch.reference}
          email={dispatch.email}
          onClose={() => setDispatch(null)}
        />
      ) : null}
    </>
  );
}

function DispatchNote({
  reference,
  email,
  onClose,
}: {
  reference: string;
  email: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setBusy(true);
    setResult(null);
    const response = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "shipping_note", reference, courier, tracking }),
    });
    const data = (await response.json()) as { ok?: boolean; message?: string; error?: string };
    setBusy(false);
    setResult({ ok: Boolean(data.ok), text: data.message ?? data.error ?? "Something went wrong." });
    if (data.ok) {
      router.refresh();
      setTimeout(onClose, 1200);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/30 sm:items-center sm:p-6">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 fade" />
      <div className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-line bg-white sm:rounded-3xl slide-in">
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <p className="eyebrow text-muted">Dispatch note</p>
            <p className="nums mt-1.5 text-[15px] font-semibold tracking-[-0.01em]">{reference}</p>
            <p className="text-[12px] text-muted">{email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] text-muted transition-colors hover:text-ink"
          >
            Close
          </button>
        </header>

        <div className="px-6 py-5">
          <p className="text-[13px] leading-relaxed text-muted">
            Emails the buyer to say their order has left the studio, with the courier and tracking
            number.
          </p>
          <label className="mt-5 block">
            <span className="label">Courier</span>
            <input
              className="field"
              value={courier}
              onChange={(event) => setCourier(event.target.value)}
              placeholder="GIG Logistics, DHL, rider…"
            />
          </label>
          <label className="mt-4 block">
            <span className="label">Tracking number</span>
            <input
              className="field nums"
              value={tracking}
              onChange={(event) => setTracking(event.target.value)}
            />
          </label>
          {result ? (
            <p
              className={`mt-4 rounded-xl px-3.5 py-2.5 text-[12.5px] ${
                result.ok ? "bg-[#e9f3ec] text-[#26603a]" : "bg-[#fbeaea] text-[#8c2f2f]"
              }`}
            >
              {result.text}
            </p>
          ) : null}
        </div>

        <footer className="border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy}
            className="btn btn-primary w-full"
          >
            {busy ? "Sending…" : "Email the buyer"}
          </button>
        </footer>
      </div>
    </div>
  );
}
