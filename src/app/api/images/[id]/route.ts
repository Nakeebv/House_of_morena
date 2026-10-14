import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { productImages } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return new Response("Bad request", { status: 400 });
  }

  const rows = await getDb()
    .select()
    .from(productImages)
    .where(eq(productImages.id, numericId))
    .limit(1);
  const row = rows[0];
  if (!row) return new Response("Not found", { status: 404 });

  if (row.data) {
    const buffer = Buffer.from(row.data, "base64");
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": row.mimeType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  if (row.url) {
    return Response.redirect(row.url, 302);
  }

  return new Response("Not found", { status: 404 });
}
