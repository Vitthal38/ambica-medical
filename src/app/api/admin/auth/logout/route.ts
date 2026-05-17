/**
 * Sign-out handler.
 *
 *  - Clears the session cookie unconditionally (idempotent — fine to call
 *    even with no/invalid session).
 *  - Audits the logout if we can identify the actor BEFORE clearing.
 *  - Returns a 303 redirect to the public storefront so the browser navigates
 *    away from /admin/* rather than rendering a JSON blob.
 *  - 303 (See Other) tells the browser to GET the Location after a POST.
 */
import { NextResponse } from 'next/server';
import { clearSessionCookie, getSession } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // Capture identity BEFORE we clear the cookie so the audit row has an actor.
  const session = await getSession();

  await clearSessionCookie();

  if (session) {
    await audit(
      { req, actor: { id: String(session.sub), email: session.email } },
      { action: 'LOGOUT', targetType: 'User', targetId: String(session.sub) },
    );
  }

  const storefront = new URL('/', req.url);
  return NextResponse.redirect(storefront, 303);
}
