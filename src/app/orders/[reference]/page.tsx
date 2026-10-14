import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderByReference } from "@/lib/catalog";
import { formatFromUsd, type CurrencyCode } from "@/lib/currency";
import { SITE, whatsappLink } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your order" };

const STATUS: Record<string, { label: string; note: string; tone: string }> = {
  pending: { label: "Awaiting payment", note: "We have your order. Complete payment to dispatch it.", tone: "bg-mist text-ink-soft" },
  awaiting_confirmation: {
    label: "Confirming payment",
    note: "Transfer received is being verified. This usually takes a few minutes.",
    tone: "bg-[#fdf3e4] text-[#8a5a13]",
  },
  paid: {
    label: "Paid",
    note: "Payment received. Your order is being packed in Iwo.",
    tone: "bg-[#e9f3ec] text-[#26603a]",
  },
  fulfilled: {
    label: "Fulfilled",
    note: "This order has been dispatched or collected.",
    tone: "bg-[#e9f3ec] text-[#26603a]",
  },
  cancelled: { label: "Cancelled", note: "This order was cancelled.", tone: "bg-[#fbeaea] text-[#8c2f2f]" },
};

const METHOD_LABEL: Record<string, string> = {
  card: "Card",
  transfer: "Bank transfer",
  whatsapp: "WhatsApp",
  pod: "Pay on delivery",
};

export default async function OrderPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const order = await getOrderByReference(reference);
  if (!order) notFound();

  const currency = order.currency as CurrencyCode;
  const money = (usd: number) => formatFromUsd(usd, currency);
  const status = STATUS[order.status] ?? STATUS.pending;
  const placed = new Date(order.createdAt);

  return (
    <div className="shell py-10 md:py-14">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="eyebrow text-muted">Order</p>
          <h1 className="title nums mt-3">{order.reference}</h1>
          <p className="mt-3 text-[13px] text-muted">
            Placed {placed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}{" "}
            · {placed.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ${status.tone}`}>
          {status.label}
        </span>
      </div>

      <p className="mt-6 max-w-lg text-[14.5px] leading-relaxed text-ink-soft">{status.note}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <div>
          <ul className="flex flex-col gap-5">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 border-b border-line pb-5 last:border-0">
                <div className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-mist">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  {item.slug ? (
                    <Link href={`/product/${item.slug}`} className="text-[14.5px] font-medium">
                      {item.name}
                    </Link>
                  ) : (
                    <p className="text-[14.5px] font-medium">{item.name}</p>
                  )}
                  {item.sizeLabel ? (
                    <p className="mt-0.5 text-[12px] text-muted">{item.sizeLabel}</p>
                  ) : null}
                  <p className="mt-1 text-[12.5px] text-muted">Quantity {item.quantity}</p>
                </div>
                <p className="nums text-[14px] font-medium">
                  {money(Number(item.unitPriceUsd) * item.quantity)}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-line p-5">
              <p className="eyebrow text-muted">
                {order.fulfilment === "pickup" ? "Collection" : "Delivery"}
              </p>
              <address className="mt-3 text-[13.5px] not-italic leading-relaxed">
                {order.fulfilment === "pickup" ? (
                  <>
                    {SITE.addressLines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </>
                ) : (
                  <>
                    <span className="block font-medium">{order.customerName}</span>
                    <span className="block">{order.addressLine}</span>
                    <span className="block">
                      {order.city}
                      {order.state ? `, ${order.state}` : ""}
                    </span>
                    <span className="block">{order.countryName}</span>
                  </>
                )}
              </address>
            </div>

            <div className="rounded-2xl border border-line p-5">
              <p className="eyebrow text-muted">Payment</p>
              <p className="mt-3 text-[13.5px]">
                {METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}
              </p>
              <p className="mt-1 text-[12.5px] text-muted">
                {order.paidAt
                  ? `Paid ${new Date(order.paidAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}`
                  : "Not yet paid"}
              </p>
              {order.status === "pending" || order.status === "awaiting_confirmation" ? (
                <Link href={`/pay/${order.reference}`} className="btn btn-primary btn-sm mt-4">
                  {order.status === "pending" ? "Complete payment" : "Payment options"}
                </Link>
              ) : null}
            </div>
          </div>

          {order.note ? (
            <div className="mt-6 rounded-2xl bg-mist p-5">
              <p className="eyebrow text-muted">Your note</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{order.note}</p>
            </div>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-line p-6">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Summary</h2>
            <dl className="mt-5 flex flex-col gap-2.5 text-[13.5px]">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="nums">{money(Number(order.subtotalUsd))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">
                  {order.fulfilment === "pickup" ? "Collection" : "Delivery"}
                </dt>
                <dd className="nums">
                  {Number(order.shippingUsd) === 0 ? "Free" : money(Number(order.shippingUsd))}
                </dd>
              </div>
              <div className="mt-1 flex items-baseline justify-between border-t border-line pt-4">
                <dt className="font-medium">Total</dt>
                <dd className="nums text-[21px] font-semibold tracking-[-0.02em]">
                  {money(Number(order.totalUsd))}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[11.5px] text-muted">Charged in {order.currency}</p>

            <a
              href={whatsappLink(
                `Hello Morena Collection, I am asking about order ${order.reference}.`,
              )}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost mt-5 w-full"
            >
              Ask about this order
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
