"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatFromUsd, type CurrencyCode } from "@/lib/currency";
import { SITE, whatsappLink } from "@/lib/site";

type Method = "transfer" | "whatsapp" | "pod";

export type PayOrder = {
  reference: string;
  customerName: string;
  currency: string;
  country: string;
  fulfilment: string;
  method: string;
  totalUsd: number;
  subtotalUsd: number;
  shippingUsd: number;
  items: { name: string; quantity: number; unitPriceUsd: number; sizeLabel: string | null }[];
};

export function PaymentPanel({ order }: { order: PayOrder }) {
  const router = useRouter();
  const currency = order.currency as CurrencyCode;
  const money = (usd: number) => formatFromUsd(usd, currency);

  const [method, setMethod] = useState<Method>(
    (["transfer", "whatsapp", "pod"] as Method[]).includes(order.method as Method)
      ? (order.method as Method)
      : "transfer",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Card payment is on hold until a live processor is connected.
  const methods: { key: Method; title: string; note: string; available: boolean }[] = [
    { key: "transfer", title: "Bank transfer", note: "NGN account", available: order.country === "NG" },
    { key: "whatsapp", title: "WhatsApp", note: "Confirm in chat", available: true },
    {
      key: "pod",
      title: "Pay on delivery",
      note: "Iwo · Osogbo · Ibadan",
      available: order.country === "NG",
    },
  ];

  async function send(action: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${order.reference}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "That did not go through. Try again.");
        setBusy(false);
        return;
      }
      router.push(`/orders/${order.reference}`);
    } catch {
      setError("Network problem. Please try again.");
      setBusy(false);
    }
  }

  const waMessage = [
    `Hello Morena Collection, this is my order ${order.reference}.`,
    "",
    ...order.items.map(
      (item) =>
        `• ${item.name}${item.sizeLabel ? ` (${item.sizeLabel})` : ""} × ${item.quantity} — ${money(
          item.unitPriceUsd * item.quantity,
        )}`,
    ),
    "",
    `Total: ${money(order.totalUsd)} ${order.currency}`,
    `Name: ${order.customerName}`,
  ].join("\n");

  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
      <div>
        <div className="no-bar -mx-1 flex gap-2 overflow-x-auto px-1">
          {methods
            .filter((option) => option.available)
            .map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setMethod(option.key);
                  setError(null);
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] transition-colors ${
                  method === option.key
                    ? "bg-ink text-white"
                    : "bg-mist text-ink-soft hover:bg-[#ebe9e5]"
                }`}
              >
                {option.title}
                <span className="ml-2 text-[11px] opacity-60">{option.note}</span>
              </button>
            ))}
        </div>

        <div className="mt-8">
          {method === "transfer" ? (
            <div className="flex flex-col gap-5">
              <h2 className="text-[19px] font-semibold tracking-[-0.02em]">Transfer to our account</h2>
              <div className="rounded-2xl border border-line p-5">
                <Row label="Bank" value={SITE.bankDetails.bank} />
                <Row label="Account name" value={SITE.bankDetails.accountName} />
                <Row label="Account number" value={SITE.bankDetails.accountNumber} mono />
                <Row label="Amount" value={`${money(order.totalUsd)} ${order.currency}`} />
                <Row label="Reference" value={order.reference} mono />
              </div>
              <p className="text-[13.5px] leading-relaxed text-muted">
                Send the exact amount and use the order reference as the transfer narration. We
                confirm transfers within a few minutes during shop hours.
              </p>
              {error ? <ErrorNote message={error} /> : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void send("confirm-transfer")}
                className="btn btn-primary"
              >
                {busy ? "Sending…" : "I have sent the money"}
              </button>
            </div>
          ) : null}

          {method === "whatsapp" ? (
            <div className="flex flex-col gap-5">
              <h2 className="text-[19px] font-semibold tracking-[-0.02em]">Finish on WhatsApp</h2>
              <p className="text-[13.5px] leading-relaxed text-muted">
                Send us the order in chat and we will confirm stock, delivery and payment with you
                directly. Your order is already saved.
              </p>
              <a
                href={whatsappLink(waMessage)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                Send order on WhatsApp
              </a>
              {error ? <ErrorNote message={error} /> : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void send("confirm-whatsapp")}
                className="btn btn-ghost"
              >
                {busy ? "Saving…" : "I have sent the message"}
              </button>
            </div>
          ) : null}

          {method === "pod" ? (
            <div className="flex flex-col gap-5">
              <h2 className="text-[19px] font-semibold tracking-[-0.02em]">Pay on delivery</h2>
              <p className="text-[13.5px] leading-relaxed text-muted">
                Available in Iwo, Osogbo and Ibadan. Pay cash or transfer to the rider when your
                order arrives. Please keep the exact amount if possible.
              </p>
              {error ? <ErrorNote message={error} /> : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void send("confirm-pod")}
                className="btn btn-primary"
              >
                {busy ? "Saving…" : "Place order · pay on delivery"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl border border-line p-6">
          <p className="eyebrow text-muted">Order</p>
          <p className="nums mt-2 text-[15px] font-semibold tracking-[-0.01em]">{order.reference}</p>

          <ul className="mt-5 flex flex-col gap-3 border-t border-line pt-5">
            {order.items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex justify-between gap-4 text-[13.5px]">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="text-[11.5px] text-muted">Qty {item.quantity}</span>
                </span>
                <span className="nums shrink-0 font-medium">
                  {money(item.unitPriceUsd * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-5 flex flex-col gap-2.5 border-t border-line pt-5 text-[13.5px]">
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
            <div className="mt-1 flex items-baseline justify-between border-t border-line pt-4">
              <dt className="font-medium">Total</dt>
              <dd className="nums text-[21px] font-semibold tracking-[-0.02em]">
                {money(order.totalUsd)}
              </dd>
            </div>
          </dl>

          <Link href={`/orders/${order.reference}`} className="btn btn-quiet btn-sm mt-5 w-full">
            View order status
          </Link>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-0">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className={`text-[14px] font-medium ${mono ? "nums tracking-[0.04em]" : ""}`}>{value}</span>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="rounded-xl bg-[#fbeaea] px-3.5 py-2.5 text-[12.5px] text-[#8c2f2f]">{message}</p>
  );
}
