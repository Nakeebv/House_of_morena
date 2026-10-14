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
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState(0);
  const [zooming, setZooming] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  // Photos that fail to load drop out of the visible list entirely.
  const visible = product.gallery.filter((image) => !failed[image.url]);
  const index = Math.min(active, Math.max(0, visible.length - 1));
  const current = visible[index] ?? null;

  function markFailed(url: string) {
    setFailed((f) => ({ ...f, [url]: true }));
  }

  function goTo(next: number) {
    if (visible.length === 0) return;
    setActive((next + visible.length) % visible.length);
  }

  function onZoomMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  const arrows =
    visible.length > 1 ? (
      <>
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[16px] shadow-md backdrop-blur transition-opacity hover:bg-white"
          aria-label="Previous image"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[16px] shadow-md backdrop-blur transition-opacity hover:bg-white"
          aria-label="Next image"
        >
          ›
        </button>
      </>
    ) : null;

  return (
    <div className="md:grid md:grid-cols-[84px_1fr] md:gap-4">
      {/* Thumbnail rail — desktop */}
      {visible.length > 1 ? (
        <div className="order-first hidden flex-col gap-3 md:flex">
          {visible.map((image, i) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setActive(i)}
              className={`h-[84px] w-[84px] overflow-hidden rounded-2xl border-2 transition-colors ${
                i === index ? "border-ink" : "border-transparent hover:border-line"
              }`}
              aria-label={`View image ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                onError={() => markFailed(image.url)}
              />
            </button>
          ))}
        </div>
      ) : null}

      {/* Main stage — desktop, Apple-style zoom on hover */}
      <div className="hidden md:block">
        <div
          className="relative aspect-square overflow-hidden rounded-[30px] bg-mist"
          onMouseMove={onZoomMove}
          onMouseEnter={() => setZooming(true)}
          onMouseLeave={() => setZooming(false)}
        >
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={current.url}
              src={current.url}
              alt={current.alt || product.name}
              className="h-full w-full object-cover transition-transform duration-500"
              style={{ transformOrigin: origin, transform: zooming ? "scale(1.7)" : "scale(1)" }}
              onError={() => markFailed(current.url)}
            />
          ) : (
            <BrandTile />
          )}
          {arrows}
        </div>
        <p className="mt-2 text-right text-[11px] text-muted">
          {visible.length > 1 ? `Image ${index + 1} of ${visible.length} · hover to zoom` : ""}
        </p>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="relative aspect-square overflow-hidden rounded-[26px] bg-mist">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={current.url}
              src={current.url}
              alt={current.alt || product.name}
              className="h-full w-full object-cover"
              onError={() => markFailed(current.url)}
            />
          ) : (
            <BrandTile />
          )}
          {arrows}
        </div>
        {visible.length > 1 ? (
          <div className="mt-3 flex justify-center gap-2">
            {visible.map((image, i) => (
              <button
                key={image.url}
                type="button"
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-ink" : "w-1.5 bg-line"
                }`}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BrandTile() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[11px] tracking-[0.2em] text-muted">
      <span className="text-[16px] font-semibold tracking-[0.26em]">MORENA</span>
      <span className="text-[9px]">COLLECTION</span>
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
