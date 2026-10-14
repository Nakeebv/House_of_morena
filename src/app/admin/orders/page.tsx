import Link from "next/link";
import { OrdersTable, type AdminOrder } from "@/components/admin/orders-table";
import { listOrderItems, listOrders, SOURCE_LABELS, type OrderSource } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await listOrders(300);
  const items = await listOrderItems(orders.map((order) => order.id));

  const rows: AdminOrder[] = orders.map((order) => ({
    id: order.id,
    reference: order.reference,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    addressLine: order.addressLine,
    city: order.city,
    state: order.state,
    countryName: order.countryName,
    country: order.country,
    currency: order.currency,
    fulfilment: order.fulfilment,
    paymentMethod: order.paymentMethod,
    status: order.status,
    sourceLabel: SOURCE_LABELS[order.source as OrderSource] ?? order.source,
    sellerNote: order.sellerNote,
    note: order.note,
    totalUsd: Number(order.totalUsd),
    subtotalUsd: Number(order.subtotalUsd),
    shippingUsd: Number(order.shippingUsd),
    placedLabel: order.createdAt.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Africa/Lagos",
    }),
    items: items
      .filter((item) => item.orderId === order.id)
      .map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPriceUsd: Number(item.unitPriceUsd),
        sizeLabel: item.sizeLabel,
      })),
  }));

  const paid = rows.filter((row) => row.status === "paid" || row.status === "fulfilled");
  const outstanding = rows.filter(
    (row) => row.status === "pending" || row.status === "awaiting_confirmation",
  );

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow text-muted">History</p>
          <h1 className="title mt-3">Orders</h1>
          <p className="mt-3 text-[13.5px] text-muted">
            {rows.length} total · {paid.length} paid · {outstanding.length} awaiting
          </p>
        </div>
        <Link href="/admin/orders/new" className="btn btn-primary btn-sm">
          Record a sale
        </Link>
      </header>

      <div className="mt-8">
        <OrdersTable orders={rows} />
      </div>
    </div>
  );
}
