"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatFromUsd, type CurrencyCode } from "@/lib/currency";
import { SITE, whatsappLink } from "@/lib/site";

export type BuyerOrder = {
  reference: string;
  placedLabel: string;
  status: string;
  sourceLabel: string;
  methodLabel: string;
  totalUsd: number;
  currency: string;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  countryName: string;
  note: string | null;
  sellerNote: string | null;
  items: { name: string; quantity: number; unitPriceUsd: number; sizeLabel: string | null }[];
};

export type BuyerRow = {
  phone: string;
  name: string;
  email: string | null;
  countryName: string | null;
  city: string | null;
  state: string | null;
  addressLine: string | null;
  currency: string;
  ordersCount: number;
  paidCount: number;
  spentUsd: number;
  firstOrder: string;
  lastOrder: string;
  orders: BuyerOrder[];
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-[#fdf3e4] text-[#8a5a13]",
  awaiting_confirmation: "bg-[#fdf3e4] text-[#8a5a13]",
  paid: "bg-[#e9f3ec] text-[#26603a]",
  fulfilled: "bg-[#e9f3ec] text-[#26603a]",
  cancelled: "bg-[#fbeaea] text-[#8c2f2f]",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting payment",
  awaiting_confirmation: "Confirming",
  paid: "Paid",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

export function BuyersTable({
  buyers,
  emailReady,
}: {
  buyers: BuyerRow[];
  emailReady: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [composer, setComposer] = useState<BuyerRow | null>(null);

  if (buyers.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white px-6 py-16 text-center">
        <p className="text-[15px] font-medium">No buyers yet</p>
        <p className="mt-2 text-[13px] text-muted">
          Every person who orders — from the website, WhatsApp or a walk-in — appears here.
        </p>
        <Link href="/admin/orders/new" className="btn btn-primary btn-sm mt-6">
          Record a sale
        </Link>
      </div>
    );
  }

  return (
    <>
      {!emailReady ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-4">
          <p className="text-[12.5px] leading-relaxed text-muted">
            Messages you write are saved and queued. Add a <span className="nums">RESEND_API_KEY</span>{" "}
            to deliver them to real inboxes.
          </p>
          <Link href="/admin/settings" className="btn btn-ghost btn-sm shrink-0">
            Email setup
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {buyers.map((buyer) => {
          const currency = buyer.currency as CurrencyCode;
          const money = (usd: number) => formatFromUsd(usd, currency);
          const expanded = open === buyer.phone;

          return (
            <div key={buyer.phone} className="overflow-hidden rounded-2xl border border-line bg-white">
              <div className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : buyer.phone)}
                  className="flex min-w-0 flex-[2] items-center gap-3 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-[12px] font-semibold">
                    {initials(buyer.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium">{buyer.name}</span>
                    <span className="block truncate text-[11.5px] text-muted">
                      {buyer.city ? `${buyer.city}, ` : ""}
                      {buyer.countryName ?? "—"} · since {buyer.firstOrder}
                    </span>
                  </span>
                </button>

                <div className="min-w-0 flex-1">
                  <p className="nums truncate text-[12.5px]">{buyer.phone}</p>
                  <p className="truncate text-[11.5px] text-muted">
                    {buyer.email ?? "No email address"}
                  </p>
                </div>

                <div className="w-20 text-right">
                  <p className="nums text-[13px] font-medium">{buyer.ordersCount}</p>
                  <p className="text-[11px] text-muted">orders</p>
                </div>

                <div className="w-28 text-right">
                  <p className="nums text-[13px] font-medium">{money(buyer.spentUsd)}</p>
                  <p className="text-[11px] text-muted">spent</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={`tel:${buyer.phone}`}
                    className="rounded-full border border-line px-3 py-1.5 text-[11.5px] font-medium transition-colors hover:border-ink"
                  >
                    Call
                  </a>
                  <button
                    type="button"
                    onClick={() => setComposer(buyer)}
                    disabled={!buyer.email}
                    className="rounded-full bg-ink px-3 py-1.5 text-[11.5px] font-medium text-white transition-opacity disabled:opacity-35"
                  >
                    Email
                  </button>
                </div>
              </div>

              {expanded ? (
                <div className="border-t border-line bg-[#faf9f8] px-5 py-5">
                  <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
                    <div>
                      <p className="eyebrow text-muted">Purchase history</p>
                      <ul className="mt-3 flex flex-col gap-4">
                        {buyer.orders.map((order) => (
                          <li key={order.reference} className="border-b border-line pb-4 last:border-0">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <Link
                                href={`/orders/${order.reference}`}
                                className="nums text-[12.5px] font-medium"
                              >
                                {order.reference}
                              </Link>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                                  STATUS_TONE[order.status] ?? "bg-mist text-ink-soft"
                                }`}
                              >
                                {STATUS_LABEL[order.status] ?? order.status}
                              </span>
                              <span className="text-[11px] text-muted">
                                {order.sourceLabel} · {order.methodLabel} · {order.placedLabel}
                              </span>
                            </div>
                            <ul className="mt-2 flex flex-col gap-1">
                              {order.items.map((item, index) => (
                                <li
                                  key={`${order.reference}-${index}`}
                                  className="flex justify-between text-[12.5px] text-ink-soft"
                                >
                                  <span>
                                    {item.name}
                                    {item.sizeLabel ? (
                                      <span className="text-muted"> · {item.sizeLabel}</span>
                                    ) : null}{" "}
                                    <span className="text-muted">× {item.quantity}</span>
                                  </span>
                                  <span className="nums">
                                    {money(item.unitPriceUsd * item.quantity)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[11.5px] text-muted">
                                {order.addressLine
                                  ? `${order.addressLine}, ${order.city ?? ""} ${order.state ?? ""}`
                                  : "Collected from the studio"}
                              </span>
                              <span className="nums text-[13px] font-medium">
                                {money(order.totalUsd)}
                              </span>
                            </div>
                            {order.sellerNote ? (
                              <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[11.5px] text-ink-soft">
                                {order.sellerNote}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className="eyebrow text-muted">Reach {buyer.name.split(" ")[0]}</p>
                      <a className="btn btn-ghost btn-sm" href={`tel:${buyer.phone}`}>
                        Call {buyer.phone}
                      </a>
                      <a
                        className="btn btn-ghost btn-sm"
                        href={whatsappLink(
                          `Hello ${buyer.name}, this is ${SITE.brand}. Thank you for your order.`,
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={!buyer.email}
                        onClick={() => setComposer(buyer)}
                      >
                        Send an email
                      </button>
                      {buyer.addressLine ? (
                        <div className="mt-2 rounded-xl border border-line bg-white p-3">
                          <p className="eyebrow text-muted">Ship to</p>
                          <address className="mt-1.5 text-[12px] not-italic leading-relaxed">
                            {buyer.name}
                            <br />
                            {buyer.addressLine}
                            <br />
                            {buyer.city}
                            {buyer.state ? `, ${buyer.state}` : ""}
                            <br />
                            {buyer.countryName}
                          </address>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {composer ? (
        <Composer buyer={composer} onClose={() => setComposer(null)} />
      ) : null}
    </>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function Composer({ buyer, onClose }: { buyer: BuyerRow; onClose: () => void }) {
  const router = useRouter();
  const [subject, setSubject] = useState(`Your order from ${SITE.brand}`);
  const [body, setBody] = useState(
    `Hello ${buyer.name.split(" ")[0]},\n\nThank you for ordering from ${SITE.brand}.\n\n`,
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function send() {
    setBusy(true);
    setResult(null);
    const response = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: buyer.email,
        toName: buyer.name,
        subject,
        body,
      }),
    });
    const data = (await response.json()) as {
      ok?: boolean;
      message?: string;
      error?: string;
      status?: string;
    };
    setBusy(false);
    setResult({ ok: Boolean(data.ok), text: data.message ?? data.error ?? "Something went wrong." });
    if (data.ok) {
      router.refresh();
      setTimeout(onClose, 1200);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-6">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 fade" />

      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-white sm:rounded-3xl slide-in">
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <p className="eyebrow text-muted">Email the buyer</p>
            <p className="mt-1.5 text-[15px] font-semibold tracking-[-0.01em]">{buyer.name}</p>
            <p className="text-[12.5px] text-muted">{buyer.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] text-muted transition-colors hover:text-ink"
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <label className="block">
            <span className="label">Subject</span>
            <input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label className="mt-4 block">
            <span className="label">Message</span>
            <textarea
              className="field min-h-[190px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
            Sent from {SITE.email}. A copy is kept in the message history.
          </p>
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
            disabled={busy || !subject.trim() || !body.trim()}
            className="btn btn-primary w-full"
          >
            {busy ? "Sending…" : "Send email"}
          </button>
        </footer>
      </div>
    </div>
  );
}
