import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { productImages } from "@/db/schema";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const MAX_BINARY = 6_000_000; // 6 MB raw image
const MAX_LENGTH = 4_800_000; // ~4.8 MB of base64 text (JSON path)
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not authorised" }, { status: 401 });

  const contentType = request.headers.get("content-type") ?? "";
  let mimeType = "";
  let data = "";
  let alt = "";
  let productId: number | undefined;

  if (contentType.startsWith("image/")) {
    // Preferred path: the raw image bytes. Far lighter for the Worker than a
    // JSON envelope carrying base64.
    mimeType = contentType.split(";")[0].trim().toLowerCase();
    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > MAX_BINARY) {
      return Response.json({ error: "That image is too large. Keep it under 5 MB." }, { status: 400 });
    }
    if (!ALLOWED.includes(mimeType)) {
      return Response.json({ error: "Use a JPG, PNG, WebP or AVIF image." }, { status: 400 });
    }
    data = Buffer.from(buffer).toString("base64");
    alt = request.headers.get("x-image-alt") ?? "";
    const productIdHeader = request.headers.get("x-image-product");
    if (productIdHeader && Number.isFinite(Number(productIdHeader))) {
      productId = Number(productIdHeader);
    }
  } else {
    // Legacy path: JSON with a data URL.
    const body = (await request.json().catch(() => null)) as
      | { dataUrl?: string; alt?: string; productId?: number }
      | null;

    const dataUrl = body?.dataUrl ?? "";
    const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
    if (!match) {
      return Response.json({ error: "Unsupported file." }, { status: 400 });
    }
    mimeType = match[1];
    data = match[2];
    if (!ALLOWED.includes(mimeType)) {
      return Response.json({ error: "Use a JPG, PNG, WebP or AVIF image." }, { status: 400 });
    }
    if (data.length > MAX_LENGTH) {
      return Response.json({ error: "That image is too large. Keep it under 3 MB." }, { status: 400 });
    }
    alt = body?.alt ?? "";
    productId = body?.productId;
  }

  const inserted = await getDb()
    .insert(productImages)
    .values({
      productId: productId ?? null,
      data,
      mimeType,
      alt,
      sortOrder: 0,
    })
    .returning();

  const image = inserted[0];
  return Response.json({ id: image.id, url: `/api/images/${image.id}` });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not authorised" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: number } | null;
  if (!body?.id) return Response.json({ error: "Missing image id." }, { status: 400 });
  await getDb().delete(productImages).where(eq(productImages.id, Number(body.id)));
  return Response.json({ ok: true });
}
