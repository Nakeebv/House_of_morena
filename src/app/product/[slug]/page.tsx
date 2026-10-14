import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { ProductGallery, ProductPurchase } from "@/components/product-view";
import { getProductBySlug, getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Not found" };
  return {
    title: product.name,
    description: product.shortDescription ?? undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.status !== "live") notFound();

  const related = (await getProducts({ categorySlug: product.categorySlug ?? undefined }))
    .filter((item) => item.id !== product.id)
    .slice(0, 4);

  return (
    <div className="shell pb-6 pt-8 md:pt-12">
      <nav className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-ink">
          Shop
        </Link>
        {product.categorySlug ? (
          <>
            <span>/</span>
            <Link href={`/shop/category/${product.categorySlug}`} className="hover:text-ink">
              {product.categoryName}
            </Link>
          </>
        ) : null}
        <span>/</span>
        <span className="text-ink-soft">{product.name}</span>
      </nav>

      <div className="mt-8 grid gap-10 md:mt-12 md:grid-cols-2 md:gap-14 lg:gap-20">
        <div className="md:sticky md:top-24 md:self-start">
          <ProductGallery product={product} />
        </div>

        <div className="pb-4">
          <p className="eyebrow text-accent">{product.categoryName ?? "Morena"}</p>
          <h1 className="title mt-3">{product.name}</h1>
          {product.shortDescription ? (
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">{product.shortDescription}</p>
          ) : null}

          <div className="mt-8">
            <ProductPurchase product={product} />
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-20 border-t border-line pt-12 md:mt-28">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="section">More to consider</h2>
            <Link href={`/shop/category/${product.categorySlug ?? ""}`} className="link text-[13.5px] text-ink-soft">
              All {product.categoryName?.toLowerCase() ?? "pieces"}
            </Link>
          </div>
          <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
