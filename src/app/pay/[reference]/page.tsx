import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrderByReference } from "@/lib/catalog";
import { getBankDetails } from "@/lib/settings";
import { PaymentPanel, type PayOrder } from "./payment-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Payment" };

export default async function PayPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const [order, bankDetails] = await Promise.all([getOrderByReference(reference), getBankDetails()]);
  if (!order) notFound();
  if (order.status === "paid" || order.status === "fulfilled") {
    redirect(`/orders/${order.reference}`);
  }

  const payload: PayOrder = {
    reference: order.reference,
    customerName: order.customerName,
    currency: order.currency,
    country: order.country,
    fulfilment: order.fulfilment,
    method: order.paymentMethod,
    totalUsd: Number(order.totalUsd),
    subtotalUsd: Number(order.subtotalUsd),
    shippingUsd: Number(order.shippingUsd),
    bank: bankDetails.bank,
    accountName: bankDetails.accountName,
    accountNumber: bankDetails.accountNumber,
    items: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPriceUsd: Number(item.unitPriceUsd),
      sizeLabel: item.sizeLabel,
    })),
  };

  return (
    <div className="shell py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-muted">Step 2 of 2</p>
          <h1 className="title mt-3">Payment</h1>
        </div>
        <Link href={`/orders/${order.reference}`} className="text-[12.5px] text-muted hover:text-ink">
          View order →
        </Link>
      </div>

      <div className="mt-10">
        <PaymentPanel order={payload} />
      </div>
    </div>
  );
}
