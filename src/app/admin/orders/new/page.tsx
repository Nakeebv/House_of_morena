import { ManualSaleForm } from "@/components/admin/manual-sale-form";
import { getProducts } from "@/lib/catalog";
import { getRegion } from "@/lib/region";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  const [products, region] = await Promise.all([
    getProducts({ includeDrafts: true }),
    getRegion(),
  ]);

  return <ManualSaleForm products={products} defaultCurrency={region.currency} />;
}
