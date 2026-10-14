import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { productImages } from "@/db/schema";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const MAX_LENGTH = 4_800_000; // ~4.8 MB of base64 text
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not authorised" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { dataUrl?: string; alt?: string; productId?: number }
    | null;

  const dataUrl = body?.dataUrl ?? "";
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) {
    return Response.json({ error: "Unsupported file." }, { status: 400 });
  }
  const mimeType = match[1];
  const data = match[2];
  if (!ALLOWED.includes(mimeType)) {
    return Response.json({ error: "Use a JPG, PNG, WebP or AVIF image." }, { status: 400 });
  }
  if (data.length > MAX_LENGTH) {
    return Response.json({ error: "That image is too large. Keep it under 3 MB." }, { status: 400 });
  }

  const inserted = await getDb()
    .insert(productImages)
    .values({
      productId: body?.productId ?? null,
      data,
      mimeType,
      alt: body?.alt ?? "",
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
