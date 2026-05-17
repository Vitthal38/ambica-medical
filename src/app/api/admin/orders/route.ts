import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { orderCreateSchema } from '@/features/admin/schemas';
import { parseJson, errResponse } from '@/lib/validate';
import { listOrders, createOrder } from '@/lib/services/orders';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('customerId') ?? undefined;
  const limit = Number(searchParams.get('limit') ?? '50');

  const rows = await listOrders({ customerId, limit });
  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const parsed = await parseJson(req, orderCreateSchema);
  if (!parsed.ok) return errResponse(parsed);

  const order = await createOrder({ ...parsed.data, createdById: auth.user.id });
  return NextResponse.json({ order }, { status: 201 });
}
