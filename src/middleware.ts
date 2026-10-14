import { NextResponse, type NextRequest } from "next/server";

/**
 * Resolves the visitor's market on the server, before any HTML is rendered.
 * Doing this here means the storefront never has to re-render itself after
 * mount — which is what caused the flash on first load.
 */

const COOKIE = "morena_country";
const ONE_YEAR = 60 * 60 * 24 * 365;

const KNOWN = new Set([
  "NG", "US", "GB", "CA", "AU", "IN", "AE", "SA", "ZA", "KE", "GH",
  "AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV",
  "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES", "SN", "CI", "BF", "ML",
  "TG", "BJ", "NE", "GW", "TD", "CM", "GA", "CG", "CF", "GQ",
]);

function fromHeaders(request: NextRequest): string | null {
  const candidates = [
    request.headers.get("cf-ipcountry"),
    request.headers.get("x-vercel-ip-country"),
    request.headers.get("x-country-code"),
    request.headers.get("x-geo-country"),
  ];
  for (const candidate of candidates) {
    const code = (candidate ?? "").trim().toUpperCase();
    if (code.length === 2 && KNOWN.has(code)) return code;
  }
  return null;
}

/** Best-effort lookup for proxies that do not pass a country header. */
async function fromIp(request: NextRequest): Promise<string | null> {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded && forwarded !== "::1" && forwarded !== "127.0.0.1"
    ? forwarded
    : request.headers.get("x-real-ip");
  if (!ip) return null;

  try {
    const response = await fetch(`https://ipwho.is/${ip}?fields=country_code`, {
      signal: AbortSignal.timeout(1200),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { country_code?: string | null };
    const code = (data.country_code ?? "").toUpperCase();
    return code.length === 2 ? code : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const existing = request.cookies.get(COOKIE)?.value?.toUpperCase();

  // Resolve once, then keep it for a year. Never re-resolve on later requests.
  let country: string;
  if (existing && existing.length === 2) {
    country = existing;
  } else {
    country =
      fromHeaders(request) ??
      (await fromIp(request)) ??
      "NG"; // home market
  }

  const headers = new Headers(request.headers);
  headers.set("x-morena-country", country);

  const response = NextResponse.next({ request: { headers } });
  response.cookies.set(COOKIE, country, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  // Only run on page routes — skip assets, uploads and API calls.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)"],
};
