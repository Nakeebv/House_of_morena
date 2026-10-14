import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { getSettings, saveSettings, type StoreSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Not authorised" }, { status: 401 });
  return Response.json({ ok: true, settings: await getSettings() });
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not authorised" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Invalid request body." }, { status: 400 });

  const entries: StoreSettings = {};
  for (const key of ["bank_name", "account_name", "account_number"] as const) {
    const value = body[key];
    if (typeof value === "string") entries[key] = value;
  }

  if (typeof entries.account_number === "string" && !/^[\d\s-]{6,20}$/.test(entries.account_number)) {
    return Response.json({ error: "Account number should be 6–20 digits." }, { status: 400 });
  }

  await saveSettings(entries);
  revalidatePath("/admin/settings");
  return Response.json({ ok: true });
}
