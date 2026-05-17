/**
 * Single-customer endpoints.
 *
 *  - GET: read profile + nested data (prescriptions, orders, etc.) for the
 *    customer detail page. Audited as a CUSTOMER_VIEW event because the
 *    response contains PHI.
 *  - PATCH: partial update of mutable fields (mass-assignment-safe via the
 *    strict Zod schema). Audited.
 *  - DELETE: soft delete only — preserves the row for compliance. Requires
 *    MANAGER role (tighter than PHARMACIST). Audited.
 */
import { NextResponse } from 'next/server';
import { requireRole, jsonError } from '@/lib/api-auth';
import { customerUpdateSchema } from '@/features/admin/schemas';
import { parseJson, errResponse } from '@/lib/validate';
import {
  getCustomerById,
  updateCustomer,
  softDeleteCustomer,
} from '@/lib/services/customers';
import { audit } from '@/lib/audit';
import { safeError } from '@/lib/error-envelope';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole('PHARMACIST');
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const c = await getCustomerById(id);
    if (!c) return jsonError('Customer not found', 404);

    await audit(
      { req, actor: auth.user },
      { action: 'CUSTOMER_VIEW', targetType: 'Customer', targetId: c.id },
    );

    return NextResponse.json({ customer: c });
  } catch (e) {
    return safeError(e, req, { route: 'customer_get' });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole('PHARMACIST');
    if ('response' in auth) return auth.response;

    const parsed = await parseJson(req, customerUpdateSchema);
    if (!parsed.ok) return errResponse(parsed);

    const { id } = await params;
    const c = await updateCustomer(id, parsed.data);

    await audit(
      { req, actor: auth.user },
      {
        action: 'CUSTOMER_UPDATE',
        targetType: 'Customer',
        targetId: id,
        // Only field NAMES (not values) — values may contain PHI.
        meta: { fieldsChanged: Object.keys(parsed.data) },
      },
    );
    return NextResponse.json({ customer: c });
  } catch (e) {
    return safeError(e, req, { route: 'customer_patch' });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Tighter — only managers can delete. Defense against insider risk.
    const auth = await requireRole('MANAGER');
    if ('response' in auth) return auth.response;

    const { id } = await params;
    await softDeleteCustomer(id);

    await audit(
      { req, actor: auth.user },
      { action: 'CUSTOMER_DELETE', targetType: 'Customer', targetId: id },
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return safeError(e, req, { route: 'customer_delete' });
  }
}
