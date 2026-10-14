import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { productImages } from "@/db/schema";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const MAX_BINARY = 10_000_000; // 10 MB raw image
const MAX_LENGTH = 4_800_000; // ~4.8 MB base64 (legacy DB fallback path)
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Cloudinary credentials come from the Worker secrets:
 *   CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
 * When present, upload bytes go straight to Cloudinary's CDN and only the
 * small delivery URL is stored in Postgres. Without them we fall back to
 * storing the bytes in Postgres.
 */
function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

async function sha1Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Signed direct upload. Returns the delivery URL (f_auto, q_auto). */
async function uploadToCloudinary(bytes: ArrayBuffer, mimeType: string, alt: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = "morena/products";
  const publicId = `piece-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;

  // Signature covers every public param, sorted alphabetically.
  const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = await sha1Hex(toSign);

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType }), "photo");
  form.append("api_key", apiKey);
  form.append("timestamp", timestamp);
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    secure_url?: string;
    error?: { message?: string };
  };
  if (!response.ok || !payload.secure_url) {
    return {
      ok: false as const,
      error: payload.error?.message ?? `Cloudinary rejected the upload (${response.status}).`,
    };
  }
  // Deliver an automatically optimised format/quality.
  const url = payload.secure_url.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
  if (alt) {
    // Fire-and-forget: alt text metadata on Cloudinary (best effort).
    void fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/context`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        public_id: publicId,
        api_key: apiKey,
        timestamp: timestamp,
        signature: await sha1Hex(
          `context=alt=${alt}|caption=${alt}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`,
        ),
      }).toString(),
    }).catch(() => {});
  }
  return { ok: true as const, url };
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not authorised" }, { status: 401 });

  const contentType = request.headers.get("content-type") ?? "";
  let mimeType = "";
  let payload: { url?: string; data?: string; mimeType: string } | null = null;
  let alt = "";
  let productId: number | undefined;

  if (contentType.startsWith("image/")) {
    // Preferred path: raw image bytes.
    mimeType = contentType.split(";")[0].trim().toLowerCase();
    if (!ALLOWED.includes(mimeType)) {
      return Response.json({ error: "Use a JPG, PNG, WebP or AVIF image." }, { status: 400 });
    }
    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > MAX_BINARY) {
      return Response.json({ error: "That image is too large. Keep it under 9 MB." }, { status: 400 });
    }
    alt = request.headers.get("x-image-alt") ?? "";
    const productIdHeader = request.headers.get("x-image-product");
    if (productIdHeader && Number.isFinite(Number(productIdHeader))) {
      productId = Number(productIdHeader);
    }

    if (cloudinaryConfigured()) {
      const result = await uploadToCloudinary(buffer, mimeType, alt);
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 502 });
      }
      payload = { url: result.url, mimeType };
    } else {
      // DB fallback (used until Cloudinary keys are configured).
      if (buffer.byteLength > 2_500_000) {
        return Response.json(
          { error: "Image storage is not fully configured yet — this photo is too large to file. (Add Cloudinary keys.)" },
          { status: 400 },
        );
      }
      payload = { data: Buffer.from(buffer).toString("base64"), mimeType };
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
    if (!ALLOWED.includes(mimeType)) {
      return Response.json({ error: "Use a JPG, PNG, WebP or AVIF image." }, { status: 400 });
    }
    const data = match[2];
    if (data.length > MAX_LENGTH) {
      return Response.json({ error: "That image is too large. Keep it under 3 MB." }, { status: 400 });
    }
    alt = body?.alt ?? "";
    productId = body?.productId;
    payload = { data, mimeType };
  }

  const inserted = await getDb()
    .insert(productImages)
    .values({
      productId: productId ?? null,
      url: payload.url ?? null,
      data: payload.data ?? null,
      mimeType: payload.mimeType,
      alt,
      sortOrder: 0,
    })
    .returning();

  const image = inserted[0];
  return Response.json({ id: image.id, url: payload.url ?? `/api/images/${image.id}` });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not authorised" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: number } | null;
  if (!body?.id) return Response.json({ error: "Missing image id." }, { status: 400 });
  // DB-stored images are deleted outright; Cloudinary files are kept (they no
  // longer appear anywhere once the row is gone) which preserves any order
  // history that references the URL.
  await getDb().delete(productImages).where(eq(productImages.id, Number(body.id)));
  return Response.json({ ok: true });
}
