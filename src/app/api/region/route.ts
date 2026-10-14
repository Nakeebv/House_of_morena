export const dynamic = "force-dynamic";

type GeoPayload = { country?: string | null; country_code?: string | null };

async function lookup(ip: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  try {
    const response = await fetch(`https://ipwho.is/${ip}?fields=country_code`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as GeoPayload;
    const code = data.country_code;
    return typeof code === "string" && code.length === 2 ? code.toUpperCase() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const headers = request.headers;

  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip =
    forwarded && forwarded !== "::1" && forwarded !== "127.0.0.1"
      ? forwarded
      : headers.get("x-real-ip") ?? "";

  const headerCountry =
    headers.get("cf-ipcountry") ??
    headers.get("x-vercel-ip-country") ??
    headers.get("x-country-code");

  if (headerCountry && headerCountry.length === 2) {
    return Response.json({ country: headerCountry.toUpperCase(), source: "header" });
  }

  const resolved = ip ? await lookup(ip) : null;
  return Response.json({ country: resolved, source: resolved ? "ip" : "unknown" });
}
