import { ProductForm } from "@/components/admin/product-form";
import { getCategories } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await getCategories();
  return (
    <ProductForm
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
      }))}
    />
  );
}
