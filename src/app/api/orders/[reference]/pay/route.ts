import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import { getOrderByReference, updateOrder } from "@/lib/catalog";
import { notifyPaymentReceived } from "@/lib/email";

export const dynamic = "force-dynamic";

type Payload = {
  action?:
    | "pay"
    | "confirm-transfer"
    | "confirm-whatsapp"
    | "confirm-pod"
    | "mark-paid"
    | "mark-fulfilled"
    | "cancel";
  card?: { number?: string; expiry?: string; cvc?: string; name?: string };
};

/**
 * Card payment is ON HOLD until a live processor (Paystack / Flutterwave) is
 * connected. It is removed from the UI and refused here so it cannot be
 * reached around the checkout. Bank transfer, WhatsApp and pay-on-delivery
 * remain available.
 */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    body = {};
  }

  const order = await getOrderByReference(reference);
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

  const action = body.action ?? "confirm-transfer";

  if (action === "pay") {
    return Response.json(
      {
        error:
          "Card payment is not available yet. Please pay by bank transfer, confirm on WhatsApp, or pay on delivery.",
      },
      { status: 403 },
    );
  }

  if (action === "confirm-transfer") {
    await updateOrder(order.id, { status: "awaiting_confirmation", paymentMethod: "transfer" });
    return Response.json({ status: "awaiting_confirmation", reference: order.reference });
  }

  if (action === "confirm-whatsapp") {
    await updateOrder(order.id, { status: "pending", paymentMethod: "whatsapp" });
    return Response.json({ status: "pending", reference: order.reference });
  }

  if (action === "confirm-pod") {
    await updateOrder(order.id, { status: "pending", paymentMethod: "pod" });
    return Response.json({ status: "pending", reference: order.reference });
  }

  if (action === "mark-paid") {
    await updateOrder(order.id, { status: "paid", paidAt: new Date() });
    await reduceStock(order.id);
    await notifyBestEffort(order.reference);
    return Response.json({ status: "paid", reference: order.reference });
  }

  if (action === "mark-fulfilled") {
    await updateOrder(order.id, { status: "fulfilled" });
    return Response.json({ status: "fulfilled", reference: order.reference });
  }

  if (action === "cancel") {
    await updateOrder(order.id, { status: "cancelled" });
    return Response.json({ status: "cancelled", reference: order.reference });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}

/** Notifications must never be able to fail a payment. */
async function notifyBestEffort(reference: string) {
  try {
    const fresh = await getOrderByReference(reference);
    if (!fresh) return;
    await notifyPaymentReceived({
      ...fresh,
      items: fresh.items.map((item) => ({
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

async function reduceStock(orderId: number) {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    if (item.productId == null) continue;
    await db
      .update(products)
      .set({
        stock: sql`greatest(0, ${products.stock} - ${item.quantity})`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, item.productId));
  }
}


