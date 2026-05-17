import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireRole, jsonError } from '@/lib/api-auth';
import { customerCreateWithMedicinesSchema } from '@/features/admin/schemas';
import { parseJson, errResponse } from '@/lib/validate';
import {
  listCustomers,
  createCustomerWithMedicines,
} from '@/lib/services/customers';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? undefined;
  const limit = Number(searchParams.get('limit') ?? '50');
  const cursor = searchParams.get('cursor') ?? undefined;

  const data = await listCustomers({ q, limit, cursor });
  return NextResponse.json(data);
}

/**
 * Create a customer. Optionally also record initial medicine entries in the
 * SAME Postgres transaction — used by the "Add customer" form when staff want
 * to log medicines without a separate prescription upload.
 *
 * Body shape (medicines is optional):
 *   { name, phone, email?, dob?, address?, notes?, medicines?: MedicineEntry[] }
 */
export async function POST(req: Request) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const parsed = await parseJson(req, customerCreateWithMedicinesSchema);
  if (!parsed.ok) return errResponse(parsed);

  try {
    const c = await createCustomerWithMedicines({
      ...parsed.data,
      medicines: parsed.data.medicines,
      createdById: auth.user.id,
    });
    return NextResponse.json({ customer: c }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        return jsonError('A customer with this phone already exists', 409);
      }
      if (e.code === 'P2003') {
        return jsonError('One of the selected medicines could not be found', 422);
      }
    }
    if (e instanceof Error && e.message.startsWith('Unknown medicineId')) {
      return jsonError(e.message, 422);
    }
    throw e;
  }
}
