/**
 * Edit / delete a single medicine timeline entry.
 *
 * Scope-guarded: the entry must belong to the customer in the URL — otherwise
 * 404 (NOT 403, so we don't reveal whether the entry id exists for another
 * customer). Protects against ID-guessing attacks.
 *
 * Every change is audited; only field NAMES are recorded, never values
 * (dosage / notes can contain PHI).
 */
import { NextResponse } from 'next/server';
import { requireRole, jsonError } from '@/lib/api-auth';
import { medicineEntryUpdateSchema } from '@/features/admin/schemas';
import { parseJson, errResponse } from '@/lib/validate';
import {
  updateMedicineEntry,
  deleteMedicineEntry,
} from '@/lib/services/medicine-entries';
import { audit } from '@/lib/audit';
import { safeError } from '@/lib/error-envelope';

export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  try {
    const auth = await requireRole('PHARMACIST');
    if ('response' in auth) return auth.response;

    const { id: customerId, entryId } = await params;

    const parsed = await parseJson(req, medicineEntryUpdateSchema);
    if (!parsed.ok) return errResponse(parsed);

    const updated = await updateMedicineEntry(customerId, entryId, parsed.data);
    if (!updated) return jsonError('Entry not found for this customer', 404);

    await audit(
      { req, actor: auth.user },
      {
        action: 'MEDICINE_ENTRY_UPDATE',
        targetType: 'MedicineEntry',
        targetId: entryId,
        meta: { customerId, fieldsChanged: Object.keys(parsed.data) },
      },
    );
    return NextResponse.json({ entry: updated });
  } catch (e) {
    return safeError(e, req, { route: 'medicine_entry_patch' });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  try {
    const auth = await requireRole('PHARMACIST');
    if ('response' in auth) return auth.response;

    const { id: customerId, entryId } = await params;
    const ok = await deleteMedicineEntry(customerId, entryId);
    if (!ok) return jsonError('Entry not found for this customer', 404);

    await audit(
      { req, actor: auth.user },
      {
        action: 'MEDICINE_ENTRY_DELETE',
        targetType: 'MedicineEntry',
        targetId: entryId,
        meta: { customerId },
      },
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return safeError(e, req, { route: 'medicine_entry_delete' });
  }
}
