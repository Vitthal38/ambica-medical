/**
 * Customer-facing session helpers.
 *
 * Deliberately SEPARATE from the staff/admin session (src/lib/auth.ts):
 *   - Different cookie name (`ambica_cust_sess`) so a customer session can
 *     never be mistaken for a staff session, and vice-versa.
 *   - `SameSite=Lax` (not Strict) because customers legitimately arrive from
 *     external links (WhatsApp, email, SMS) and we want the session to survive
 *     that top-level navigation. CSRF on state-changing routes is enforced
 *     separately via the same-origin check.
 *   - Shorter-lived than staff sessions are long, but long enough to not nag a
 *     shopper mid-checkout.
 *
 * Shares the same AUTH_SECRET + entropy guard as the admin session — one secret
 * to manage, two cookie namespaces.
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'ambica_cust_sess';
const ALG = 'HS256';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const MIN_SECRET_LENGTH = 32;
const MIN_SECRET_ENTROPY_BITS = 96;

export interface CustomerSession extends JWTPayload {
  sub: string; // customer id
  name: string;
  /** Whichever identifier they registered with — for display only. */
  identifier: string;
}

function entropyBits(s: string): number {
  const counts = new Map<string, number>();
  for (const c of s) counts.set(c, (counts.get(c) ?? 0) + 1);
  let h = 0;
  for (const n of counts.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h * s.length;
}

let cachedSecret: Uint8Array | null = null;
function secret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set. Refusing to sign customer sessions.');
  if (s.length < MIN_SECRET_LENGTH) {
    throw new Error(`AUTH_SECRET too short (${s.length}); need ≥${MIN_SECRET_LENGTH} chars.`);
  }
  if (entropyBits(s) < MIN_SECRET_ENTROPY_BITS) {
    throw new Error('AUTH_SECRET has insufficient entropy.');
  }
  cachedSecret = new TextEncoder().encode(s);
  return cachedSecret;
}

export async function signCustomerSession(
  payload: Omit<CustomerSession, 'iat' | 'exp'>,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyCustomerSession(
  token: string | undefined,
): Promise<CustomerSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
    return payload as CustomerSession;
  } catch {
    return null;
  }
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const c = await cookies();
  return verifyCustomerSession(c.get(COOKIE_NAME)?.value);
}

export async function setCustomerSessionCookie(token: string): Promise<void> {
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearCustomerSessionCookie(): Promise<void> {
  const c = await cookies();
  c.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export { COOKIE_NAME as CUSTOMER_COOKIE_NAME, SESSION_TTL_SECONDS as CUSTOMER_SESSION_TTL_SECONDS };
