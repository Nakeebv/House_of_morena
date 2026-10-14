import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/catalog";
import { ShopScreen } from "../../shop-screen";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  return {
    title: category ? category.name : "Shop",
    description: category?.tagline ?? undefined,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const categories = await getCategories();
  if (!categories.some((c) => c.slug === slug)) notFound();

  return <ShopScreen categorySlug={slug} search={query.q} sort={query.sort} />;
}
