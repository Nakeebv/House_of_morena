import { cookies, headers } from "next/headers";
import { REGIONS, regionForCountry, type Region } from "./currency";

export const REGION_COUNTRY_COOKIE = "morena_country";

/**
 * Resolves the buyer's market. The middleware has already stamped the country
 * into the request, so this is a pure read — no client-side detection, no
 * re-render, no flash.
 */
export async function getRegion(): Promise<Region> {
  const [store, headerList] = await Promise.all([cookies(), headers()]);

  const fromHeader = headerList.get("x-morena-country");
  if (fromHeader && fromHeader.length === 2) {
    return regionForCountry(fromHeader);
  }

  const raw = store.get(REGION_COUNTRY_COOKIE)?.value;
  if (raw) return regionForCountry(raw);

  return REGIONS.NG;
}
