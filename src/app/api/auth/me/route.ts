/**
 * GET /api/auth/me — returns the signed-in customer (or 401).
 * Re-fetches the row so a session for a soft-deleted account can't keep acting.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCustomerSession } from '@/lib/customer-auth';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const customer = await prisma.customer.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, phone: true, deletedAt: true },
  });
  if (!customer || customer.deletedAt) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({
    customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
  });
}
