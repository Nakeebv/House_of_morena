import type { Metadata } from "next";
import Link from "next/link";
import { MEDIA } from "@/lib/media";
import { SITE, telLink, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Morena Collection is a small multi-line goods house based in Iwo, Osun State, Nigeria. Perfume first, then leather, footwear and clothing.",
};

const DELIVERY = [
  { region: "Iwo & Osun State", time: "Same day – 2 days", fee: "Flat rate" },
  { region: "Nationwide Nigeria", time: "2 – 4 working days", fee: "Flat rate" },
  { region: "West Africa", time: "5 – 9 working days", fee: "At cost" },
  { region: "Europe & North America", time: "5 – 9 working days", fee: "At cost" },
  { region: "Rest of world", time: "7 – 14 working days", fee: "At cost" },
];

export default function AboutPage() {
  return (
    <div className="shell pb-10 pt-10 md:pt-14">
      <p className="eyebrow text-muted">About</p>
      <h1 className="display mt-5 max-w-3xl">A small house of goods, from Iwo.</h1>

      <div className="mt-10 grid gap-10 md:mt-14 md:grid-cols-[1.1fr_1fr] md:gap-16">
        <div className="aspect-[4/5] overflow-hidden rounded-[26px] bg-mist">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MEDIA.heroTall}
            alt="Morena Collection perfume"
            className="h-full w-full object-cover"
            decoding="async"
            width={1000}
            height={1250}
          />
        </div>

        <div className="max-w-lg">
          <p className="text-[17px] leading-[1.6] text-ink-soft">
            Morena Collection started with perfume, and perfume is still most of what we do. We buy
            concentrate from perfumers we have dealt with for years, blend in batches of forty
            bottles, and rest each batch for six weeks before it goes out.
          </p>
          <p className="mt-5 text-[15.5px] leading-[1.7] text-muted">
            Along the way customers kept asking for the other things we used — a bag that survives a
            Lagos week, shoes that do not need breaking in, clothes that work in this heat. So we
            added them, carefully, one line at a time. Everything is bought in small quantities and
            checked by hand.
          </p>
          <p className="mt-5 text-[15.5px] leading-[1.7] text-muted">
            We are not a marketplace. There is no drop-shipping. If we would not carry it ourselves,
            we do not sell it.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/shop/category/perfumes" className="btn btn-primary">
              Shop perfume
            </Link>
            <a
              href={whatsappLink("Hello Morena Collection, tell me about your perfume.")}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
            >
              WhatsApp us
            </a>
          </div>
        </div>
      </div>

      <section id="delivery" className="mt-20 scroll-mt-24 border-t border-line pt-12 md:mt-28">
        <h2 className="section">Delivery &amp; returns</h2>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
          Everything is dispatched from Iwo, Osun State. Delivery is calculated from your location at
          checkout, in your own currency.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-line">
          {DELIVERY.map((row, index) => (
            <div
              key={row.region}
              className={`grid grid-cols-3 gap-4 px-5 py-4 text-[13.5px] ${
                index % 2 === 0 ? "bg-white" : "bg-mist"
              }`}
            >
              <span className="font-medium">{row.region}</span>
              <span className="text-muted">{row.time}</span>
              <span className="text-right text-muted">{row.fee}</span>
            </div>
          ))}
        </div>

        <p className="mt-6 max-w-2xl text-[13.5px] leading-relaxed text-muted">
          Unopened items can be returned within 7 days of delivery. Perfume must come back sealed —
          once a bottle is opened we cannot resell it. Message us first and we will arrange it.
        </p>
      </section>

      <section className="mt-20 grid gap-3 border-t border-line pt-12 md:grid-cols-3">
        <div className="rounded-2xl border border-line p-6">
          <p className="eyebrow text-muted">WhatsApp</p>
          <a
            href={whatsappLink("Hello Morena Collection.")}
            target="_blank"
            rel="noreferrer"
            className="mt-2.5 block text-[17px] font-semibold tracking-[-0.02em]"
          >
            {SITE.whatsappDisplay}
          </a>
        </div>
        <div className="rounded-2xl border border-line p-6">
          <p className="eyebrow text-muted">Call the studio</p>
          <a href={telLink()} className="mt-2.5 block text-[17px] font-semibold tracking-[-0.02em]">
            {SITE.phoneDisplay}
          </a>
        </div>
        <div className="rounded-2xl border border-line p-6">
          <p className="eyebrow text-muted">Address</p>
          <address className="mt-2.5 not-italic text-[15px] leading-relaxed">
            {SITE.addressLines.join(", ")}
          </address>
        </div>
      </section>
    </div>
  );
}
