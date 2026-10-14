import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Nav } from "@/components/nav";
import { CartDrawer, BagToast } from "@/components/cart-drawer";
import { SiteFooter } from "@/components/site-footer";
import { StoreProvider } from "@/components/store";
import { getRegion } from "@/lib/region";
import { SITE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: `${SITE.brand} — Perfume, Bags, Shoes & Clothing`,
    template: `%s · ${SITE.brand}`,
  },
  description:
    "Morena Collection blends small-batch perfume in Iwo, Osun State, and carries leather bags, footwear and clothing. Local pricing, worldwide delivery.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: `${SITE.brand} — Perfume, made properly`,
    description:
      "Small-batch perfume, leather goods, footwear and clothing from Iwo, Osun State, Nigeria.",
    type: "website",
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const region = await getRegion();

  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col bg-paper font-sans text-ink antialiased">
        <StoreProvider
          currency={region.currency}
          country={region.country}
          countryName={region.countryName}
        >
          <Nav />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <CartDrawer />
          <BagToast />
        </StoreProvider>
      </body>
    </html>
  );
}
