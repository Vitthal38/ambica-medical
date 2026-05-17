import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { searchMedicines } from '@/lib/services/medicine-entries';

export const runtime = 'nodejs';

/**
 * Lightweight medicine catalog search for the quick-add autocomplete.
 *  GET /api/admin/medicines?q=para  → top 20 matches
 */
export async function GET(req: Request) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const limit = Number(searchParams.get('limit') ?? '20');

  const rows = await searchMedicines(q, limit);
  return NextResponse.json({ rows });
}
