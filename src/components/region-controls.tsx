"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCY_ORDER, REGIONS } from "@/lib/currency";

const COOKIE = "morena_country";

function setCountryCookie(value: string) {
  document.cookie = `${COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
}

function readCountryCookie() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  return match?.[1] ?? null;
}

const CURRENCY_COUNTRY: Record<string, string> = {
  NGN: "NG",
  USD: "US",
  GBP: "GB",
  EUR: "FR",
  CAD: "CA",
  AUD: "AU",
  GHS: "GH",
  KES: "KE",
  ZAR: "ZA",
  AED: "AE",
  SAR: "SA",
  INR: "IN",
  XOF: "SN",
  XAF: "CM",
};

export function RegionSwitcher({ currency }: { currency: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  // Close on outside click / escape without re-rendering anything else.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(country: string) {
    setOpen(false);
    setCountryCookie(country);
    // Only re-render if the write actually landed; otherwise hard-navigate so
    // the change is never silently dropped.
    if (readCountryCookie() === country) {
      router.refresh();
    } else {
      window.location.reload();
    }
  }

  return (
    <div className="relative" ref={wrapper}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[12px] font-medium text-ink-soft transition-colors hover:text-ink"
        aria-label="Change currency"
        aria-expanded={open}
      >
        <span className="nums">{currency}</span>
        <svg width="8" height="5" viewBox="0 0 8 5" aria-hidden="true">
          <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-3 w-44 overflow-hidden rounded-2xl border border-line bg-white/95 p-1.5 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.35)] backdrop-blur-xl fade">
          {CURRENCY_ORDER.map((code) => {
            const country = CURRENCY_COUNTRY[code] ?? "US";
            const name = REGIONS[country]?.countryName ?? code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => choose(country)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] transition-colors hover:bg-mist ${
                  code === currency ? "font-semibold text-ink" : "text-ink-soft"
                }`}
              >
                <span className="truncate">{name}</span>
                <span className="nums text-[11px] text-muted">{code}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
