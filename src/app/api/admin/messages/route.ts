import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { getOrderByReference } from "@/lib/catalog";
import { notifyShipping, sendEmail } from "@/lib/email";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Lets the seller write to a buyer straight from the admin panel. The message
 * goes to the buyer's email address and is logged in the message history.
 */

type Payload = {
  to?: string;
  toName?: string;
  subject?: string;
  body?: string;
  kind?: "manual" | "shipping_note";
  orderId?: number | null;
  reference?: string | null;
  courier?: string;
  tracking?: string;
};

export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not authorised" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Payload | null;
  if (!body) return Response.json({ error: "Invalid request body" }, { status: 400 });

  const to = (body.to ?? "").trim();
  const text = (body.body ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return Response.json({ error: "That email address is not valid." }, { status: 400 });
  }
  if (text.length < 2) {
    return Response.json({ error: "Write something to send." }, { status: 400 });
  }

  // Dispatch notification: pulls the shipping details from the order itself.
  if (body.kind === "shipping_note" && body.reference) {
    const order = await getOrderByReference(body.reference);
    if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
    if (!order.customerEmail) {
      return Response.json({ error: "This order has no email address on it." }, { status: 400 });
    }

    const result = await notifyShipping(
      {
        ...order,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPriceUsd: item.unitPriceUsd,
          sizeLabel: item.sizeLabel,
        })),
      },
      (body.courier ?? "").trim(),
      (body.tracking ?? "").trim(),
    );

    revalidatePath("/admin/buyers");
    revalidatePath("/admin/orders");
    return Response.json(
      result.ok
        ? { ok: true, status: result.status, message: "Dispatch note emailed to the buyer." }
        : { ok: false, status: result.status, error: result.error ?? "Could not send." },
      { status: result.ok ? 200 : 400 },
    );
  }

  const result = await sendEmail({
    to,
    toName: body.toName ?? null,
    subject: (body.subject ?? "").trim() || `A message from ${SITE.brand}`,
    heading: `A message from ${SITE.brand}`,
    intro: text,
    outro: `Reply to this email, or reach us on WhatsApp at ${SITE.whatsappDisplay}.`,
    orderId: body.orderId ?? null,
    kind: "manual",
  });

  revalidatePath("/admin/buyers");

  if (result.ok) {
    return Response.json({ ok: true, status: "sent", message: `Email sent to ${to}.` });
  }
  return Response.json(
    {
      ok: false,
      status: result.status,
      error: result.error ?? "Could not send.",
      message:
        result.status === "queued"
          ? "Saved and queued. Add RESEND_API_KEY to start delivering email."
          : undefined,
    },
    { status: 400 },
  );
}
