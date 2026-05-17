import { NextResponse } from 'next/server';
import { requireRole, jsonError } from '@/lib/api-auth';
import { medicineEntryUpdateSchema } from '@/features/admin/schemas';
import { parseJson, errResponse } from '@/lib/validate';
import {
  updateMedicineEntry,
  deleteMedicineEntry,
} from '@/lib/services/medicine-entries';

export const runtime = 'nodejs';

/**
 * PATCH /api/admin/customers/:id/medicine-entries/:entryId
 * Update a single timeline entry — partial body.
 *
 * Scoped: the entry must belong to the customer in the URL; otherwise 404.
 * This prevents someone from editing entries they aren't permitted to see.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const { id: customerId, entryId } = await params;

  const parsed = await parseJson(req, medicineEntryUpdateSchema);
  if (!parsed.ok) return errResponse(parsed);

  const updated = await updateMedicineEntry(customerId, entryId, parsed.data);
  if (!updated) return jsonError('Entry not found for this customer', 404);
  return NextResponse.json({ entry: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const { id: customerId, entryId } = await params;
  const ok = await deleteMedicineEntry(customerId, entryId);
  if (!ok) return jsonError('Entry not found for this customer', 404);
  return NextResponse.json({ ok: true });
}
