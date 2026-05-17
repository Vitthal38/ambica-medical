import { NextResponse } from 'next/server';
import { requireRole, jsonError } from '@/lib/api-auth';
import { getPrescriptionById } from '@/lib/services/prescriptions';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const p = await getPrescriptionById(id);
  if (!p) return jsonError('Prescription not found', 404);
  const { storageKey: _, ...safe } = p;
  return NextResponse.json({ prescription: safe });
}
