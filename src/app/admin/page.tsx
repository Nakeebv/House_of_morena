import Link from "next/link";
import { dashboardStats, listBuyers, salesByChannel, SOURCE_LABELS } from "@/lib/catalog";
import {
  emailTransportConfigured,
  listMessages,
  sellerEmailConfigured,
} from "@/lib/email";
import { formatFromUsd, type CurrencyCode } from "@/lib/currency";

export const dynamic = "force-dynamic";

const NGN: CurrencyCode = "NGN";
const USD: CurrencyCode = "USD";

const STATUS_TONE: Record<string, string> = {
  pending: "bg-[#fdf3e4] text-[#8a5a13]",
  awaiting_confirmation: "bg-[#fdf3e4] text-[#8a5a13]",
  paid: "bg-[#e9f3ec] text-[#26603a]",
  fulfilled: "bg-[#e9f3ec] text-[#26603a]",
  cancelled: "bg-[#fbeaea] text-[#8c2f2f]",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting payment",
  awaiting_confirmation: "Confirming payment",
  paid: "Paid",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

export default async function AdminDashboard() {
  const [stats, channels, buyers, messages] = await Promise.all([
    dashboardStats(),
    salesByChannel(),
    listBuyers(),
    listMessages(8),
  ]);

  const naira = (usd: number) => formatFromUsd(usd, NGN);
  const dollars = (usd: number) => formatFromUsd(usd, USD);
  const repeatBuyers = buyers.filter((buyer) => buyer.ordersCount > 1).length;

  const cards = [
    {
      label: "Total sales",
      value: naira(stats.totals.revenueUsd),
      sub: `${dollars(stats.totals.revenueUsd)} collected`,
    },
    {
      label: "Orders",
      value: String(stats.totals.orderCount),
      sub: `${stats.totals.paidCount} paid`,
    },
    {
      label: "Awaiting you",
      value: dollars(stats.totals.pendingUsd),
      sub: "Unpaid or unconfirmed",
    },
    {
      label: "Buyers",
      value: String(buyers.length),
      sub: `${repeatBuyers} repeat · ${buyers.filter((b) => b.email).length} emailable`,
    },
  ];

  const emailReady = emailTransportConfigured();

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow text-muted">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "Africa/Lagos",
            })}
          </p>
          <h1 className="title mt-3">Overview</h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/admin/orders/new" className="btn btn-primary btn-sm">
            Record a sale
          </Link>
          <Link href="/admin/products/new" className="btn btn-ghost btn-sm">
            Add product
          </Link>
        </div>
      </header>

      {!emailReady ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-4">
          <p className="text-[12.5px] leading-relaxed text-muted">
            Order emails are being composed and queued, but not delivered yet. Add a{" "}
            <span className="nums">RESEND_API_KEY</span> to turn them on.
          </p>
          <Link href="/admin/settings" className="btn btn-ghost btn-sm shrink-0">
            Set up email
          </Link>
        </div>
      ) : !sellerEmailConfigured() ? (
        <div className="mt-6 rounded-2xl border border-line bg-white px-5 py-4">
          <p className="text-[12.5px] leading-relaxed text-muted">
            Buyer emails are sending. Set <span className="nums">SELLER_EMAIL</span> to also get an
            alert for every new order.
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-line bg-white p-5">
            <p className="eyebrow text-muted">{card.label}</p>
            <p className="nums mt-3 text-[24px] font-semibold tracking-[-0.025em]">{card.value}</p>
            <p className="mt-1.5 text-[12px] text-muted">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-line bg-white">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Recent orders</h2>
              <Link href="/admin/orders" className="link text-[12.5px] text-muted">
                All orders
              </Link>
            </div>

            {stats.recent.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <p className="text-[15px] font-medium">No orders yet</p>
                <p className="mt-2 text-[13px] text-muted">
                  Share the store link, or record a sale you already made.
                </p>
                <Link href="/admin/orders/new" className="btn btn-quiet btn-sm mt-6">
                  Record a sale
                </Link>
              </div>
            ) : (
              <ul>
                {stats.recent.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="nums text-[13.5px] font-medium">{order.reference}</p>
                      <p className="mt-0.5 truncate text-[12px] text-muted">
                        {order.customerName} · {order.countryName} ·{" "}
                        {SOURCE_LABELS[order.source as keyof typeof SOURCE_LABELS] ?? order.source}
                      </p>
                    </div>
                    <span
                      className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium sm:block ${
                        STATUS_TONE[order.status] ?? "bg-mist text-ink-soft"
                      }`}
                    >
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                    <p className="nums w-24 shrink-0 text-right text-[13.5px] font-medium">
                      {naira(Number(order.totalUsd))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-white">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Sales by channel</h2>
              <p className="mt-1 text-[12px] text-muted">
                Where your revenue actually comes from
              </p>
            </div>
            {channels.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13px] text-muted">No sales recorded yet.</p>
            ) : (
              <ul className="px-5 py-2">
                {channels.map((channel) => {
                  const peak = Math.max(...channels.map((c) => c.revenueUsd), 1);
                  return (
                    <li key={channel.source} className="border-b border-line py-3 last:border-0">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-[13px] font-medium">{channel.label}</span>
                        <span className="nums text-[13px] font-medium">
                          {naira(channel.revenueUsd)}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist">
                        <div
                          className="h-full rounded-full bg-ink"
                          style={{ width: `${Math.max(3, (channel.revenueUsd / peak) * 100)}%` }}
                        />
                      </div>
                      <p className="nums mt-1.5 text-[11px] text-muted">
                        {channel.ordersCount} {channel.ordersCount === 1 ? "order" : "orders"}
                        {channel.pendingUsd > 0
                          ? ` · ${dollars(channel.pendingUsd)} awaiting`
                          : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-line bg-white">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Best sellers</h2>
            </div>
            {stats.top.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13px] text-muted">Nothing sold yet.</p>
            ) : (
              <ul className="px-5 py-2">
                {stats.top.map((item, index) => (
                  <li
                    key={`${item.name}-${index}`}
                    className="flex items-center gap-3 border-b border-line py-3 last:border-0"
                  >
                    <span className="nums text-[11px] text-muted">0{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                      {item.name}
                    </span>
                    <span className="nums text-[12px] text-muted">{item.units} sold</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-white">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Email history</h2>
              <Link href="/admin/buyers" className="link text-[12.5px] text-muted">
                Buyers
              </Link>
            </div>
            {messages.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13px] text-muted">
                No emails sent yet. Buyers are emailed automatically when they order.
              </p>
            ) : (
              <ul className="px-5 py-2">
                {messages.map((message) => (
                  <li
                    key={message.id}
                    className="border-b border-line py-3 last:border-0"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">
                        {message.subject}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          message.status === "sent"
                            ? "bg-[#e9f3ec] text-[#26603a]"
                            : message.status === "failed"
                              ? "bg-[#fbeaea] text-[#8c2f2f]"
                              : "bg-[#fdf3e4] text-[#8a5a13]"
                        }`}
                      >
                        {message.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11.5px] text-muted">
                      {message.toEmail} ·{" "}
                      {message.createdAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        timeZone: "Africa/Lagos",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-white">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Quick actions</h2>
            </div>
            <div className="flex flex-col gap-1 p-3">
              {[
                { href: "/admin/orders/new", label: "Record a WhatsApp or walk-in sale" },
                { href: "/admin/buyers", label: "Email or call a buyer" },
                { href: "/admin/products/new", label: "Upload a new product" },
                { href: "/admin/products", label: "Edit prices and stock" },
                { href: "/track", label: "Look up an order reference" },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="rounded-xl px-3 py-2.5 text-[13px] text-ink-soft transition-colors hover:bg-mist"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
