import { createOrder, getOrderByReference } from "@/lib/catalog";
import { notifyOrderPlaced } from "@/lib/email";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";

export const dynamic = "force-dynamic";

type Payload = {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  country?: string;
  countryName?: string;
  currency?: string;
  fulfilment?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  note?: string;
  paymentMethod?: string;
  items?: { productId?: number; quantity?: number }[];
};

/** Card is on hold until a live processor is connected. */
const PAYMENT_METHODS = ["transfer", "whatsapp", "pod"];

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = (body.customerName ?? "").trim();
  const phone = (body.customerPhone ?? "").trim();
  const items = Array.isArray(body.items) ? body.items : [];
  const fulfilment = body.fulfilment === "pickup" ? "pickup" : "delivery";
  const paymentMethod = PAYMENT_METHODS.includes(body.paymentMethod ?? "")
    ? (body.paymentMethod as string)
    : "transfer";
  const country = (body.country ?? "NG").toUpperCase().slice(0, 2);
  const currencyCode = (body.currency ?? "NGN").toUpperCase();
  const currency = (CURRENCIES[currencyCode as CurrencyCode] ? currencyCode : "NGN") as string;

  if (name.length < 2) {
    return Response.json({ error: "Please enter your full name." }, { status: 400 });
  }
  if (phone.replace(/\D/g, "").length < 7) {
    return Response.json({ error: "Please enter a reachable phone number." }, { status: 400 });
  }
  if (items.length === 0) {
    return Response.json({ error: "Your bag is empty." }, { status: 400 });
  }

  const normalisedItems = items
    .map((item) => ({
      productId: Number(item.productId),
      quantity: Math.max(1, Math.min(Number(item.quantity) || 1, 20)),
    }))
    .filter((item) => Number.isFinite(item.productId) && item.productId > 0);

  if (normalisedItems.length === 0) {
    return Response.json({ error: "Your bag is empty." }, { status: 400 });
  }

  if (fulfilment === "delivery") {
    if (!(body.addressLine ?? "").trim() || !(body.city ?? "").trim()) {
      return Response.json({ error: "A delivery address is required." }, { status: 400 });
    }
  }

  try {
    const order = await createOrder({
      customerName: name,
      customerEmail: (body.customerEmail ?? "").trim() || null,
      customerPhone: phone,
      country,
      countryName: (body.countryName ?? "Nigeria").trim() || "Nigeria",
      currency,
      fulfilment,
      addressLine: (body.addressLine ?? "").trim() || null,
      city: (body.city ?? "").trim() || null,
      state: (body.state ?? "").trim() || null,
      note: (body.note ?? "").trim() || null,
      paymentMethod,
      source: "website",
      items: normalisedItems,
    });

    // Confirmations go out after the order is safely committed. A failure to
    // send must never fail the checkout.
    const full = await getOrderByReference(order.reference);
    if (full) {
      try {
        await notifyOrderPlaced({
          ...full,
          items: full.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitPriceUsd: item.unitPriceUsd,
            sizeLabel: item.sizeLabel,
          })),
        });
      } catch {
        /* notification is best-effort */
      }
    }

    return Response.json({
      reference: order.reference,
      totalUsd: Number(order.totalUsd),
      currency: order.currency,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not place the order.";
    return Response.json({ error: message }, { status: 500 });
  }
}
