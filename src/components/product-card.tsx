"use client";

import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { useStore } from "./store";
import { Tilt } from "./tilt";

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { money, add } = useStore();
  const soldOut = product.stock <= 0;
  const onSale = product.compareUsd != null && product.compareUsd > product.priceUsd;

  return (
    <article className="group flex flex-col">
      <Link
        href={`/product/${product.slug}`}
        className="relative block overflow-hidden rounded-[22px] bg-mist"
      >
        <Tilt className="aspect-square" strength={7}>
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image.url}
              alt={product.image.alt || product.name}
              className="h-full w-full object-cover"
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              width={1000}
              height={1000}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] tracking-[0.18em] text-muted">
              MORENA
            </div>
          )}
        </Tilt>

        {soldOut ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-medium tracking-[0.06em] backdrop-blur">
            Sold out
          </span>
        ) : onSale ? (
          <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-[10.5px] font-medium tracking-[0.06em] text-white">
            Set price
          </span>
        ) : null}
      </Link>

      <div className="flex items-start justify-between gap-3 px-0.5 pt-4">
        <div className="min-w-0">
          <Link href={`/product/${product.slug}`} className="block">
            <h3 className="truncate text-[15px] font-medium tracking-[-0.012em]">{product.name}</h3>
          </Link>
          <p className="mt-0.5 truncate text-[12.5px] text-muted">
            {product.sizeLabel ?? product.categoryName ?? "Morena"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="nums text-[14px] font-medium">{money(product.priceUsd)}</p>
          {onSale ? (
            <p className="nums text-[11.5px] text-muted line-through">{money(product.compareUsd!)}</p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        disabled={soldOut}
        onClick={() =>
          add({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            sizeLabel: product.sizeLabel,
            unitPriceUsd: product.priceUsd,
            imageUrl: product.image?.url ?? null,
            stock: product.stock,
          })
        }
        className="mt-3 w-full border border-line py-2.5 text-[12.5px] font-medium text-ink-soft transition-all hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        {soldOut ? "Notify me" : "Add to bag"}
      </button>
    </article>
  );
}
