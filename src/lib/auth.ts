/**
 * JWT session helpers. Compact, edge-runtime compatible (uses `jose`).
 *
 *  - Sessions are signed JWTs stored in an httpOnly, SameSite=Lax cookie.
 *  - The middleware verifies the JWT signature on every /admin/* request.
 *  - Route handlers re-fetch the user from the DB before sensitive ops —
 *    defense in depth so a revoked user can't operate with a still-valid JWT.
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import type { Role } from './rbac';

const COOKIE_NAME = 'ambica_admin_sess';
const ALG = 'HS256';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export interface SessionPayload extends JWTPayload {
  sub: string;        // user id
  email: string;
  role: Role;
  name: string;
}

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing or too short. Set a 32+ char value in .env.',
    );
  }
  return new TextEncoder().encode(s);
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
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
