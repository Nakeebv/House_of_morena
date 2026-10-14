"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { formatFromUsd, type CurrencyCode } from "@/lib/currency";

const NGN: CurrencyCode = "NGN";

export function ProductsTable({ products }: { products: Product[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function toggleStatus(product: Product) {
    setBusyId(product.id);
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: product.id,
        status: product.status === "live" ? "draft" : "live",
      }),
    });
    setBusyId(null);
    router.refresh();
  }

  async function remove(product: Product) {
    if (!window.confirm(`Delete “${product.name}”? This cannot be undone.`)) return;
    setBusyId(product.id);
    await fetch("/api/admin/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id }),
    });
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <ul>
        {products.map((product) => (
          <li
            key={product.id}
            className={`flex flex-wrap items-center gap-4 border-b border-line px-4 py-4 last:border-0 sm:px-5 ${
              busyId === product.id ? "opacity-50" : ""
            }`}
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-mist">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image.url} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium">{product.name}</p>
              <p className="mt-0.5 truncate text-[12px] text-muted">
                {product.categoryName ?? "Uncategorised"}
                {product.sizeLabel ? ` · ${product.sizeLabel}` : ""}
                {product.featured ? " · featured" : ""}
              </p>
            </div>

            <div className="hidden w-28 text-right sm:block">
              <p className="nums text-[13.5px] font-medium">
                {formatFromUsd(product.priceUsd, NGN)}
              </p>
              {product.compareUsd ? (
                <p className="nums text-[11.5px] text-muted line-through">
                  {formatFromUsd(product.compareUsd, NGN)}
                </p>
              ) : null}
            </div>

            <div className="w-16 text-right">
              <p className={`nums text-[13px] ${product.stock <= 3 ? "text-[#8a5a13]" : "text-ink-soft"}`}>
                {product.stock}
              </p>
              <p className="text-[11px] text-muted">in stock</p>
            </div>

            <button
              type="button"
              onClick={() => void toggleStatus(product)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-colors ${
                product.status === "live"
                  ? "bg-[#e9f3ec] text-[#26603a] hover:bg-[#dcebe1]"
                  : "bg-mist text-muted hover:bg-[#ebe9e5]"
              }`}
            >
              {product.status === "live" ? "Live" : "Draft"}
            </button>

            <div className="flex shrink-0 items-center gap-3">
              <Link
                href={`/admin/products/${product.id}`}
                className="text-[12.5px] text-ink-soft transition-colors hover:text-ink"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => void remove(product)}
                className="text-[12.5px] text-muted transition-colors hover:text-[#8c2f2f]"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
