import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { AddToBagButton } from "@/components/product-view";
import { Tilt } from "@/components/tilt";
import { getCategories, getProducts, type Product } from "@/lib/catalog";
import { MEDIA } from "@/lib/media";
import { getRegion } from "@/lib/region";
import { SITE, telLink, whatsappLink } from "@/lib/site";
import {
  FREE_SHIPPING_USD,
  ZONE_LABELS,
  estimatedDelivery,
  formatFromUsd,
  shippingZone,
} from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const region = await getRegion();
  const zone = shippingZone(region.country);

  const featured = products.filter((p) => p.featured).slice(0, 8);
  const grid = featured.length >= 4 ? featured : products.slice(0, 8);
  const spotlight = products.find((p) => p.slug === "oud-iwo") ?? products[0];
  const tiles = categories.map((category) => ({
    ...category,
    product: products.find((p) => p.categorySlug === category.slug) as Product | undefined,
  }));

  return (
    <>
      {/* Hero ---------------------------------------------------------- */}
      <section className="shell pb-4 pt-10 md:pb-6 md:pt-16">
        <p className="eyebrow text-muted">Iwo · Osun State · Nigeria</p>
        <h1 className="display mt-5 max-w-4xl">Perfume, made properly.</h1>
        <p className="mt-6 max-w-lg text-[17px] leading-[1.55] text-ink-soft">
          Morena Collection is a small house of goods. We blend perfume in batches of forty, rest it
          for six weeks, and bottle it by hand. Alongside it: leather bags, footwear and clothing we
          use ourselves.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/shop/category/perfumes" className="btn btn-primary">
            Shop perfume
          </Link>
          <Link href="/shop" className="btn btn-ghost">
            Browse everything
          </Link>
        </div>
      </section>

      <section className="shell mt-10 md:mt-14">
        <div className="overflow-hidden rounded-[26px] bg-mist md:rounded-[34px]">
          <Tilt className="aspect-[4/5] sm:aspect-[16/11]" strength={3}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={MEDIA.hero}
              alt="Morena Collection perfume bottle"
              className="h-full w-full object-cover"
              width={1800}
              height={1100}
            />
          </Tilt>
        </div>
      </section>

      {/* Categories ---------------------------------------------------- */}
      <section className="shell mt-16 md:mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="section">Four lines, one standard</h2>
          <Link href="/shop" className="link text-[13.5px] text-ink-soft">
            View all
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {tiles.map((tile) => (
            <Link
              key={tile.slug}
              href={`/shop/category/${tile.slug}`}
              className="group relative overflow-hidden rounded-[20px] bg-mist md:rounded-[24px]"
            >
              <div className="aspect-[4/5]">
                {tile.product?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tile.product.image.url}
                    alt={tile.name}
                    className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                    loading="lazy"
                    width={900}
                    height={1125}
                  />
                ) : null}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4 pt-10 md:p-5">
                <p className="text-[15px] font-semibold tracking-[-0.01em] text-white md:text-[17px]">
                  {tile.name}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[11.5px] text-white/75">
                  {tile.product ? `${products.filter((p) => p.categorySlug === tile.slug).length} pieces` : "Coming soon"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Collection grid ---------------------------------------------- */}
      <section className="shell mt-16 md:mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="section">The collection</h2>
          <p className="text-[13px] text-muted">
            Priced in {region.currency} for {region.countryName}
          </p>
        </div>

        <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
          {grid.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 4} />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/shop" className="btn btn-quiet">
            See the full catalogue
          </Link>
        </div>
      </section>

      {/* Spotlight ---------------------------------------------------- */}
      {spotlight ? (
        <section className="mt-20 bg-ink text-white md:mt-28">
          <div className="shell grid items-center gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-24">
            <div className="overflow-hidden rounded-[24px] bg-white/5">
              <Tilt className="aspect-[4/5]" strength={4}>
                {spotlight.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={spotlight.image.url}
                    alt={spotlight.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    width={1000}
                    height={1250}
                  />
                ) : null}
              </Tilt>
            </div>

            <div>
              <p className="eyebrow text-white/50">Signature</p>
              <h2 className="title mt-4">{spotlight.name}</h2>
              <p className="mt-5 max-w-md text-[16px] leading-[1.6] text-white/70">
                {spotlight.description ?? spotlight.shortDescription}
              </p>
              <p className="nums mt-7 text-[22px] font-semibold">
                {formatFromUsd(spotlight.priceUsd, region.currency)}{" "}
                <span className="text-[12px] font-normal text-white/50">{region.currency}</span>
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={`/product/${spotlight.slug}`} className="btn bg-white text-ink hover:bg-white/85">
                  View details
                </Link>
                <AddToBagButton
                  product={spotlight}
                  label="Add to bag"
                  className="btn border border-white/25 text-white hover:border-white/60"
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Craft -------------------------------------------------------- */}
      <section className="shell mt-20 md:mt-28">
        <div className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:gap-16">
          <div>
            <p className="eyebrow text-muted">The workshop</p>
            <h2 className="section mt-4 max-w-sm">Slow work, in a town that notices</h2>
            <p className="mt-5 max-w-md text-[15.5px] leading-[1.65] text-ink-soft">
              Every bottle is filled, capped and boxed on our bench in Iwo. Nothing sits in a
              warehouse for months, and nothing is rushed out before it is ready.
            </p>
            <a
              href={whatsappLink("Hello Morena Collection, I would like to visit the studio.")}
              target="_blank"
              rel="noreferrer"
              className="link mt-7 inline-block text-[13.5px] font-medium"
            >
              Talk to us on WhatsApp
            </a>
          </div>

          <div className="aspect-[4/3] overflow-hidden rounded-[24px] bg-mist">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={MEDIA.atelier}
              alt="Morena Collection gift sets on the bench"
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              width={1200}
              height={900}
            />
          </div>
        </div>

        <div className="mt-14 grid gap-8 border-t border-line pt-10 sm:grid-cols-3">
          {[
            { k: "01", t: "Batches of forty", d: "Small enough to control, large enough to keep the price honest." },
            { k: "02", t: "Rested six weeks", d: "Maceration before bottling. It is why the scent holds past lunch." },
            { k: "03", t: "Checked twice", d: "Every bottle is weighed and inspected before it is boxed." },
          ].map((item) => (
            <div key={item.k}>
              <p className="nums text-[12px] tracking-[0.14em] text-accent">{item.k}</p>
              <h3 className="mt-3 text-[16px] font-semibold tracking-[-0.015em]">{item.t}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing band ------------------------------------------------- */}
      <section className="mt-20 bg-mist py-16 md:mt-28 md:py-20">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="section">Priced where you are</h2>
            <p className="text-[13px] text-muted">Detected automatically · change it any time</p>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Your market", value: region.countryName },
              { label: "Currency", value: `${region.currency} · ${formatFromUsd(1, region.currency)} = $1` },
              { label: "Delivery", value: ZONE_LABELS[zone] },
              { label: "Arrives", value: estimatedDelivery(zone) },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-line bg-white p-5">
                <p className="eyebrow text-muted">{item.label}</p>
                <p className="mt-2.5 text-[15px] font-medium tracking-[-0.01em]">{item.value}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            Orders above {formatFromUsd(FREE_SHIPPING_USD, region.currency)} ship free. Collection in
            person from our studio in Iwo is always free.
          </p>
        </div>
      </section>

      {/* Contact ------------------------------------------------------ */}
      <section className="shell mt-20 md:mt-28">
        <h2 className="section max-w-xl">Questions about a scent, a size, an order?</h2>
        <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-ink-soft">
          We answer ourselves — no bots, no queue. Message or call between {SITE.hours}.
        </p>

        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href={whatsappLink("Hello Morena Collection, I need help with an order.")}
            target="_blank"
            rel="noreferrer"
            className="group rounded-2xl border border-line p-6 transition-colors hover:border-ink"
          >
            <p className="eyebrow text-muted">WhatsApp</p>
            <p className="mt-2.5 text-[19px] font-semibold tracking-[-0.02em]">{SITE.whatsappDisplay}</p>
            <p className="mt-2 text-[13px] text-muted">Usually replies within the hour</p>
          </a>

          <a
            href={telLink()}
            className="group rounded-2xl border border-line p-6 transition-colors hover:border-ink"
          >
            <p className="eyebrow text-muted">Call</p>
            <p className="mt-2.5 text-[19px] font-semibold tracking-[-0.02em]">{SITE.phoneDisplay}</p>
            <p className="mt-2 text-[13px] text-muted">Tap to dial the studio</p>
          </a>

          <div className="rounded-2xl border border-line p-6">
            <p className="eyebrow text-muted">Studio</p>
            <address className="mt-2.5 not-italic text-[15px] leading-relaxed">
              {SITE.addressLines.join(", ")}
            </address>
            <p className="mt-2 text-[13px] text-muted">{SITE.hours}</p>
          </div>
        </div>
      </section>
    </>
  );
}
