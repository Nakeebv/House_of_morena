import type { ReactNode } from "react";
import { BankDetailsForm } from "@/components/admin/bank-details-form";
import { emailTransportConfigured, listMessages, sellerEmailConfigured } from "@/lib/email";
import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

function Status({
  ok,
  label,
  done,
  todo,
}: {
  ok: boolean;
  label: string;
  done: string;
  todo: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5 border-b border-line py-4 last:border-0">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
          ok ? "bg-[#e9f3ec] text-[#26603a]" : "bg-mist text-muted"
        }`}
      >
        {ok ? "✓" : "–"}
      </span>
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium">{label}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{ok ? done : todo}</p>
      </div>
    </div>
  );
}

function Env({ name }: { name: string }) {
  return (
    <code className="nums rounded-md bg-mist px-1.5 py-0.5 text-[12px] text-ink-soft">{name}</code>
  );
}

export default async function AdminSettingsPage() {
  const [messages, settings] = await Promise.all([listMessages(200), getSettings()]);
  const sent = messages.filter((m) => m.status === "sent").length;
  const queued = messages.filter((m) => m.status === "queued").length;
  const failed = messages.filter((m) => m.status === "failed").length;

  return (
    <div className="pb-16">
      <header>
        <p className="eyebrow text-muted">Store</p>
        <h1 className="title mt-3">Setup</h1>
        <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-muted">
          Everything is already working. These are the only things left to switch on, and each one is
          a single setting.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-line bg-white p-5 md:p-6">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Email</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Buyers are emailed automatically when they order and when payment is confirmed. You can
              also write to any buyer from the Buyers page.
            </p>

            <div className="mt-5">
              <Status
                ok={emailTransportConfigured()}
                label="Sending enabled"
                done="Messages are being delivered to real inboxes."
                todo={
                  <>
                    Add <Env name="RESEND_API_KEY" /> to your environment. Until then every message is
                    composed and saved, and shows as <em>queued</em> below.
                  </>
                }
              />
              <Status
                ok={sellerEmailConfigured()}
                label="You get new-order alerts"
                done="Every new order is emailed to you as well."
                todo={
                  <>
                    Add <Env name="SELLER_EMAIL" /> with your own address so each order reaches you
                    directly.
                  </>
                }
              />
              <Status
                ok={Boolean(process.env.EMAIL_FROM)}
                label="Sending address"
                done={`Sending as ${process.env.EMAIL_FROM}`}
                todo={
                  <>
                    Add <Env name="EMAIL_FROM" /> as{" "}
                    <span className="text-ink-soft">Morena Collection &lt;orders@yourdomain.com&gt;</span>{" "}
                    and verify the domain in your email provider.
                  </>
                }
              />
            </div>

            <div className="mt-6 rounded-2xl bg-mist p-5">
              <p className="eyebrow text-muted">How to turn it on</p>
              <ol className="mt-3 flex flex-col gap-2 text-[12.5px] leading-relaxed text-ink-soft">
                <li>
                  <span className="font-medium">1.</span> Create a free account at{" "}
                  <span className="text-ink">resend.com</span>.
                </li>
                <li>
                  <span className="font-medium">2.</span> Add and verify the domain you send from
                  (or use their test address to try it).
                </li>
                <li>
                  <span className="font-medium">3.</span> Copy the API key into your environment as{" "}
                  <Env name="RESEND_API_KEY" />.
                </li>
                <li>
                  <span className="font-medium">4.</span> Redeploy. Emails start sending immediately —
                  nothing else to change.
                </li>
              </ol>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 md:p-6">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Message history</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Sent", value: sent },
                { label: "Queued", value: queued },
                { label: "Failed", value: failed },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-mist px-4 py-3">
                  <p className="nums text-[19px] font-semibold tracking-[-0.02em]">{item.value}</p>
                  <p className="text-[11.5px] text-muted">{item.label}</p>
                </div>
              ))}
            </div>

            {messages.length === 0 ? (
              <p className="mt-5 text-[13px] text-muted">
                No messages yet. The first order will generate one automatically.
              </p>
            ) : (
              <ul className="mt-5 flex flex-col gap-3">
                {messages.slice(0, 12).map((message) => (
                  <li key={message.id} className="border-b border-line pb-3 last:border-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-[12.5px] font-medium">
                        {message.subject}
                      </p>
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
                    <p className="mt-0.5 truncate text-[11.5px] text-muted">
                      To {message.toEmail} ·{" "}
                      {message.createdAt.toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Africa/Lagos",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-line bg-white p-5 md:p-6">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Store details</h2>
            <dl className="mt-4 flex flex-col gap-3 text-[13px]">
              {[
                { label: "Brand", value: SITE.brand },
                { label: "Studio", value: SITE.address },
                { label: "WhatsApp", value: SITE.whatsappDisplay },
                { label: "Phone", value: SITE.phoneDisplay },
                { label: "Hours", value: SITE.hours },
              ].map((row) => (
                <div key={row.label} className="flex justify-between gap-4 border-b border-line pb-3 last:border-0">
                  <dt className="shrink-0 text-muted">{row.label}</dt>
                  <dd className="text-right">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 md:p-6">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Bank transfer details</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Shown to buyers on the transfer step of checkout. Change them any time — the next
              person who pays uses the new details.
            </p>
            <div className="mt-5">
              <BankDetailsForm initialValues={settings} />
            </div>
            <p className="mt-4 rounded-xl bg-mist p-4 text-[12px] leading-relaxed text-ink-soft">
              Currently set to:{" "}
              <span className="font-medium">
                {settings.bank_name || SITE.bankDetails.bank} ·{" "}
                {settings.account_name || SITE.bankDetails.accountName} ·{" "}
                <span className="nums">{settings.account_number || SITE.bankDetails.accountNumber}</span>
              </span>
              {!settings.account_number ? " (default placeholder — replace it)" : ""}
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 md:p-6">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Payment</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Bank transfer, WhatsApp and pay-on-delivery are live. Card payment is switched off
              until a live processor is connected.
            </p>
            <div className="mt-4 rounded-xl bg-mist p-4">
              <p className="text-[12.5px] leading-relaxed text-ink-soft">
                When you are ready for cards, Paystack or Flutterwave is the right choice — both
                handle naira, dollars and mobile money. It is a small change to the checkout.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 md:p-6">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Admin sign-in</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Sessions last 12 hours and are signed. Sign-in is rate limited.
            </p>
            <div className="mt-4 flex flex-col gap-3 text-[12.5px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Password</span>
                <Env name="ADMIN_PASSWORD" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Session secret</span>
                <Env name="ADMIN_SESSION_SECRET" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
