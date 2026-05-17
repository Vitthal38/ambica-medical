import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * Sign-out handler.
 *
 * The Sign-out button in the sidebar is a plain HTML <form> POST (no JS).
 * Clear the session cookie, then 303-redirect to the public storefront so
 * the browser navigates away from /admin/* instead of rendering a JSON blob.
 *
 * 303 (See Other) is the right status here: it tells the browser to GET the
 * Location after a POST. 302 would also work in practice but 303 is precise.
 */
export async function POST(req: Request) {
  await clearSessionCookie();
  const storefront = new URL('/', req.url);
  return NextResponse.redirect(storefront, 303);
}
