import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { updateOrder } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "awaiting_confirmation", "paid", "fulfilled", "cancelled"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return Response.json({ error: "Not authorised" }, { status: 401 });

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isFinite(orderId)) {
    return Response.json({ error: "Bad order id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status ?? "";
  if (!STATUSES.includes(status)) {
    return Response.json({ error: "Unknown status" }, { status: 400 });
  }

  await updateOrder(orderId, {
    status,
    paidAt: status === "paid" ? new Date() : undefined,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  return Response.json({ ok: true, status });
}
