import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { SITE } from "@/lib/site";

/**
 * Seller-editable store settings, stored in the database and changed from the
 * admin panel — no redeploy needed. Keys are snake_case strings.
 */

export const SETTING_KEYS = ["bank_name", "account_name", "account_number"] as const;

export type StoreSettings = Partial<Record<(typeof SETTING_KEYS)[number], string>>;

export async function getSettings(): Promise<StoreSettings> {
  const rows = await getDb().select().from(settings);
  const map: StoreSettings = {};
  for (const row of rows) {
    if ((SETTING_KEYS as readonly string[]).includes(row.key) && row.value) {
      map[row.key as keyof StoreSettings] = row.value;
    }
  }
  return map;
}

export async function saveSettings(entries: StoreSettings) {
  const clean = Object.entries(entries).filter(
    ([key, value]) =>
      (SETTING_KEYS as readonly string[]).includes(key) && typeof value === "string" && value.trim(),
  ) as [(typeof SETTING_KEYS)[number], string][];

  for (const [key, value] of clean) {
    await getDb()
      .insert(settings)
      .values({ key, value: value.trim(), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: value.trim(), updatedAt: new Date() },
      });
  }
}

/** Bank details with the site defaults as fallback, for the pay page. */
export async function getBankDetails() {
  const stored = await getSettings();
  return {
    bank: stored.bank_name || SITE.bankDetails.bank,
    accountName: stored.account_name || SITE.bankDetails.accountName,
    accountNumber: stored.account_number || SITE.bankDetails.accountNumber,
  };
}
