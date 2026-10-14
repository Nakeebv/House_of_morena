"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/orders/new", label: "New sale" },
  { href: "/admin/buyers", label: "Buyers" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/settings", label: "Setup" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#faf9f8]">
      <div className="mx-auto flex max-w-[1400px] flex-col lg:flex-row">
        <aside className="border-b border-line bg-white lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-5 py-4 lg:block">
            <Link href="/admin">
              <Logo />
            </Link>
            <div className="flex items-center gap-4 lg:hidden">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[12.5px] ${
                    pathname === link.href ? "font-semibold text-ink" : "text-muted"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <nav className="hidden flex-col gap-1 px-3 pb-6 lg:flex">
            {LINKS.map((link) => {
              const active = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl px-3 py-2 text-[13.5px] transition-colors ${
                    active ? "bg-ink text-white" : "text-ink-soft hover:bg-mist"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden px-5 lg:mt-auto lg:flex lg:flex-col lg:gap-3">
            <div className="h-16" />
            <Link href="/" target="_blank" className="link text-[12.5px] text-ink-soft">
              View storefront
            </Link>
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/admin/session", { method: "DELETE" });
                router.refresh();
              }}
              className="text-left text-[12.5px] text-muted transition-colors hover:text-ink"
            >
              Sign out
            </button>
            <p className="mt-4 text-[10.5px] leading-relaxed text-muted">
              Morena Collection admin · built by Damco Space Inc
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-8 md:px-10 md:py-12">{children}</main>
      </div>
    </div>
  );
}
