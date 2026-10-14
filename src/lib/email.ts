import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { messages, type MessageRow } from "@/db/schema";
import { formatFromUsd, type CurrencyCode } from "./currency";
import { SITE } from "./site";

/**
 * Outbound email.
 *
 * Uses Resend when RESEND_API_KEY is present. Without a key, the message is
 * still composed and recorded in the `messages` table with status "queued", so
 * the seller can see exactly what would have gone out and nothing is lost.
 * Add the key and every queued message from then on sends for real.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function fromAddress() {
  return process.env.EMAIL_FROM ?? "Morena Collection <onboarding@resend.dev>";
}

function sellerAlertAddress() {
  return process.env.SELLER_EMAIL ?? process.env.ADMIN_EMAIL ?? null;
}

export type SendInput = {
  to: string;
  toName?: string | null;
  subject: string;
  heading: string;
  intro: string;
  blocks?: { label: string; value: string }[];
  lines?: { label: string; value: string; strong?: boolean }[];
  outro?: string;
  replyTo?: string | null;
  orderId?: number | null;
  kind: string;
};

/** Minimal, brand-matched email. Tables and inline styles only — no CSS file,
 *  so it renders correctly in Gmail, Outlook and Apple Mail. */
function render(input: SendInput) {
  const esc = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const blocks = (input.blocks ?? [])
    .map(
      (block) =>
        `<tr><td style="padding:10px 14px;background:#f5f4f2;border-radius:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#3c3b39"><span style="display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#76736e;font-weight:600">${esc(
          block.label,
        )}</span>${esc(block.value)}</td></tr><tr><td style="height:8px;line-height:8px;font-size:0">&nbsp;</td></tr>`,
    )
    .join("");

  const rows = (input.lines ?? [])
    .map(
      (line) =>
        `<tr><td style="padding:7px 0;border-bottom:1px solid #eceae6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#76736e">${esc(
          line.label,
        )}</td><td style="padding:7px 0;border-bottom:1px solid #eceae6;text-align:right;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${
          line.strong ? "#111112" : "#3c3b39"
        };${line.strong ? "font-weight:600;font-size:16px;" : ""}">${esc(line.value)}</td></tr>`,
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f4f2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f2;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:18px;padding:34px 30px">
<tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;letter-spacing:.24em;color:#111112;padding-bottom:4px">MORENA</td></tr>
<tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:.34em;color:#76736e;padding-bottom:26px">COLLECTION</td></tr>
<tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.2;font-weight:600;letter-spacing:-.02em;color:#111112;padding-bottom:10px">${esc(
    input.heading,
  )}</td></tr>
<tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#3c3b39;padding-bottom:22px">${esc(
    input.intro,
  )}</td></tr>
${blocks ? `<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${blocks}</table></td></tr>` : ""}
${rows ? `<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>` : ""}
${
  input.outro
    ? `<tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.65;color:#76736e;padding-top:22px">${esc(
        input.outro,
      )}</td></tr>`
    : ""
}
<tr><td style="padding-top:26px;border-top:1px solid #eceae6;margin-top:26px">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:#76736e">
${esc(SITE.address)}<br>
WhatsApp <a href="https://wa.me/${SITE.whatsapp}" style="color:#111112;text-decoration:none">${SITE.whatsappDisplay}</a> ·
Call <a href="tel:+${SITE.phone}" style="color:#111112;text-decoration:none">${SITE.phoneDisplay}</a><br><br>
Website by ${SITE.developer}
</div></td></tr>
</table></td></tr></table></body></html>`;
}

function plainText(input: SendInput) {
  const parts = [
    input.heading,
    "",
    input.intro,
    "",
    ...(input.blocks ?? []).map((block) => `${block.label}: ${block.value}`),
    ...(input.lines ?? []).map((line) => `${line.label}: ${line.value}`),
  ];
  if (input.outro) parts.push("", input.outro);
  parts.push("", `${SITE.brand} · ${SITE.address}`, `WhatsApp ${SITE.whatsappDisplay}`, `Call ${SITE.phoneDisplay}`);
  return parts.filter((line) => line !== undefined).join("\n");
}

export async function sendEmail(input: SendInput): Promise<{ ok: boolean; status: string; error?: string }> {
  const html = render(input);
  const text = plainText(input);
  const apiKey = process.env.RESEND_API_KEY;

  // No transport configured — record it so nothing is silently dropped.
  if (!apiKey) {
    await getDb().insert(messages).values({
      orderId: input.orderId ?? null,
      toEmail: input.to,
      toName: input.toName ?? null,
      replyTo: input.replyTo ?? null,
      subject: input.subject,
      body: text,
      kind: input.kind,
      status: "queued",
      error: "RESEND_API_KEY not set",
    });
    return { ok: false, status: "queued", error: "Email transport is not configured yet." };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [input.to],
        subject: input.subject,
        html,
        text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };

    const ok = response.ok;
    await getDb().insert(messages).values({
      orderId: input.orderId ?? null,
      toEmail: input.to,
      toName: input.toName ?? null,
      replyTo: input.replyTo ?? null,
      subject: input.subject,
      body: text,
      kind: input.kind,
      status: ok ? "sent" : "failed",
      providerId: payload.id ?? null,
      error: ok ? null : payload.message ?? `Provider returned ${response.status}`,
    });

    return ok
      ? { ok: true, status: "sent" }
      : { ok: false, status: "failed", error: payload.message ?? "The provider rejected the message." };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Network error";
    await getDb().insert(messages).values({
      orderId: input.orderId ?? null,
      toEmail: input.to,
      toName: input.toName ?? null,
      subject: input.subject,
      body: text,
      kind: input.kind,
      status: "failed",
      error: reason,
    });
    return { ok: false, status: "failed", error: reason };
  }
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export type NotifyOrder = {
  id: number;
  reference: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  countryName: string;
  currency: string;
  city: string | null;
  state: string | null;
  addressLine: string | null;
  subtotalUsd: string | number;
  shippingUsd: string | number;
  totalUsd: string | number;
  items: { name: string; quantity: number; unitPriceUsd: string | number; sizeLabel: string | null }[];
};

function moneyOf(order: NotifyOrder) {
  const currency = order.currency as CurrencyCode;
  return (usd: number) => formatFromUsd(usd, currency);
}

export async function notifyOrderPlaced(order: NotifyOrder) {
  const money = moneyOf(order);
  const results: { to: string; ok: boolean; status: string; error?: string }[] = [];

  if (order.customerEmail) {
    const result = await sendEmail({
      to: order.customerEmail,
      toName: order.customerName,
      subject: `Order ${order.reference} received — ${SITE.brand}`,
      heading: `Thank you, ${order.customerName.split(" ")[0]}.`,
      intro: `We have your order and it is being prepared in Iwo. Keep this reference for any question about it.`,
      blocks: [{ label: "Order reference", value: order.reference }],
      lines: [
        ...order.items.map((item) => ({
          label: `${item.name}${item.sizeLabel ? ` · ${item.sizeLabel}` : ""} × ${item.quantity}`,
          value: money(Number(item.unitPriceUsd) * item.quantity),
        })),
        { label: "Delivery", value: Number(order.shippingUsd) === 0 ? "Free" : money(Number(order.shippingUsd)) },
        { label: "Total", value: `${money(Number(order.totalUsd))} ${order.currency}`, strong: true },
      ],
      outro:
        "If anything on this order is wrong, reply to this email or message us on WhatsApp and we will sort it before it ships.",
      orderId: order.id,
      kind: "order_confirmation",
    });
    results.push({ to: order.customerEmail, ...result });
  }

  // Alert the seller.
  const seller = sellerAlertAddress();
  if (seller) {
    const result = await sendEmail({
      to: seller,
      toName: "Morena",
      subject: `New order ${order.reference} — ${money(Number(order.totalUsd))} ${order.currency}`,
      heading: "New order received",
      intro: `${order.customerName} just placed an order from the website.`,
      blocks: [
        { label: "Ship to", value: `${order.addressLine ?? "—"}, ${order.city ?? ""} ${order.state ?? ""}, ${order.countryName}` },
        { label: "Contact", value: `${order.customerPhone}${order.customerEmail ? ` · ${order.customerEmail}` : ""}` },
      ],
      lines: [
        ...order.items.map((item) => ({
          label: `${item.name}${item.sizeLabel ? ` · ${item.sizeLabel}` : ""}`,
          value: `${item.quantity} × ${money(Number(item.unitPriceUsd))}`,
        })),
        { label: "Total", value: `${money(Number(order.totalUsd))} ${order.currency}`, strong: true },
      ],
      outro: `Prepare and dispatch from ${SITE.address}.`,
      orderId: order.id,
      kind: "seller_alert",
    });
    results.push({ to: seller, ...result });
  }

  return results;
}

export async function notifyPaymentReceived(order: NotifyOrder) {
  if (!order.customerEmail) return { ok: false, status: "queued", error: "No email on the order." };
  const money = moneyOf(order);
  return sendEmail({
    to: order.customerEmail,
    toName: order.customerName,
    subject: `Payment received — order ${order.reference}`,
    heading: "Payment received",
    intro: `We have your payment for order ${order.reference}. Your order is being packed now.`,
    blocks: [
      { label: "Order reference", value: order.reference },
      { label: "Delivering to", value: `${order.addressLine ?? "Studio collection"}, ${order.city ?? ""} ${order.state ?? ""}, ${order.countryName}` },
    ],
    lines: [
      { label: "Amount paid", value: `${money(Number(order.totalUsd))} ${order.currency}`, strong: true },
    ],
    outro: "You will hear from us when it is on the way.",
    orderId: order.id,
    kind: "payment_receipt",
  });
}

export async function notifyShipping(order: NotifyOrder, courier: string, tracking: string) {
  if (!order.customerEmail) return { ok: false, status: "queued", error: "No email on the order." };
  return sendEmail({
    to: order.customerEmail,
    toName: order.customerName,
    subject: `Your order ${order.reference} is on the way`,
    heading: "Your order has been dispatched",
    intro: `Order ${order.reference} left our studio in Iwo and is on its way to you.`,
    blocks: [
      { label: "Courier", value: courier || "—" },
      { label: "Tracking number", value: tracking || "—" },
    ],
    outro: "If it does not arrive within the expected window, message us on WhatsApp.",
    orderId: order.id,
    kind: "shipping_note",
  });
}

export async function listMessages(limit = 60): Promise<MessageRow[]> {
  return getDb().select().from(messages).orderBy(desc(messages.createdAt)).limit(limit);
}

export function emailTransportConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function sellerEmailConfigured() {
  return Boolean(sellerAlertAddress());
}
