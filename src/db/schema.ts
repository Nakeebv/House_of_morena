import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Store departments: Perfumes (flagship), Bags, Shoes, Clothes. */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  tagline: text("tagline"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * Catalogue items. `priceUsd` is the single source of truth (base currency)
 * so every market can be priced from one number.
 */
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    categoryId: integer("category_id"),
    shortDescription: text("short_description"),
    description: text("description"),
    details: text("details"),
    sizeLabel: text("size_label"),
    priceUsd: numeric("price_usd", { precision: 12, scale: 2 }).notNull(),
    compareUsd: numeric("compare_usd", { precision: 12, scale: 2 }),
    stock: integer("stock").notNull().default(0),
    /** live = visible on the storefront, draft = hidden */
    status: text("status").notNull().default("live"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("products_status_idx").on(table.status),
    index("products_category_idx").on(table.categoryId),
  ],
);

/**
 * Images live in the database so an upload from the admin panel is instantly
 * live on the storefront with no filesystem or redeploy step.
 */
export const productImages = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id"),
    /** external (stock/CDN) source */
    url: text("url"),
    /** inline base64 payload for admin uploads */
    data: text("data"),
    mimeType: text("mime_type").notNull().default("image/jpeg"),
    alt: text("alt"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("product_images_product_idx").on(table.productId)],
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    reference: text("reference").notNull().unique(),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone").notNull(),
    country: text("country").notNull().default("NG"),
    countryName: text("country_name").notNull().default("Nigeria"),
    currency: text("currency").notNull().default("NGN"),
    fulfilment: text("fulfilment").notNull().default("delivery"),
    addressLine: text("address_line"),
    city: text("city"),
    state: text("state"),
    note: text("note"),
    subtotalUsd: numeric("subtotal_usd", { precision: 12, scale: 2 }).notNull(),
    shippingUsd: numeric("shipping_usd", { precision: 12, scale: 2 }).notNull().default("0"),
    totalUsd: numeric("total_usd", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: text("payment_method").notNull().default("transfer"),
    /** website | whatsapp | instagram | phone | walk_in | other */
    source: text("source").notNull().default("website"),
    sellerNote: text("seller_note"),
    /** pending | awaiting_confirmation | paid | fulfilled | cancelled */
    status: text("status").notNull().default("pending"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("orders_status_idx").on(table.status),
    index("orders_created_idx").on(table.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull(),
    productId: integer("product_id"),
    name: text("name").notNull(),
    slug: text("slug"),
    sizeLabel: text("size_label"),
    unitPriceUsd: numeric("unit_price_usd", { precision: 12, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    imageUrl: text("image_url"),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

/**
 * Outbound email log. Every message the store sends — automatic order
 * notifications and anything the seller composes by hand — is recorded here so
 * the admin panel can always show what went out, and to whom.
 */
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id"),
    toEmail: text("to_email").notNull(),
    toName: text("to_name"),
    replyTo: text("reply_to"),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    /** manual | order_confirmation | seller_alert | payment_receipt | shipping_note */
    kind: text("kind").notNull().default("manual"),
    /** sent | queued | failed */
    status: text("status").notNull().default("queued"),
    providerId: text("provider_id"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("messages_created_idx").on(table.createdAt)],
);

export type MessageRow = typeof messages.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type ProductImageRow = typeof productImages.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
