import { BankDetailsForm } from "@/components/admin/bank-details-form";
import { listMessages } from "@/lib/email";
import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

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
          The settings you control as the owner — payment details, store identity and the messages
          the store has sent.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
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
        </div>
      </div>
    </div>
  );
}
