import Link from "next/link";
import { BuyersTable, type BuyerOrder, type BuyerRow } from "@/components/admin/buyers-table";
import { listBuyers, listOrders, listOrderItems, SOURCE_LABELS, type OrderSource } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  card: "Card",
  transfer: "Transfer",
  whatsapp: "WhatsApp",
  pod: "On delivery",
  cash: "Cash",
  pos: "POS",
};

export default async function AdminBuyersPage() {
  const buyers = await listBuyers();
  const orders = await listOrders(400);
  const items = await listOrderItems(orders.map((order) => order.id));

  const byPhone = new Map<string, BuyerOrder[]>();
  for (const order of orders) {
    const list = byPhone.get(order.customerPhone) ?? [];
    list.push({
      reference: order.reference,
      placedLabel: order.createdAt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Africa/Lagos",
      }),
      status: order.status,
      sourceLabel: SOURCE_LABELS[order.source as OrderSource] ?? order.source,
      methodLabel: METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod,
      totalUsd: Number(order.totalUsd),
      currency: order.currency,
      addressLine: order.addressLine,
      city: order.city,
      state: order.state,
      countryName: order.countryName,
      note: order.note,
      sellerNote: order.sellerNote,
      items: items
        .filter((item) => item.orderId === order.id)
        .map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPriceUsd: Number(item.unitPriceUsd),
          sizeLabel: item.sizeLabel,
        })),
    });
    byPhone.set(order.customerPhone, list);
  }

  const rows: BuyerRow[] = buyers.map((buyer) => ({
    ...buyer,
    orders: (byPhone.get(buyer.phone) ?? []).sort((a, b) => b.totalUsd - a.totalUsd),
  }));

  const withEmail = rows.filter((row) => row.email).length;
  const repeat = rows.filter((row) => row.ordersCount > 1).length;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow text-muted">People who buy from you</p>
          <h1 className="title mt-3">Buyers</h1>
          <p className="mt-3 text-[13.5px] text-muted">
            {rows.length} {rows.length === 1 ? "buyer" : "buyers"} · {withEmail} reachable by email ·{" "}
            {repeat} repeat
          </p>
        </div>
        <Link href="/admin/orders/new" className="btn btn-primary btn-sm">
          Record a sale
        </Link>
      </header>

      <div className="mt-8">
        <BuyersTable buyers={rows} />
      </div>
    </div>
  );
}
