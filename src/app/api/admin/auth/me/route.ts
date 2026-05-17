import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;
  return NextResponse.json({ user: auth.user });
}
