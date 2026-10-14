"use client";

import Link from "next/link";
import { useStore, type CartLine } from "./store";
import { whatsappLink } from "@/lib/site";

export function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, subtotalUsd, setQuantity, remove, money, currency, count } =
    useStore();

  if (!drawerOpen) return null;

  const waMessage = [
    "Hello Morena Collection, I would like to order:",
    "",
    ...cart.map((item) => `• ${item.name}${item.sizeLabel ? ` (${item.sizeLabel})` : ""} × ${item.quantity}`),
    "",
    `Total: ${money(subtotalUsd)} ${currency}`,
  ].join("\n");

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        aria-label="Close bag"
        onClick={closeDrawer}
        className="absolute inset-0 bg-ink/25 backdrop-blur-[2px] fade"
      />

      <aside className="relative flex h-full w-full max-w-[27rem] flex-col bg-white slide-in">
        <header className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
            Your bag{count > 0 ? <span className="text-muted"> · {count}</span> : null}
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="text-[12px] text-muted transition-colors hover:text-ink"
          >
            Close
          </button>
        </header>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-10 text-center">
            <p className="text-[15px] font-medium">Your bag is empty</p>
            <p className="text-[13px] leading-relaxed text-muted">
              Perfume is where we start. Bags, shoes and clothes follow.
            </p>
            <Link href="/shop" onClick={closeDrawer} className="btn btn-primary btn-sm mt-1">
              Browse the collection
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6">
              <ul>
                {cart.map((item) => (
                  <DrawerLine
                    key={`${item.productId}-${item.sizeLabel ?? ""}`}
                    item={item}
                    money={money}
                    onQuantity={(quantity) => setQuantity(item.productId, item.sizeLabel, quantity)}
                    onRemove={() => remove(item.productId, item.sizeLabel)}
                  />
                ))}
              </ul>
            </div>

            <footer className="border-t border-line px-6 py-5">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-muted">Subtotal</span>
                <span className="nums text-[17px] font-semibold tracking-[-0.01em]">
                  {money(subtotalUsd)}
                </span>
              </div>
              <p className="mt-1 text-[11.5px] text-muted">
                Delivery calculated at checkout · {currency}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link href="/checkout" onClick={closeDrawer} className="btn btn-primary w-full">
                  Checkout
                </Link>
                <a
                  href={whatsappLink(waMessage)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost w-full"
                >
                  Order on WhatsApp
                </a>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

function DrawerLine({
  item,
  money,
  onQuantity,
  onRemove,
}: {
  item: CartLine;
  money: (usd: number) => string;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex gap-4 border-b border-line py-5 last:border-0">
      <Link
        href={`/product/${item.slug}`}
        className="relative h-[86px] w-[86px] shrink-0 overflow-hidden rounded-xl bg-mist"
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/product/${item.slug}`} className="block truncate text-[13.5px] font-medium">
              {item.name}
            </Link>
            {item.sizeLabel ? (
              <p className="mt-0.5 truncate text-[11.5px] text-muted">{item.sizeLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${item.name}`}
            className="text-[16px] leading-none text-muted transition-colors hover:text-ink"
          >
            ×
          </button>
        </div>

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center rounded-full border border-line">
            <button
              type="button"
              onClick={() => onQuantity(item.quantity - 1)}
              className="flex h-7 w-7 items-center justify-center text-[13px] text-ink-soft transition-colors hover:text-ink"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="nums w-6 text-center text-[12.5px] font-medium">{item.quantity}</span>
            <button
              type="button"
              onClick={() => onQuantity(item.quantity + 1)}
              className="flex h-7 w-7 items-center justify-center text-[13px] text-ink-soft transition-colors hover:text-ink"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <span className="nums text-[13px] font-medium">
            {money(item.unitPriceUsd * item.quantity)}
          </span>
        </div>
      </div>
    </li>
  );
}

export function BagToast() {
  const { notice } = useStore();
  if (!notice) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[70] -translate-x-1/2">
      <div className="rounded-full bg-ink px-5 py-2.5 text-[12.5px] font-medium text-white shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)] rise">
        {notice}
      </div>
    </div>
  );
}
