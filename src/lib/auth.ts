/**
 * JWT session helpers + cookie management. Edge-runtime compatible (uses `jose`).
 *
 * Security posture:
 *  - Sessions are HS256-signed JWTs stored in an HttpOnly, SameSite=Strict
 *    cookie. The cookie is never readable from JS.
 *  - The middleware verifies the JWT signature on every /admin/* request, but
 *    that alone is NOT enough — every sensitive route ALSO calls requireRole()
 *    which re-fetches the user record and checks `active`. This means a JWT
 *    issued to a now-deactivated user can't continue to operate.
 *  - SameSite=Strict is the right call for an admin app: there's no legitimate
 *    cross-site link into /admin/*. Pair with the Origin/Referer CSRF check
 *    (lib/security/csrf.ts) for defense in depth.
 *  - The AUTH_SECRET must be ≥32 chars AND have entropy. We compute a cheap
 *    Shannon-entropy estimate to reject "aaaaaaaa…" and similar.
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import type { Role } from './rbac';

const COOKIE_NAME = 'ambica_admin_sess';
const ALG = 'HS256';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const MIN_SECRET_LENGTH = 32;
const MIN_SECRET_ENTROPY_BITS = 96; // ≈ 16 base64url chars of random

export interface SessionPayload extends JWTPayload {
  sub: string; // user id
  email: string;
  role: Role;
  name: string;
}

/** Rough Shannon entropy in bits, summed across the string. */
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
  if (!s) {
    throw new Error('AUTH_SECRET is not set. Refusing to sign sessions.');
  }
  if (s.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET is too short (${s.length}). Need ≥${MIN_SECRET_LENGTH} chars. Generate with: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
    );
  }
  if (entropyBits(s) < MIN_SECRET_ENTROPY_BITS) {
    throw new Error(
      'AUTH_SECRET has insufficient entropy (looks repetitive). Use a cryptographically random value.',
    );
  }
  cachedSecret = new TextEncoder().encode(s);
  return cachedSecret;
}

export async function signSession(payload: Omit<SessionPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/** Server-component / route-handler helper — reads the cookie and verifies it. */
export async function getSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  return verifySession(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    // Strict — no cross-site reason to land on /admin/* with a valid cookie.
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const c = await cookies();
  // Explicit overwrite with empty value AND maxAge=0 so middleware sees the
  // cookie as gone immediately (some browsers cache .delete() inconsistently).
  c.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export { COOKIE_NAME, SESSION_TTL_SECONDS };
