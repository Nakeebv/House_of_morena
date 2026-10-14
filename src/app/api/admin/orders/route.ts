import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { createOrder, getOrderByReference, type OrderSource } from "@/lib/catalog";
import { notifyOrderPlaced } from "@/lib/email";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";

export const dynamic = "force-dynamic";

/**
 * Records a sale that happened somewhere else — WhatsApp, Instagram, a phone
 * call or someone walking into the studio — so the dashboard reflects real
 * revenue, not just website checkouts.
 */

const SOURCES: OrderSource[] = ["whatsapp", "instagram", "phone", "walk_in", "other", "website"];
const METHODS = ["cash", "transfer", "pos", "pod", "whatsapp"];

type Payload = {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  country?: string;
  currency?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  note?: string;
  sellerNote?: string;
  source?: string;
  paymentMethod?: string;
  status?: string;
  items?: { productId?: number; quantity?: number }[];
};

export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not authorised" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Payload | null;
  if (!body) return Response.json({ error: "Invalid request body" }, { status: 400 });

  const name = (body.customerName ?? "").trim();
  const phone = (body.customerPhone ?? "").trim();
  const items = Array.isArray(body.items) ? body.items : [];

  if (name.length < 2) {
    return Response.json({ error: "Enter the buyer's name." }, { status: 400 });
  }
  if (phone.replace(/\D/g, "").length < 7) {
    return Response.json({ error: "Enter a reachable phone number for the buyer." }, { status: 400 });
  }
  if (items.length === 0) {
    return Response.json({ error: "Add at least one product to the sale." }, { status: 400 });
  }

  const normalised = items
    .map((item) => ({
      productId: Number(item.productId),
      quantity: Math.max(1, Math.min(Number(item.quantity) || 1, 99)),
    }))
    .filter((item) => Number.isFinite(item.productId) && item.productId > 0);

  if (normalised.length === 0) {
    return Response.json({ error: "Add at least one product to the sale." }, { status: 400 });
  }

  const source = SOURCES.includes(body.source as OrderSource)
    ? (body.source as OrderSource)
    : "whatsapp";
  const paymentMethod = METHODS.includes(body.paymentMethod ?? "")
    ? (body.paymentMethod as string)
    : "cash";
  const status =
    body.status === "pending" || body.status === "fulfilled" ? body.status : "paid";

  const country = (body.country ?? "NG").toUpperCase().slice(0, 2);
  const currencyCode = (body.currency ?? "NGN").toUpperCase();
  const currency = (
    CURRENCIES[currencyCode as CurrencyCode] ? currencyCode : "NGN"
  ) as string;

  try {
    const order = await createOrder({
      customerName: name,
      customerEmail: (body.customerEmail ?? "").trim() || null,
      customerPhone: phone,
      country,
      countryName:
        country === "NG" ? "Nigeria" : (body.country ?? "Nigeria"),
      currency,
      // A sale recorded by hand has already been handed over or is being packed.
      fulfilment: (body.addressLine ?? "").trim() ? "delivery" : "pickup",
      addressLine: (body.addressLine ?? "").trim() || null,
      city: (body.city ?? "").trim() || null,
      state: (body.state ?? "").trim() || null,
      note: (body.note ?? "").trim() || null,
      sellerNote: (body.sellerNote ?? "").trim() || null,
      paymentMethod,
      source,
      status,
      items: normalised,
    });

    // The buyer gets a receipt for a sale recorded on their behalf.
    const full = await getOrderByReference(order.reference);
    if (full?.customerEmail) {
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
        /* best effort */
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/buyers");
    return Response.json({ ok: true, reference: order.reference });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record the sale.";
    return Response.json({ error: message }, { status: 500 });
  }
}
