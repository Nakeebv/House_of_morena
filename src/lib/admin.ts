import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "morena_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12; // one working day

/** In-memory throttle on login attempts, keyed by IP. */
const attempts = new Map<string, { count: number; blockedUntil: number }>();
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 6;
const BLOCK_MS = 15 * 60 * 1000; // 15 minutes

function adminPassword() {
  const value = process.env.ADMIN_PASSWORD;
  // No hardcoded default: an unset ADMIN_PASSWORD simply cannot sign in.
  return value && value.trim().length > 0 ? value : null;
}

function secret() {
  return process.env.ADMIN_SESSION_SECRET ?? "";
}

/* ------------------------------------------------------------------ */
/* Password                                                            */
/* ------------------------------------------------------------------ */

export function checkPassword(input: string) {
  const expected = adminPassword();
  if (!expected) return false;
  const a = typeof input === "string" ? Buffer.from(input) : Buffer.alloc(expected.length);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/* ------------------------------------------------------------------ */
/* Rate limiting                                                       */
/* ------------------------------------------------------------------ */

export function throttle(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);

  if (entry && entry.blockedUntil > now) {
    return {
      allowed: false,
      retryInMinutes: Math.ceil((entry.blockedUntil - now) / 60000),
    };
  }

  if (!entry || now - entry.blockedUntil > WINDOW_MS) {
    attempts.set(key, { count: 0, blockedUntil: 0 });
  }
  return { allowed: true, retryInMinutes: 0 };
}

export function recordFailure(key: string) {
  const entry = attempts.get(key) ?? { count: 0, blockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = Date.now() + BLOCK_MS;
    entry.count = 0;
  }
  attempts.set(key, entry);
}

export function clearFailures(key: string) {
  attempts.delete(key);
}

/* ------------------------------------------------------------------ */
/* Session tokens                                                      */
/* ------------------------------------------------------------------ */

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

/**
 * Issues a fresh token per sign-in: a random nonce carrying its own issue
 * time, signed with the server secret. Each session is unique, expires on its
 * own, and is invalidated the moment the secret or password changes.
 */
export function issueToken() {
  const nonce = crypto.randomBytes(24).toString("base64url");
  const issuedAt = Date.now().toString(36);
  const payload = `${nonce}.${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined) {
  if (!token || !secret()) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [nonce, issuedAt, signature] = parts;
  if (!nonce || !issuedAt || !signature) return false;

  const expected = sign(`${nonce}.${issuedAt}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;

  const issued = parseInt(issuedAt, 36);
  if (!Number.isFinite(issued)) return false;
  return Date.now() - issued < MAX_AGE_SECONDS * 1000;
}

export async function isAdmin() {
  const store = await cookies();
  return verifyToken(store.get(COOKIE_NAME)?.value);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    // strict: the admin cookie is never sent on cross-site requests, which
    // takes CSRF off the table for every admin mutation.
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export const ADMIN_COOKIE = COOKIE_NAME;
