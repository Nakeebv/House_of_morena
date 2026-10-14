"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { formatFromUsd, type CurrencyCode } from "@/lib/currency";

export type CartLine = {
  productId: number;
  slug: string;
  name: string;
  sizeLabel: string | null;
  unitPriceUsd: number;
  quantity: number;
  imageUrl: string | null;
  stock: number;
};

type StoreValue = {
  currency: CurrencyCode;
  country: string;
  countryName: string;
  cart: CartLine[];
  ready: boolean;
  count: number;
  subtotalUsd: number;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (productId: number, sizeLabel: string | null, quantity: number) => void;
  remove: (productId: number, sizeLabel: string | null) => void;
  clear: () => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  money: (usd: number) => string;
  notice: string | null;
};

const StoreContext = createContext<StoreValue | null>(null);
const STORAGE_KEY = "morena_cart_v1";

export function StoreProvider({
  currency,
  country,
  countryName,
  children,
}: {
  currency: CurrencyCode;
  country: string;
  countryName: string;
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setCart(parsed as CartLine[]);
      }
    } catch {
      /* ignore malformed storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* storage unavailable */
    }
  }, [cart, ready]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const flash = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2400);
  }, []);

  const add = useCallback<StoreValue["add"]>(
    (line, quantity = 1) => {
      setCart((current) => {
        const index = current.findIndex(
          (item) => item.productId === line.productId && item.sizeLabel === line.sizeLabel,
        );
        if (index === -1) {
          return [...current, { ...line, quantity: Math.min(quantity, Math.max(1, line.stock || 20)) }];
        }
        const next = [...current];
        const cap = Math.max(1, next[index].stock || 20);
        next[index] = {
          ...next[index],
          quantity: Math.min(next[index].quantity + quantity, cap),
        };
        return next;
      });
      flash(`${line.name} added to your bag`);
    },
    [flash],
  );

  const setQuantity = useCallback<StoreValue["setQuantity"]>((productId, sizeLabel, quantity) => {
    setCart((current) =>
      current
        .map((item) =>
          item.productId === productId && item.sizeLabel === sizeLabel
            ? { ...item, quantity: Math.max(0, Math.min(quantity, Math.max(1, item.stock || 20))) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const remove = useCallback<StoreValue["remove"]>((productId, sizeLabel) => {
    setCart((current) =>
      current.filter((item) => !(item.productId === productId && item.sizeLabel === sizeLabel)),
    );
  }, []);

  const clear = useCallback(() => setCart([]), []);

  const value = useMemo<StoreValue>(() => {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotalUsd = cart.reduce((sum, item) => sum + item.unitPriceUsd * item.quantity, 0);
    return {
      currency,
      country,
      countryName,
      cart,
      ready,
      count,
      subtotalUsd,
      add,
      setQuantity,
      remove,
      clear,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      money: (usd: number) => formatFromUsd(usd, currency),
      notice,
    };
  }, [add, cart, country, countryName, currency, drawerOpen, notice, ready, remove, setQuantity, clear]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider");
  return context;
}
