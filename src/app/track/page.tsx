import type { Metadata } from "next";
import Link from "next/link";
import { getOrderByReference } from "@/lib/catalog";
import { formatFromUsd, type CurrencyCode } from "@/lib/currency";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Track an order" };

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const reference = ref?.trim().toUpperCase();
  const order = reference ? await getOrderByReference(reference) : null;

  return (
    <div className="shell py-12 md:py-16">
      <p className="eyebrow text-muted">Order lookup</p>
      <h1 className="title mt-4">Track an order</h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
        Enter the reference we gave you at checkout. It looks like MRN-XXXXXXX.
      </p>

      <form action="/track" method="get" className="mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
        <input
          className="field nums"
          name="ref"
          defaultValue={reference ?? ""}
          placeholder="MRN-XXXXXXX"
          aria-label="Order reference"
        />
        <button type="submit" className="btn btn-primary">
          Find order
        </button>
      </form>

      {reference && !order ? (
        <div className="mt-10 max-w-md rounded-2xl border border-line p-6">
          <p className="text-[15px] font-medium">No order with that reference</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            Check the code, or message us on WhatsApp and we will find it for you.
          </p>
        </div>
      ) : null}

      {order ? (
        <div className="mt-10 max-w-md rounded-2xl border border-line p-6">
          <div className="flex items-baseline justify-between gap-4">
            <p className="nums text-[15px] font-semibold">{order.reference}</p>
            <span className="text-[12.5px] text-muted">{order.status.replace("_", " ")}</span>
          </div>
          <p className="mt-3 text-[13.5px] text-muted">
            {order.items.length} {order.items.length === 1 ? "item" : "items"} ·{" "}
            {formatFromUsd(Number(order.totalUsd), order.currency as CurrencyCode)} {order.currency}
          </p>
          <Link href={`/orders/${order.reference}`} className="btn btn-quiet btn-sm mt-5">
            Open order
          </Link>
        </div>
      ) : null}
    </div>
  );
}
