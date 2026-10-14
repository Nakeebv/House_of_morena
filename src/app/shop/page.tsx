import type { Metadata } from "next";
import { ShopScreen } from "./shop-screen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Shop Morena Collection: small-batch perfume, leather bags, footwear and clothing from Iwo, Osun State.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const params = await searchParams;
  return (
    <ShopScreen
      categorySlug={params.category}
      search={params.q}
      sort={params.sort}
    />
  );
}
