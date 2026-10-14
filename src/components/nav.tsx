"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { RegionSwitcher } from "./region-controls";
import { useStore } from "./store";
import { NAV_LINKS } from "@/lib/site";
import { FREE_SHIPPING_USD } from "@/lib/currency";

export function Nav() {
  const { count, openDrawer, currency, money, ready } = useStore();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <div className="hidden bg-mist py-1.5 text-center md:block">
        <p className="text-[11px] tracking-[0.01em] text-muted">
          Complimentary delivery on orders above {money(FREE_SHIPPING_USD)} · Worldwide shipping from Iwo,
          Osun State
        </p>
      </div>

      <header
        className={`sticky top-0 z-40 border-b bg-white/85 backdrop-blur-xl backdrop-saturate-150 transition-[border-color] duration-200 ${
          scrolled ? "border-line" : "border-transparent"
        }`}
      >
        <nav className="shell flex h-12 items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="-ml-2 flex h-9 w-9 items-center justify-center md:hidden"
            >
              <span className="relative block h-[10px] w-[17px]">
                <span
                  className={`absolute left-0 h-[1.4px] w-full bg-ink transition-all duration-300 ${
                    menuOpen ? "top-[4px] rotate-45" : "top-0"
                  }`}
                />
                <span
                  className={`absolute left-0 h-[1.4px] w-full bg-ink transition-all duration-300 ${
                    menuOpen ? "top-[4px] -rotate-45" : "top-[8px]"
                  }`}
                />
              </span>
            </button>
            <Link href="/" aria-label="Morena Collection home" className="ml-1 md:ml-0">
              <Logo />
            </Link>
          </div>

          <div className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="link text-[12.5px] text-ink-soft transition-colors hover:text-ink"
                data-active={pathname === link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3.5">
            <div className="hidden sm:block">
              <RegionSwitcher currency={currency} />
            </div>
            <button
              type="button"
              onClick={openDrawer}
              className="group relative flex items-center gap-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:text-ink"
            >
              Bag
              <span
                className={`nums flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-1 text-[10.5px] font-semibold transition-all ${
                  ready && count > 0 ? "bg-ink text-white" : "bg-mist text-muted"
                }`}
              >
                {ready ? count : 0}
              </span>
            </button>
          </div>
        </nav>

        {menuOpen ? (
          <div className="border-t border-line bg-white/95 backdrop-blur-xl md:hidden">
            <div className="shell flex flex-col py-3 fade">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="border-b border-line/70 py-3 text-[15px] font-medium tracking-[-0.01em] last:border-0"
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center justify-between py-4">
                <span className="text-[12px] text-muted">Prices shown in</span>
                <RegionSwitcher currency={currency} />
              </div>
            </div>
          </div>
        ) : null}
      </header>
    </>
  );
}
