import Link from "next/link";
import { ProductsTable } from "@/components/admin/products-table";
import { getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await getProducts({ includeDrafts: true });

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow text-muted">Catalogue</p>
          <h1 className="title mt-3">Products</h1>
          <p className="mt-3 text-[13.5px] text-muted">
            {products.length} {products.length === 1 ? "product" : "products"} · changes go live
            immediately
          </p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary btn-sm">
          Add product
        </Link>
      </header>

      <div className="mt-8">
        {products.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white px-6 py-16 text-center">
            <p className="text-[15px] font-medium">No products yet</p>
            <p className="mt-2 text-[13px] text-muted">
              Upload your first item — it appears on the storefront as soon as you save.
            </p>
            <Link href="/admin/products/new" className="btn btn-primary btn-sm mt-6">
              Add product
            </Link>
          </div>
        ) : (
          <ProductsTable products={products} />
        )}
      </div>
    </div>
  );
}
