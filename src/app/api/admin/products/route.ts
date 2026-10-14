import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { productImages, products } from "@/db/schema";
import { isAdmin } from "@/lib/admin";
import { toUsd, CURRENCIES, type CurrencyCode } from "@/lib/currency";

export const dynamic = "force-dynamic";

export type ProductPayload = {
  name?: string;
  slug?: string;
  categoryId?: number | null;
  shortDescription?: string;
  description?: string;
  details?: string;
  sizeLabel?: string;
  priceAmount?: number;
  priceCurrency?: string;
  compareAmount?: number | null;
  stock?: number;
  status?: string;
  featured?: boolean;
  sortOrder?: number;
  imageIds?: number[];
  imageUrls?: { url: string; alt?: string }[];
};

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "piece"
  );
}

async function uniqueSlug(base: string, ignoreId?: number) {
  let candidate = base;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const rows = await getDb()
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, candidate))
      .limit(1);
    const clash = rows[0];
    if (!clash || clash.id === ignoreId) return candidate;
    candidate = `${base}-${attempt + 2}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function resolveUsd(
  amount: number | null | undefined,
  currency: string | undefined,
  fallback: number,
) {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return fallback;
  const code = (currency ?? "NGN").toUpperCase();
  const known = CURRENCIES[code as CurrencyCode] ? (code as CurrencyCode) : "NGN";
  return Math.round(toUsd(amount, known) * 100) / 100;
}

async function attachImages(productId: number, imageIds: number[], imageUrls: { url: string; alt?: string }[]) {
  const offset = imageIds.length;
  for (const [index, id] of imageIds.entries()) {
    await getDb()
      .update(productImages)
      .set({ productId, sortOrder: index })
      .where(eq(productImages.id, id));
  }
  if (imageUrls.length > 0) {
    await getDb().insert(productImages).values(
      imageUrls.map((image, index) => ({
        productId,
        url: image.url,
        alt: image.alt ?? "",
        sortOrder: offset + index,
      })),
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not authorised" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as ProductPayload | null;
  if (!body || typeof body.name !== "string" || body.name.trim().length < 2) {
    return Response.json({ error: "Product needs a name." }, { status: 400 });
  }

  const priceUsd = resolveUsd(body.priceAmount, body.priceCurrency, 0);
  if (priceUsd <= 0) {
    return Response.json({ error: "Enter a price above zero." }, { status: 400 });
  }

  const compareUsd =
    body.compareAmount == null || !Number.isFinite(body.compareAmount) || body.compareAmount <= 0
      ? null
      : resolveUsd(body.compareAmount, body.priceCurrency, 0) || null;

  const slug = await uniqueSlug(slugify(body.slug?.trim() || body.name));

  const inserted = await getDb()
    .insert(products)
    .values({
      name: body.name.trim(),
      slug,
      categoryId: body.categoryId ?? null,
      shortDescription: body.shortDescription?.trim() || null,
      description: body.description?.trim() || null,
      details: body.details?.trim() || null,
      sizeLabel: body.sizeLabel?.trim() || null,
      priceUsd: priceUsd.toFixed(2),
      compareUsd: compareUsd ? compareUsd.toFixed(2) : null,
      stock: Math.max(0, Math.round(Number(body.stock ?? 0))),
      status: body.status === "draft" ? "draft" : "live",
      featured: Boolean(body.featured),
      sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 100,
      updatedAt: new Date(),
    })
    .returning();

  const product = inserted[0];
  await attachImages(product.id, body.imageIds ?? [], body.imageUrls ?? []);

  revalidatePath("/");
  revalidatePath("/shop");
  return Response.json({ ok: true, id: product.id, slug: product.slug });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not authorised" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as (ProductPayload & { id?: number }) | null;
  if (!body?.id) return Response.json({ error: "Missing product id." }, { status: 400 });

  const id = Number(body.id);
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.name === "string" && body.name.trim().length >= 2) patch.name = body.name.trim();
  if (typeof body.slug === "string" && body.slug.trim()) {
    patch.slug = await uniqueSlug(slugify(body.slug), id);
  }
  if (body.categoryId !== undefined) patch.categoryId = body.categoryId ?? null;
  if (body.shortDescription !== undefined) patch.shortDescription = body.shortDescription?.trim() || null;
  if (body.description !== undefined) patch.description = body.description?.trim() || null;
  if (body.details !== undefined) patch.details = body.details?.trim() || null;
  if (body.sizeLabel !== undefined) patch.sizeLabel = body.sizeLabel?.trim() || null;
  if (body.priceAmount !== undefined) {
    const priceUsd = resolveUsd(body.priceAmount, body.priceCurrency, 0);
    if (priceUsd <= 0) return Response.json({ error: "Enter a price above zero." }, { status: 400 });
    patch.priceUsd = priceUsd.toFixed(2);
  }
  if (body.compareAmount !== undefined) {
    const compareUsd = resolveUsd(body.compareAmount, body.priceCurrency, 0);
    patch.compareUsd = compareUsd > 0 ? compareUsd.toFixed(2) : null;
  }
  if (body.stock !== undefined) patch.stock = Math.max(0, Math.round(Number(body.stock ?? 0)));
  if (body.status !== undefined) patch.status = body.status === "draft" ? "draft" : "live";
  if (body.featured !== undefined) patch.featured = Boolean(body.featured);
  if (body.sortOrder !== undefined) patch.sortOrder = Number(body.sortOrder) || 0;

  await getDb().update(products).set(patch).where(eq(products.id, id));

  if (body.imageIds || body.imageUrls) {
    await attachImages(id, body.imageIds ?? [], body.imageUrls ?? []);
  }

  revalidatePath("/");
  revalidatePath("/shop");
  return Response.json({ ok: true, id });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not authorised" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: number } | null;
  if (!body?.id) return Response.json({ error: "Missing product id." }, { status: 400 });

  const id = Number(body.id);
  await getDb().delete(productImages).where(eq(productImages.productId, id));
  await getDb().delete(products).where(eq(products.id, id));

  revalidatePath("/");
  revalidatePath("/shop");
  return Response.json({ ok: true });
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Not authorised" }, { status: 401 });
  const rows = await getDb()
    .select({ id: products.id, stock: products.stock })
    .from(products)
    .where(sql`true`);
  return Response.json({ count: rows.length });
}
