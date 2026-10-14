import { cookies, headers } from "next/headers";
import {
  ADMIN_COOKIE,
  checkPassword,
  clearFailures,
  cookieOptions,
  issueToken,
  recordFailure,
  throttle,
} from "@/lib/admin";

export const dynamic = "force-dynamic";

function clientKey(headerList: Headers) {
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "local"
  );
}

export async function POST(request: Request) {
  const headerList = await headers();
  const key = clientKey(headerList);

  const gate = throttle(key);
  if (!gate.allowed) {
    return Response.json(
      { error: `Too many attempts. Try again in ${gate.retryInMinutes} minute(s).` },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = typeof body?.password === "string" ? body.password : "";

  if (!checkPassword(password)) {
    recordFailure(key);
    return Response.json({ error: "That password is not right." }, { status: 401 });
  }

  clearFailures(key);

  const store = await cookies();
  store.set(ADMIN_COOKIE, issueToken(), cookieOptions());

  return Response.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.set(ADMIN_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  return Response.json({ ok: true });
}
