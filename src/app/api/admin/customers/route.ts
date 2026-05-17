/**
 * Customer list + create.
 *
 * Create can OPTIONALLY include initial medicine entries in a single Postgres
 * transaction (prevents half-written customers if medicine inserts fail).
 *
 * Every create is audited; the audit row carries the new customer id only —
 * NEVER the customer's name/phone/email (PHI hygiene).
 */
import { NextResponse } from 'next/server';
import { requireRole, jsonError } from '@/lib/api-auth';
import { customerCreateWithMedicinesSchema } from '@/features/admin/schemas';
import { parseJson, errResponse } from '@/lib/validate';
import {
  listCustomers,
  createCustomerWithMedicines,
} from '@/lib/services/customers';
import { audit } from '@/lib/audit';
import { safeError } from '@/lib/error-envelope';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const auth = await requireRole('PHARMACIST');
    if ('response' in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? undefined;
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '50'), 1), 200);
    const cursor = searchParams.get('cursor') ?? undefined;

    const data = await listCustomers({ q, limit, cursor });
    return NextResponse.json(data);
  } catch (e) {
    return safeError(e, req, { route: 'customers_list' });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireRole('PHARMACIST');
    if ('response' in auth) return auth.response;

    const parsed = await parseJson(req, customerCreateWithMedicinesSchema);
    if (!parsed.ok) return errResponse(parsed);

    const c = await createCustomerWithMedicines({
      ...parsed.data,
      medicines: parsed.data.medicines,
      createdById: auth.user.id,
    });

    await audit(
      { req, actor: auth.user },
      {
        action: 'CUSTOMER_CREATE',
        targetType: 'Customer',
        targetId: c.id,
        meta: { initialMedicineCount: parsed.data.medicines?.length ?? 0 },
      },
    );

    return NextResponse.json({ customer: c }, { status: 201 });
  } catch (e) {
    // Surface controlled validation errors specifically.
    if (e instanceof Error && e.message.startsWith('Unknown medicineId')) {
      return jsonError('One or more selected medicines could not be found.', 422);
    }
    return safeError(e, req, { route: 'customers_create' });
  }
}
