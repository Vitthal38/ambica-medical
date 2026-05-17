/**
 * CSRF defense for the admin APIs.
 *
 * Strategy: Origin / Referer header check.
 *
 * Why this works for our threat model:
 *  - Modern browsers always send `Origin` on POST/PATCH/DELETE/PUT (and on GET
 *    cross-origin too in most cases).
 *  - An attacker site cannot forge `Origin` from JS.
 *  - JWT sits in an HttpOnly cookie → JS can't read it to use a custom header.
 *  - SameSite=Strict on the cookie is the OTHER half (set in lib/auth.ts).
 *    Origin check is belt-and-braces — protects pre-Same-Site browsers and
 *    edge cases like top-level form-POST CSRF.
 *
 * `Sec-Fetch-Site: same-origin` is an even stronger signal but not on all
 * browsers — we accept it when present, fall back to Origin/Referer otherwise.
 *
 * Routes that should be CSRF-protected:
 *   - Every state-changing method (POST/PATCH/PUT/DELETE) under /api/admin/*
 *   - EXCEPT /api/admin/auth/login (the form posts before a session exists,
 *     and rate-limit + bcrypt are the brute-force defense there).
 *
 * Returns:
 *   - null  → request is safe to proceed
 *   - NextResponse(403) → reject with audit-friendly error envelope
 */
import { NextResponse } from 'next/server';

const STATE_CHANGING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export function csrfCheck(req: Request): NextResponse | null {
  if (!STATE_CHANGING.has(req.method)) return null;

  // sec-fetch-site is the cleanest signal — short-circuit when present.
  const sfs = req.headers.get('sec-fetch-site');
  if (sfs) {
    if (sfs === 'same-origin' || sfs === 'same-site' || sfs === 'none') return null;
    return reject('Cross-site request rejected.');
  }

  // Fallback: compare Origin / Referer against the host header.
  const host = req.headers.get('host');
  if (!host) return reject('Missing host.');
  const expected = new Set([
    `http://${host}`,
    `https://${host}`,
  ]);

  const origin = req.headers.get('origin');
  if (origin) return expected.has(origin) ? null : reject('Origin mismatch.');

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      const r = new URL(referer);
      const refOrigin = `${r.protocol}//${r.host}`;
      return expected.has(refOrigin) ? null : reject('Referer mismatch.');
    } catch {
      return reject('Bad referer.');
    }
  }

  // No Origin and no Referer on a state-changing request — refuse.
  return reject('Cross-site protection failed.');
}

function reject(detail: string): NextResponse {
  return NextResponse.json(
    { error: 'Cross-site request rejected.', code: 'CSRF', detail },
    { status: 403 },
  );
}
