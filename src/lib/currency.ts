/**
 * Location-based pricing engine.
 * Every product stores one base price (USD); this module converts and presents
 * it in the buyer's local currency with market-appropriate rounding.
 */

export type CurrencyCode =
  | "NGN"
  | "USD"
  | "GBP"
  | "EUR"
  | "CAD"
  | "AUD"
  | "GHS"
  | "KES"
  | "ZAR"
  | "AED"
  | "SAR"
  | "INR"
  | "XOF"
  | "XAF";

export type Currency = {
  code: CurrencyCode;
  label: string;
  symbol: string;
  /** units of this currency per 1 USD */
  perUsd: number;
  /** round converted amounts to this step (0 = keep decimals) */
  step: number;
  decimals: number;
};

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  NGN: { code: "NGN", label: "Nigerian Naira", symbol: "₦", perUsd: 1550, step: 100, decimals: 0 },
  USD: { code: "USD", label: "US Dollar", symbol: "$", perUsd: 1, step: 1, decimals: 0 },
  GBP: { code: "GBP", label: "Pound Sterling", symbol: "£", perUsd: 0.78, step: 1, decimals: 0 },
  EUR: { code: "EUR", label: "Euro", symbol: "€", perUsd: 0.92, step: 1, decimals: 0 },
  CAD: { code: "CAD", label: "Canadian Dollar", symbol: "CA$", perUsd: 1.37, step: 1, decimals: 0 },
  AUD: { code: "AUD", label: "Australian Dollar", symbol: "A$", perUsd: 1.52, step: 1, decimals: 0 },
  GHS: { code: "GHS", label: "Ghanaian Cedi", symbol: "GH₵", perUsd: 15.5, step: 5, decimals: 0 },
  KES: { code: "KES", label: "Kenyan Shilling", symbol: "KSh", perUsd: 129, step: 10, decimals: 0 },
  ZAR: { code: "ZAR", label: "South African Rand", symbol: "R", perUsd: 18, step: 5, decimals: 0 },
  AED: { code: "AED", label: "UAE Dirham", symbol: "AED", perUsd: 3.67, step: 1, decimals: 0 },
  SAR: { code: "SAR", label: "Saudi Riyal", symbol: "SAR", perUsd: 3.75, step: 1, decimals: 0 },
  INR: { code: "INR", label: "Indian Rupee", symbol: "₹", perUsd: 88, step: 10, decimals: 0 },
  XOF: { code: "XOF", label: "West African CFA", symbol: "CFA", perUsd: 600, step: 50, decimals: 0 },
  XAF: { code: "XAF", label: "Central African CFA", symbol: "FCFA", perUsd: 600, step: 50, decimals: 0 },
};

export const CURRENCY_ORDER: CurrencyCode[] = [
  "NGN",
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "GHS",
  "XOF",
  "KES",
  "ZAR",
  "AED",
];

export type Region = {
  country: string;
  countryName: string;
  currency: CurrencyCode;
};

export const REGIONS: Record<string, Region> = {
  NG: { country: "NG", countryName: "Nigeria", currency: "NGN" },
  US: { country: "US", countryName: "United States", currency: "USD" },
  GB: { country: "GB", countryName: "United Kingdom", currency: "GBP" },
  CA: { country: "CA", countryName: "Canada", currency: "CAD" },
  AU: { country: "AU", countryName: "Australia", currency: "AUD" },
  IN: { country: "IN", countryName: "India", currency: "INR" },
  AE: { country: "AE", countryName: "United Arab Emirates", currency: "AED" },
  SA: { country: "SA", countryName: "Saudi Arabia", currency: "SAR" },
  ZA: { country: "ZA", countryName: "South Africa", currency: "ZAR" },
  KE: { country: "KE", countryName: "Kenya", currency: "KES" },
  GH: { country: "GH", countryName: "Ghana", currency: "GHS" },
};

const EURO_AREA = [
  "AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT",
  "LU", "MT", "NL", "PT", "SK", "SI", "ES", "AD", "MC", "SM", "VA", "ME",
];

const WEST_AFRICA = ["SN", "CI", "BF", "ML", "TG", "BJ", "NE", "GW", "TD"];

const CENTRAL_AFRICA = ["CM", "GA", "CG", "CF", "GQ", "TD"];

export function regionForCountry(code?: string | null): Region {
  const key = (code ?? "").toUpperCase();
  if (REGIONS[key]) return REGIONS[key];
  if (EURO_AREA.includes(key)) {
    return { country: key, countryName: "Euro area", currency: "EUR" };
  }
  if (WEST_AFRICA.includes(key)) {
    return { country: key, countryName: "West Africa", currency: "XOF" };
  }
  if (CENTRAL_AFRICA.includes(key)) {
    return { country: key, countryName: "Central Africa", currency: "XAF" };
  }
  return { country: "US", countryName: "United States", currency: "USD" };
}

export function currencyOf(code?: string | null): Currency {
  const key = (code ?? "").toUpperCase() as CurrencyCode;
  return CURRENCIES[key] ?? CURRENCIES.USD;
}

function roundTo(value: number, step: number) {
  if (!step) return value;
  return Math.round(value / step) * step;
}

export function groupThousands(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Convert a USD amount into the target currency, with market rounding. */
export function convert(usd: number, code: CurrencyCode) {
  const currency = currencyOf(code);
  const raw = usd * currency.perUsd;
  if (currency.step >= 1) return roundTo(raw, currency.step);
  return Math.round(raw * 100) / 100;
}

/** Format a USD base amount as local money, e.g. ₦45,000 */
export function formatFromUsd(usd: number, code: CurrencyCode) {
  const currency = currencyOf(code);
  const value = convert(usd, code);
  return `${currency.symbol}${groupThousands(value)}`;
}

/** Format an amount already expressed in the given currency. */
export function formatLocal(amount: number, code: CurrencyCode) {
  const currency = currencyOf(code);
  return `${currency.symbol}${groupThousands(amount)}`;
}

export function toUsd(amount: number, code: CurrencyCode) {
  const currency = currencyOf(code);
  return amount / currency.perUsd;
}

/* ------------------------------------------------------------------ */
/* Delivery                                                            */
/* ------------------------------------------------------------------ */

export type ShippingZone = "local" | "nigeria" | "west-africa" | "africa" | "europe" | "north-america" | "world";

export const FREE_SHIPPING_USD = 150;

export function shippingZone(country: string): ShippingZone {
  switch (country) {
    case "NG":
      return "nigeria";
    case "GH":
    case "BJ":
    case "TG":
    case "CI":
    case "NE":
    case "BF":
      return "west-africa";
    case "KE":
    case "ZA":
    case "CM":
    case "EG":
    case "TZ":
    case "UG":
      return "africa";
    case "GB":
    case "IE":
    case "FR":
    case "DE":
    case "IT":
    case "ES":
    case "NL":
    case "BE":
    case "AT":
    case "PT":
    case "SE":
    case "NO":
    case "DK":
    case "FI":
    case "CH":
      return "europe";
    case "US":
    case "CA":
      return "north-america";
    default:
      return "world";
  }
}

export const ZONE_LABELS: Record<ShippingZone, string> = {
  local: "Iwo pickup",
  nigeria: "Nationwide delivery",
  "west-africa": "West Africa",
  africa: "Rest of Africa",
  europe: "Europe",
  "north-america": "North America",
  world: "International",
};

export function shippingUsd(options: {
  country: string;
  fulfilment: "delivery" | "pickup";
  subtotalUsd: number;
}) {
  const { country, fulfilment, subtotalUsd } = options;
  if (fulfilment === "pickup") return 0;
  const zone = shippingZone(country);
  const base: Record<ShippingZone, number> = {
    local: 0,
    nigeria: 3,
    "west-africa": 14,
    africa: 18,
    europe: 24,
    "north-america": 26,
    world: 30,
  };
  const fee = base[zone];
  if (subtotalUsd >= FREE_SHIPPING_USD) return 0;
  return fee;
}

export function estimatedDelivery(zone: ShippingZone) {
  switch (zone) {
    case "nigeria":
      return "2 – 4 working days";
    case "west-africa":
      return "5 – 9 working days";
    case "africa":
      return "7 – 12 working days";
    case "europe":
      return "5 – 8 working days";
    case "north-america":
      return "6 – 9 working days";
    default:
      return "7 – 14 working days";
  }
}
