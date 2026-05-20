/**
 * POST /api/auth/logout — clears the customer session cookie.
 * Works even from an expired session (idempotent).
 */
import { NextResponse } from 'next/server';
import { clearCustomerSessionCookie, getCustomerSession } from '@/lib/customer-auth';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getCustomerSession().catch(() => null);
  await clearCustomerSessionCookie();
  if (session) {
    await audit(
      { req, actor: null },
      { action: 'CUSTOMER_LOGOUT', targetType: 'Customer', targetId: session.sub },
    ).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
