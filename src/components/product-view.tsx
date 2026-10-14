"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { useStore } from "./store";
import { Tilt } from "./tilt";
import { telLink, whatsappLink } from "@/lib/site";

export function AddToBagButton({
  product,
  label = "Add to bag",
  className = "btn btn-primary w-full",
}: {
  product: Product;
  label?: string;
  className?: string;
}) {
  const { add, openDrawer } = useStore();
  const soldOut = product.stock <= 0;

  return (
    <button
      type="button"
      disabled={soldOut}
      className={className}
      onClick={() => {
        add({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          sizeLabel: product.sizeLabel,
          unitPriceUsd: product.priceUsd,
          imageUrl: product.image?.url ?? null,
          stock: product.stock,
        });
        openDrawer();
      }}
    >
      {soldOut ? "Sold out" : label}
    </button>
  );
}

export function ProductGallery({ product }: { product: Product }) {
  const images = product.gallery.length > 0 ? product.gallery : [];
  const [active, setActive] = useState(0);
  const current = images[active] ?? null;

  return (
    <div>
      <div className="overflow-hidden rounded-[26px] bg-mist">
        <Tilt className="aspect-square" strength={5}>
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={current.url}
              src={current.url}
              alt={current.alt || product.name}
              className="h-full w-full object-cover fade"
              width={1000}
              height={1000}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] tracking-[0.2em] text-muted">
              MORENA
            </div>
          )}
        </Tilt>
      </div>

      {images.length > 1 ? (
        <div className="mt-3 flex gap-3">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setActive(index)}
              className={`h-16 w-16 overflow-hidden rounded-xl border transition-colors ${
                index === active ? "border-ink" : "border-line hover:border-muted"
              }`}
              aria-label={`View image ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ProductPurchase({ product }: { product: Product }) {
  const { money, currency, add, openDrawer, country } = useStore();
  const [quantity, setQuantity] = useState(1);
  const soldOut = product.stock <= 0;
  const onSale = product.compareUsd != null && product.compareUsd > product.priceUsd;

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="nums text-[26px] font-semibold tracking-[-0.02em]">
          {money(product.priceUsd)}
        </span>
        {onSale ? (
          <span className="nums text-[15px] text-muted line-through">{money(product.compareUsd!)}</span>
        ) : null}
        <span className="text-[11.5px] text-muted">{currency}</span>
      </div>

      <p className="mt-5 text-[15px] leading-relaxed text-ink-soft">
        {product.description ?? product.shortDescription}
      </p>

      {product.sizeLabel ? (
        <p className="mt-4 text-[13px] text-muted">{product.sizeLabel}</p>
      ) : null}

      <div className="mt-7 flex items-center gap-3">
        <div className="flex items-center rounded-full border border-line">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-11 w-11 items-center justify-center text-[15px] text-ink-soft transition-colors hover:text-ink"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="nums w-8 text-center text-[14px] font-medium">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(product.stock || 20, q + 1))}
            className="flex h-11 w-11 items-center justify-center text-[15px] text-ink-soft transition-colors hover:text-ink"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <button
          type="button"
          disabled={soldOut}
          className="btn btn-primary flex-1"
          onClick={() => {
            add(
              {
                productId: product.id,
                slug: product.slug,
                name: product.name,
                sizeLabel: product.sizeLabel,
                unitPriceUsd: product.priceUsd,
                imageUrl: product.image?.url ?? null,
                stock: product.stock,
              },
              quantity,
            );
            openDrawer();
          }}
        >
          {soldOut ? "Sold out" : "Add to bag"}
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <a
          className="btn btn-ghost flex-1"
          target="_blank"
          rel="noreferrer"
          href={whatsappLink(
            `Hello Morena Collection, I am interested in ${product.name}${
              product.sizeLabel ? ` (${product.sizeLabel})` : ""
            }. Is it available?`,
          )}
        >
          Ask on WhatsApp
        </a>
        <a className="btn btn-ghost flex-1" href={telLink()}>
          Call the studio
        </a>
      </div>

      <dl className="mt-9 flex flex-col gap-3 border-t border-line pt-7 text-[13px]">
        <div className="flex justify-between gap-6">
          <dt className="text-muted">Availability</dt>
          <dd className="text-right font-medium">
            {soldOut ? "Out of stock" : product.stock <= 3 ? `Low stock · ${product.stock} left` : "In stock"}
          </dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="text-muted">Pricing</dt>
          <dd className="text-right">Shown for {country} · {currency}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="text-muted">Dispatch</dt>
          <dd className="text-right">From Iwo, Osun State</dd>
        </div>
      </dl>

      {product.details ? (
        <div className="mt-7 rounded-2xl bg-mist p-5">
          <p className="eyebrow text-muted">Composition</p>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">{product.details}</p>
        </div>
      ) : null}
    </div>
  );
}
