import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireRole, jsonError } from '@/lib/api-auth';
import { customerUpdateSchema } from '@/features/admin/schemas';
import { parseJson, errResponse } from '@/lib/validate';
import {
  getCustomerById,
  updateCustomer,
  softDeleteCustomer,
} from '@/lib/services/customers';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const c = await getCustomerById(id);
  if (!c) return jsonError('Customer not found', 404);
  return NextResponse.json({ customer: c });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const parsed = await parseJson(req, customerUpdateSchema);
  if (!parsed.ok) return errResponse(parsed);

  const { id } = await params;
  try {
    const c = await updateCustomer(id, parsed.data);
    return NextResponse.json({ customer: c });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') return jsonError('Customer not found', 404);
      if (e.code === 'P2002') return jsonError('Phone already in use', 409);
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('MANAGER'); // tighter — only managers can delete
  if ('response' in auth) return auth.response;

  const { id } = await params;
  try {
    await softDeleteCustomer(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return jsonError('Customer not found', 404);
    }
    throw e;
  }
}
