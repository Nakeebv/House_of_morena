import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/catalog";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    products = await getProducts();
  } catch {
    products = [];
  }

  const staticRoutes = ["", "/shop", "/about", "/track"].map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    priority: route === "" ? 1 : 0.7,
  }));

  return [
    ...staticRoutes,
    ...products.map((product) => ({
      url: `${base}/product/${product.slug}`,
      lastModified: new Date(product.createdAt),
      priority: 0.8,
    })),
  ];
}
