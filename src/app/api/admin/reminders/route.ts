import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { reminderCreateSchema } from '@/features/admin/schemas';
import { parseJson, errResponse } from '@/lib/validate';
import { listDueReminders, createReminder } from '@/lib/services/reminders';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const daysAhead = Math.min(Math.max(Number(searchParams.get('daysAhead') ?? '7'), 1), 90);
  const rows = await listDueReminders(daysAhead);
  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  const parsed = await parseJson(req, reminderCreateSchema);
  if (!parsed.ok) return errResponse(parsed);

  const r = await createReminder(parsed.data);
  return NextResponse.json({ reminder: r }, { status: 201 });
}
