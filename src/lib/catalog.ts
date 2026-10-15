import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  categories,
  orderItems,
  orders,
  productImages,
  products,
  type CategoryRow,
  type OrderRow,
  type ProductImageRow,
  type ProductRow,
} from "@/db/schema";

export type ImageRef = { url: string; alt: string };

export type Product = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  details: string | null;
  sizeLabel: string | null;
  priceUsd: number;
  compareUsd: number | null;
  stock: number;
  status: string;
  featured: boolean;
  categorySlug: string | null;
  categoryName: string | null;
  image: ImageRef | null;
  gallery: ImageRef[];
  createdAt: string;
};

export type Category = Pick<CategoryRow, "id" | "name" | "slug" | "tagline" | "sortOrder">;

/* ------------------------------------------------------------------ */
/* Image helpers                                                       */
/* ------------------------------------------------------------------ */

function toRef(row: ProductImageRow): ImageRef {
  const url = row.data ? `/api/images/${row.id}` : row.url ?? "";
  return { url, alt: row.alt ?? "" };
}

async function imagesFor(productIds: number[]) {
  const map = new Map<number, ImageRef[]>();
  if (productIds.length === 0) return map;
  const rows = await getDb()
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(asc(productImages.sortOrder), asc(productImages.id));
  for (const row of rows) {
    if (row.productId == null) continue;
    const list = map.get(row.productId) ?? [];
    list.push(toRef(row));
    map.set(row.productId, list);
  }
  return map;
}

function hydrate(
  row: ProductRow,
  category: CategoryRow | null,
  gallery: ImageRef[],
): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.shortDescription,
    description: row.description,
    details: row.details,
    sizeLabel: row.sizeLabel,
    priceUsd: Number(row.priceUsd),
    compareUsd: row.compareUsd == null ? null : Number(row.compareUsd),
    stock: row.stock,
    status: row.status,
    featured: row.featured,
    categorySlug: category?.slug ?? null,
    categoryName: category?.name ?? null,
    image: gallery[0] ?? null,
    gallery,
    createdAt: row.createdAt.toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export async function getCategories(): Promise<Category[]> {
  await ensureSeed();
  return getDb()
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      tagline: categories.tagline,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getProducts(options?: {
  categorySlug?: string;
  search?: string;
  featuredOnly?: boolean;
  includeDrafts?: boolean;
  limit?: number;
}): Promise<Product[]> {
  await ensureSeed();
  const filters = [];
  if (!options?.includeDrafts) filters.push(eq(products.status, "live"));
  if (options?.categorySlug) filters.push(eq(categories.slug, options.categorySlug));
  if (options?.featuredOnly) filters.push(eq(products.featured, true));
  if (options?.search) {
    const term = `%${options.search.toLowerCase()}%`;
    filters.push(sql`(lower(${products.name}) like ${term} or lower(coalesce(${products.shortDescription}, '')) like ${term})`);
  }

  const rows = await getDb()
    .select({ product: products, category: categories })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(products.sortOrder), desc(products.createdAt))
    .limit(options?.limit ?? 200);

  const galleryMap = await imagesFor(rows.map((r) => r.product.id));
  return rows.map((r) => hydrate(r.product, r.category, galleryMap.get(r.product.id) ?? []));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  await ensureSeed();
  const rows = await getDb()
    .select({ product: products, category: categories })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))
    .limit(1);
  if (rows.length === 0) return null;
  const galleryMap = await imagesFor([rows[0].product.id]);
  return hydrate(rows[0].product, rows[0].category, galleryMap.get(rows[0].product.id) ?? []);
}

export async function getProductsByIds(ids: number[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const rows = await getDb()
    .select({ product: products, category: categories })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(inArray(products.id, ids));
  const galleryMap = await imagesFor(ids);
  return rows.map((r) => hydrate(r.product, r.category, galleryMap.get(r.product.id) ?? []));
}

export async function getProductForEdit(id: number) {
  const rows = await getDb().select().from(products).where(eq(products.id, id)).limit(1);
  if (rows.length === 0) return null;
  const gallery = (await imagesFor([id])).get(id) ?? [];
  const imageRows = await getDb()
    .select()
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(asc(productImages.sortOrder), asc(productImages.id));
  return {
    row: rows[0],
    gallery,
    imageIds: imageRows.map((i) => i.id),
  };
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export function newReference() {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  // 10 random base36 characters (~50 bits) so order references cannot be
  // enumerated by guessing.
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const rand = Array.from(bytes)
    .map((b) => "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"[b % 34])
    .join("");
  return `MRN-${stamp}${rand}`;
}

export type OrderSource = "website" | "whatsapp" | "instagram" | "phone" | "walk_in" | "other";

export const SOURCE_LABELS: Record<OrderSource, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  phone: "Phone call",
  walk_in: "Walk-in",
  other: "Other channel",
};

export type NewOrderInput = {
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  country: string;
  countryName: string;
  currency: string;
  fulfilment: "delivery" | "pickup";
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  note?: string | null;
  paymentMethod: string;
  source?: OrderSource;
  sellerNote?: string | null;
  /** Manual sales recorded after the fact start life as paid. */
  status?: "pending" | "paid" | "fulfilled";
  items: { productId: number; quantity: number }[];
};

export async function createOrder(input: NewOrderInput) {
  const ids = input.items.map((i) => i.productId);
  const catalogue = await getProductsByIds(ids);
  const byId = new Map(catalogue.map((p) => [p.id, p]));

  const lines = input.items
    .map((item) => {
      const product = byId.get(item.productId);
      if (!product) return null;
      const quantity = Math.max(1, Math.min(item.quantity, 20));
      return { product, quantity };
    })
    .filter((l): l is { product: Product; quantity: number } => l !== null);

  if (lines.length === 0) throw new Error("No valid items in cart");

  const subtotalUsd = lines.reduce((sum, l) => sum + l.product.priceUsd * l.quantity, 0);
  const { shippingUsd } = await import("./currency").then((m) => ({
    shippingUsd: m.shippingUsd({
      country: input.country,
      fulfilment: input.fulfilment,
      subtotalUsd,
    }),
  }));
  const totalUsd = subtotalUsd + shippingUsd;
  const reference = newReference();

  const inserted = await getDb()
    .insert(orders)
    .values({
      reference,
      customerName: input.customerName,
      customerEmail: input.customerEmail ?? null,
      customerPhone: input.customerPhone,
      country: input.country,
      countryName: input.countryName,
      currency: input.currency,
      fulfilment: input.fulfilment,
      addressLine: input.addressLine ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      note: input.note ?? null,
      subtotalUsd: subtotalUsd.toFixed(2),
      shippingUsd: shippingUsd.toFixed(2),
      totalUsd: totalUsd.toFixed(2),
      paymentMethod: input.paymentMethod,
      source: input.source ?? "website",
      sellerNote: input.sellerNote ?? null,
      status: input.status ?? "pending",
      paidAt: input.status && input.status !== "pending" ? new Date() : null,
    })
    .returning();

  const order = inserted[0];

  await getDb().insert(orderItems).values(
    lines.map((line) => ({
      orderId: order.id,
      productId: line.product.id,
      name: line.product.name,
      slug: line.product.slug,
      sizeLabel: line.product.sizeLabel,
      unitPriceUsd: line.product.priceUsd.toFixed(2),
      quantity: line.quantity,
      imageUrl: line.product.image?.url ?? null,
    })),
  );

  return order;
}

export type OrderWithItems = OrderRow & {
  items: (typeof orderItems.$inferSelect)[];
};

export async function getOrderByReference(reference: string): Promise<OrderWithItems | null> {
  const rows = await getDb().select().from(orders).where(eq(orders.reference, reference)).limit(1);
  if (rows.length === 0) return null;
  const items = await getDb().select().from(orderItems).where(eq(orderItems.orderId, rows[0].id));
  return { ...rows[0], items };
}

export async function listOrders(limit = 100) {
  return getDb().select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
}

export async function listOrderItems(orderIds: number[]) {
  if (orderIds.length === 0) return [];
  return getDb().select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
}

export async function updateOrder(id: number, patch: Partial<typeof orders.$inferInsert>) {
  await getDb().update(orders).set(patch).where(eq(orders.id, id));
}

export async function getOrderById(id: number) {
  const rows = await getDb().select().from(orders).where(eq(orders.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Buyer roll-up, derived straight from the orders table so it can never drift
 * out of sync. One row per phone number.
 */
export type Buyer = {
  phone: string;
  name: string;
  email: string | null;
  countryName: string | null;
  city: string | null;
  state: string | null;
  addressLine: string | null;
  currency: string;
  ordersCount: number;
  paidCount: number;
  spentUsd: number;
  firstOrder: string;
  lastOrder: string;
};

export async function listBuyers(): Promise<Buyer[]> {
  await ensureSeed();
  const rows = await getDb()
    .select({
      phone: orders.customerPhone,
      name: sql<string>`max(${orders.customerName})`,
      email: sql<string | null>`max(${orders.customerEmail})`,
      countryName: sql<string | null>`max(${orders.countryName})`,
      city: sql<string | null>`max(${orders.city})`,
      state: sql<string | null>`max(${orders.state})`,
      addressLine: sql<string | null>`max(${orders.addressLine})`,
      currency: sql<string>`max(${orders.currency})`,
      ordersCount: sql<number>`count(*)::int`,
      paidCount: sql<number>`count(*) filter (where ${orders.status} in ('paid','fulfilled'))::int`,
      spentUsd: sql<number>`coalesce(sum(${orders.totalUsd}) filter (where ${orders.status} in ('paid','fulfilled')), 0)::float`,
      firstOrder: sql<string>`to_char(min(${orders.createdAt}), 'DD Mon YYYY')`,
      lastOrder: sql<string>`to_char(max(${orders.createdAt}), 'DD Mon YYYY')`,
    })
    .from(orders)
    .groupBy(orders.customerPhone)
    .orderBy(desc(sql`max(${orders.createdAt})`));
  return rows;
}

/** Sales split by where the order came from. */
export async function salesByChannel() {
  const rows = await getDb()
    .select({
      source: orders.source,
      ordersCount: sql<number>`count(*)::int`,
      revenueUsd: sql<number>`coalesce(sum(${orders.totalUsd}) filter (where ${orders.status} in ('paid','fulfilled')), 0)::float`,
      pendingUsd: sql<number>`coalesce(sum(${orders.totalUsd}) filter (where ${orders.status} in ('pending','awaiting_confirmation')), 0)::float`,
    })
    .from(orders)
    .groupBy(orders.source);

  return rows
    .map((row) => ({
      source: (row.source ?? "website") as OrderSource,
      label: SOURCE_LABELS[(row.source ?? "website") as OrderSource] ?? row.source,
      ordersCount: row.ordersCount,
      revenueUsd: row.revenueUsd,
      pendingUsd: row.pendingUsd,
    }))
    .sort((a, b) => b.revenueUsd - a.revenueUsd || b.ordersCount - a.ordersCount);
}

/** Every order a given buyer has placed, newest first. */
export async function ordersByBuyer(phone: string) {
  return getDb()
    .select()
    .from(orders)
    .where(eq(orders.customerPhone, phone))
    .orderBy(desc(orders.createdAt));
}

export async function dashboardStats() {
  await ensureSeed();
  const [totals] = await getDb()
    .select({
      orderCount: sql<number>`count(*)::int`,
      paidCount: sql<number>`count(*) filter (where ${orders.status} in ('paid','fulfilled'))::int`,
      revenueUsd: sql<number>`coalesce(sum(${orders.totalUsd}) filter (where ${orders.status} in ('paid','fulfilled')), 0)::float`,
      pendingUsd: sql<number>`coalesce(sum(${orders.totalUsd}) filter (where ${orders.status} in ('pending','awaiting_confirmation')), 0)::float`,
      unitsSold: sql<number>`0::int`,
    })
    .from(orders);

  const [stock] = await getDb()
    .select({
      liveProducts: sql<number>`count(*) filter (where ${products.status} = 'live')::int`,
      draftProducts: sql<number>`count(*) filter (where ${products.status} = 'draft')::int`,
      lowStock: sql<number>`count(*) filter (where ${products.stock} <= 3)::int`,
    })
    .from(products);

  const top = await getDb()
    .select({
      name: orderItems.name,
      slug: orderItems.slug,
      units: sql<number>`sum(${orderItems.quantity})::int`,
      revenueUsd: sql<number>`sum(${orderItems.quantity} * ${orderItems.unitPriceUsd})::float`,
    })
    .from(orderItems)
    .groupBy(orderItems.name, orderItems.slug)
    .orderBy(desc(sql`sum(${orderItems.quantity} * ${orderItems.unitPriceUsd})`))
    .limit(5);

  const recent = await getDb().select().from(orders).orderBy(desc(orders.createdAt)).limit(6);

  return { totals, stock, top, recent };
}

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */

const px = (id: number, w = 1000, h = 1000) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;

let seedPromise: Promise<void> | null = null;

export function ensureSeed() {
  if (!seedPromise) {
    seedPromise = seed().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}

async function seed() {
  const [{ count }] = await getDb().select({ count: sql<number>`count(*)::int` }).from(products);
  if (count > 0) return;

  const cats = await getDb()
    .insert(categories)
    .values([
      { name: "Perfume", slug: "perfumes", tagline: "Our first language. Blended for staying power.", sortOrder: 1 },
      { name: "Bags", slug: "bags", tagline: "Leather goods made to be carried daily.", sortOrder: 2 },
      { name: "Shoes", slug: "shoes", tagline: "Quiet footwear for long days.", sortOrder: 3 },
      { name: "Clothes", slug: "clothes", tagline: "Staples cut from natural fibre.", sortOrder: 4 },
    ])
    .onConflictDoNothing()
    .returning();

  const byslug = new Map(cats.map((c) => [c.slug, c.id]));
  const cat = {
    perfumes: byslug.get("perfumes")!,
    bags: byslug.get("bags")!,
    shoes: byslug.get("shoes")!,
    clothes: byslug.get("clothes")!,
  };

  const rows: Array<Omit<typeof products.$inferInsert, "categoryId"> & { categoryId: number; images: ImageRef[] }> = [
    {
      name: "Morena Noir",
      slug: "morena-noir",
      categoryId: cat.perfumes,
      shortDescription: "Smoked amber, black pepper, cedar. Our most requested scent.",
      description:
        "Morena Noir opens sharp and dry, then settles into smoked amber and cedar that holds on fabric for most of the day. Built in small batches and rested for six weeks before bottling.",
      details: "Top: black pepper, bergamot · Heart: smoked amber, iris · Base: cedarwood, tonka",
      sizeLabel: "100 ml · Eau de Parfum",
      priceUsd: "68.00",
      compareUsd: "82.00",
      stock: 24,
      featured: true,
      sortOrder: 1,
      images: [{ url: px(16125025), alt: "Morena Noir eau de parfum bottles" }],
    },
    {
      name: "Oud Iwo",
      slug: "oud-iwo",
      categoryId: cat.perfumes,
      shortDescription: "Cambodian oud, saffron, leather. Heavy, warm, unmistakable.",
      description:
        "An extrait concentration at 28% fragrance oil. One spray is enough. Named for the town we trade from.",
      details: "Top: saffron · Heart: Cambodian oud, rose absolute · Base: leather, labdanum",
      sizeLabel: "50 ml · Extrait de Parfum",
      priceUsd: "95.00",
      stock: 12,
      featured: true,
      sortOrder: 2,
      images: [{ url: px(28406043), alt: "Oud Iwo extrait de parfum bottle" }],
    },
    {
      name: "Rose Atlas",
      slug: "rose-atlas",
      categoryId: cat.perfumes,
      shortDescription: "Turkish rose, pink pepper, musk. Soft without being sweet.",
      description:
        "Rose Atlas is the one people ask about at events. Rose up front, a dry musk underneath, no sugar.",
      details: "Top: pink pepper, lychee · Heart: Turkish rose, geranium · Base: white musk, ambrette",
      sizeLabel: "50 ml · Eau de Parfum",
      priceUsd: "54.00",
      stock: 30,
      featured: true,
      sortOrder: 3,
      images: [{ url: px(30999189), alt: "Rose Atlas eau de parfum" }],
    },
    {
      name: "Vetiver 09",
      slug: "vetiver-09",
      categoryId: cat.perfumes,
      shortDescription: "Haitian vetiver, grapefruit, dry woods. For hot afternoons.",
      description:
        "Made for the weather here. Grapefruit keeps it lift, vetiver keeps it dry. Best seller between February and April.",
      details: "Top: grapefruit, cardamom · Heart: Haitian vetiver · Base: guaiac wood, vetiver root",
      sizeLabel: "100 ml · Eau de Parfum",
      priceUsd: "42.00",
      stock: 36,
      sortOrder: 4,
      images: [{ url: px(6127875), alt: "Vetiver 09 eau de parfum" }],
    },
    {
      name: "Musk Blanc",
      slug: "musk-blanc",
      categoryId: cat.perfumes,
      shortDescription: "Clean skin scent. Cotton, white musk, a little rice milk.",
      description:
        "Barely-there, and that is the point. Wear it alone or layer it under Oud Iwo when you want the oud to sit closer.",
      details: "Top: aldehydes · Heart: white musk, rice milk · Base: cashmeran",
      sizeLabel: "50 ml · Eau de Parfum",
      priceUsd: "46.00",
      stock: 28,
      sortOrder: 5,
      images: [{ url: px(20382236), alt: "Musk Blanc eau de parfum" }],
    },
    {
      name: "Cologne No. 3",
      slug: "cologne-no-3",
      categoryId: cat.perfumes,
      shortDescription: "Neroli, lime, green tea. The everyday bottle.",
      description:
        "A bright cologne at a fair price, and the one we restock most often. Keep one in the car.",
      details: "Top: lime, neroli · Heart: green tea, petitgrain · Base: orange blossom",
      sizeLabel: "100 ml · Eau de Toilette",
      priceUsd: "38.00",
      stock: 44,
      sortOrder: 6,
      images: [{ url: px(31251024), alt: "Cologne No. 3 eau de toilette" }],
    },
    {
      name: "The Discovery Set",
      slug: "discovery-set",
      categoryId: cat.perfumes,
      shortDescription: "Six 2 ml vials with a voucher for a full bottle.",
      description:
        "Not sure where to start? Six of our scents in 2 ml glass vials, boxed. The cost comes off your first full bottle.",
      details: "6 × 2 ml · includes ₦15,000 / $10 voucher",
      sizeLabel: "6 × 2 ml",
      priceUsd: "32.00",
      stock: 40,
      featured: true,
      sortOrder: 7,
      images: [{ url: px(29554150), alt: "Morena discovery set boxed vials" }],
    },
    {
      name: "The Iwo Tote",
      slug: "the-iwo-tote",
      categoryId: cat.bags,
      shortDescription: "Full-grain leather, hand-stitched handles, no hardware.",
      description:
        "Cut from a single hide and stitched by one of two makers we work with in Iwo. Holds a 15 inch laptop, a folder and a bottle of water without losing shape.",
      details: "Full-grain leather · 38 × 30 × 12 cm · unlined",
      sizeLabel: "One size",
      priceUsd: "120.00",
      compareUsd: "145.00",
      stock: 8,
      featured: true,
      sortOrder: 8,
      images: [{ url: px(12877069), alt: "The Iwo Tote leather bag" }],
    },
    {
      name: "Aduke Shoulder Bag",
      slug: "aduke-shoulder-bag",
      categoryId: cat.bags,
      shortDescription: "Patterned panel, slim strap, evening proportions.",
      description:
        "A compact shoulder bag with a hand-finished patterned panel. Chain strap detaches so it works as a clutch.",
      details: "Leather and cotton panel · 24 × 16 × 6 cm",
      sizeLabel: "One size",
      priceUsd: "95.00",
      stock: 10,
      sortOrder: 9,
      images: [{ url: px(8125851), alt: "Aduke shoulder bag" }],
    },
    {
      name: "Mini Satchel",
      slug: "mini-satchel",
      categoryId: cat.bags,
      shortDescription: "Small, structured, holds the essentials and nothing else.",
      description: "A hard-sided mini with a magnetic closure. Phone, cards, keys, lipstick.",
      details: "Leather · 18 × 13 × 7 cm",
      sizeLabel: "One size",
      priceUsd: "78.00",
      stock: 14,
      sortOrder: 10,
      images: [{ url: px(8125852), alt: "Mini satchel bag" }],
    },
    {
      name: "Card Holder No. 2",
      slug: "card-holder-no-2",
      categoryId: cat.bags,
      shortDescription: "Four slots, one note pocket, vegetable-tanned.",
      description: "The leather darkens where you hold it. Six months in, it looks better than new.",
      details: "Vegetable-tanned leather · 10 × 7 cm",
      sizeLabel: "One size",
      priceUsd: "34.00",
      stock: 26,
      sortOrder: 11,
      images: [{ url: px(12495668), alt: "Card Holder No. 2 leather wallet" }],
    },
    {
      name: "Loafer 01",
      slug: "loafer-01",
      categoryId: cat.shoes,
      shortDescription: "Black calf leather, leather sole, resoleable.",
      description:
        "A plain toe loafer on a leather sole. Built on a medium last; size up if you are between sizes.",
      details: "Calf leather upper · leather sole · sizes 39 – 46",
      sizeLabel: "EU 39 – 46",
      priceUsd: "110.00",
      stock: 16,
      featured: true,
      sortOrder: 12,
      images: [{ url: px(10259873), alt: "Loafer 01 black leather" }],
    },
    {
      name: "Ankle Boot · Tan",
      slug: "ankle-boot-tan",
      categoryId: cat.shoes,
      shortDescription: "Tan leather, stacked heel, side zip.",
      description: "A boot that works with trousers or a dress. Rubber insert under the heel for grip.",
      details: "Leather upper · 45 mm heel · sizes 36 – 42",
      sizeLabel: "EU 36 – 42",
      priceUsd: "135.00",
      stock: 9,
      sortOrder: 13,
      images: [
        {
          url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Brown_leather_boots_on_a_wood_floor_%28Unsplash%29.jpg/1280px-Brown_leather_boots_on_a_wood_floor_%28Unsplash%29.jpg",
          alt: "Tan leather ankle boots on a wooden floor",
        },
      ],
    },
    {
      name: "Court Sneaker",
      slug: "court-sneaker",
      categoryId: cat.shoes,
      shortDescription: "Low profile, leather upper, cupsole.",
      description: "Clean enough for the office, quiet enough not to be noticed. Machine-washable laces.",
      details: "Leather upper · rubber cupsole · sizes 36 – 45",
      sizeLabel: "EU 36 – 45",
      priceUsd: "88.00",
      stock: 20,
      sortOrder: 14,
      images: [{ url: px(27988921), alt: "Court Sneaker in black leather" }],
    },
    {
      name: "Slingback Heel",
      slug: "slingback-heel",
      categoryId: cat.shoes,
      shortDescription: "65 mm heel, elasticated strap, pointed toe.",
      description: "The heel height people can actually walk in. Padded insole, elasticated back strap.",
      details: "Leather upper · 65 mm heel · sizes 36 – 41",
      sizeLabel: "EU 36 – 41",
      priceUsd: "92.00",
      stock: 11,
      sortOrder: 15,
      images: [{ url: px(38652618), alt: "Slingback heel" }],
    },
    {
      name: "Trench · Black",
      slug: "trench-black",
      categoryId: cat.clothes,
      shortDescription: "Cotton gabardine, storm flap, removable belt.",
      description:
        "Heavy cotton gabardine with a storm flap and deep pockets. Cut long, so it works over everything.",
      details: "100% cotton gabardine · fully lined · XS – XXL",
      sizeLabel: "XS – XXL",
      priceUsd: "180.00",
      compareUsd: "215.00",
      stock: 6,
      featured: true,
      sortOrder: 16,
      images: [{ url: px(39282336), alt: "Black cotton trench coat" }],
    },
    {
      name: "Bias-Cut Dress",
      slug: "bias-cut-dress",
      categoryId: cat.clothes,
      shortDescription: "Fluid cut, midi length, no zip.",
      description: "Cut on the bias so it moves with you. Sits at mid-calf on most heights.",
      details: "Triacetate blend · midi length · sizes 6 – 16",
      sizeLabel: "UK 6 – 16",
      priceUsd: "145.00",
      stock: 12,
      sortOrder: 17,
      images: [{ url: px(27677903), alt: "Bias-cut midi dress" }],
    },
    {
      name: "Evening Dress",
      slug: "evening-dress",
      categoryId: cat.clothes,
      shortDescription: "Sequinned, lined, floor length.",
      description: "For weddings and December. Lined through the body so the sequins never touch skin.",
      details: "Sequinned mesh over lining · floor length · sizes 6 – 16",
      sizeLabel: "UK 6 – 16",
      priceUsd: "210.00",
      stock: 5,
      sortOrder: 18,
      images: [{ url: px(11590919), alt: "Sequinned evening dress" }],
    },
    {
      name: "Denim Jacket",
      slug: "denim-jacket",
      categoryId: cat.clothes,
      shortDescription: "Rigid 12 oz denim, fades fast.",
      description: "Unwashed 12 oz denim from a single mill. Wear it hard and it fades where you bend.",
      details: "100% cotton denim · 12 oz · sizes S – XXL",
      sizeLabel: "S – XXL",
      priceUsd: "98.00",
      stock: 15,
      sortOrder: 19,
      images: [{ url: px(38561616), alt: "Denim jacket" }],
    },
    {
      name: "Essential Hoodie",
      slug: "essential-hoodie",
      categoryId: cat.clothes,
      shortDescription: "Heavyweight loopback cotton, boxed shoulders.",
      description: "460 gsm loopback cotton, pre-shrunk. The one you will reach for on Friday.",
      details: "100% cotton · 460 gsm · sizes S – XXL",
      sizeLabel: "S – XXL",
      priceUsd: "70.00",
      stock: 22,
      sortOrder: 20,
      images: [{ url: px(20248584), alt: "Essential hoodie" }],
    },
  ];

  for (const row of rows) {
    const { images, ...values } = row;
    const inserted = await getDb()
      .insert(products)
      .values({ ...values, status: "live" })
      .onConflictDoNothing()
      .returning();
    const product = inserted[0];
    if (!product) continue;
    await getDb().insert(productImages).values(
      images.map((image, index) => ({
        productId: product.id,
        url: image.url,
        alt: image.alt,
        sortOrder: index,
      })),
    );
  }
}
