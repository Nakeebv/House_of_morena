import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { getCategories, getProductForEdit } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const [categories, edit] = await Promise.all([getCategories(), getProductForEdit(numericId)]);
  if (!edit) notFound();

  return (
    <ProductForm
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
      }))}
      product={{
        id: edit.row.id,
        name: edit.row.name,
        slug: edit.row.slug,
        categoryId: edit.row.categoryId,
        shortDescription: edit.row.shortDescription,
        description: edit.row.description,
        details: edit.row.details,
        sizeLabel: edit.row.sizeLabel,
        priceUsd: Number(edit.row.priceUsd),
        compareUsd: edit.row.compareUsd == null ? null : Number(edit.row.compareUsd),
        stock: edit.row.stock,
        status: edit.row.status,
        featured: edit.row.featured,
        sortOrder: edit.row.sortOrder,
        images: edit.gallery.map((image, index) => ({
          id: edit.imageIds[index],
          url: image.url,
          alt: image.alt,
        })),
      }}
    />
  );
}
