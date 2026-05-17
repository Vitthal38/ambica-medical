import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireRole, jsonError } from '@/lib/api-auth';
import { medicineEntryCreateSchema } from '@/features/admin/schemas';
import { parseJson, errResponse } from '@/lib/validate';
import {
  createMedicineEntry,
  listMedicineEntries,
} from '@/lib/services/medicine-entries';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const rows = await listMedicineEntries({ customerId: id });
  return NextResponse.json({ rows });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const { id: customerId } = await params;

  // Confirm customer exists & isn't soft-deleted before we accept entries.
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) return jsonError('Customer not found', 404);

  const parsed = await parseJson(req, medicineEntryCreateSchema);
  if (!parsed.ok) return errResponse(parsed);

  try {
    const entry = await createMedicineEntry({
      customerId,
      ...parsed.data,
      recordedById: auth.user.id,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      return jsonError('Unknown medicine', 422);
    }
    throw e;
  }
}
