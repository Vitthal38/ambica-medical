import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { reminderCreateSchema } from '@/features/admin/schemas';
import { parseJson, errResponse } from '@/lib/validate';
import { listReminders, createReminder, countExhaustedReminders } from '@/lib/services/reminders';
import { safeError } from '@/lib/error-envelope';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') ?? 'ALL') as
      | 'PENDING'
      | 'SENT'
      | 'FULFILLED'
      | 'DISMISSED'
      | 'ALL';
    const q = searchParams.get('q') ?? undefined;
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;
    const daysAhead = searchParams.has('daysAhead')
      ? Math.min(Math.max(Number(searchParams.get('daysAhead')), 1), 365)
      : undefined;
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '50'), 1), 200);
    const cursor = searchParams.get('cursor') ?? undefined;

    const maxAttempts = Number(process.env.MAX_REMINDER_ATTEMPTS ?? '3');
    const [result, exhaustedCount] = await Promise.all([
      listReminders({ status, q, from, to, daysAhead, limit, cursor }),
      countExhaustedReminders(maxAttempts),
    ]);
    return NextResponse.json({ ...result, exhaustedCount, maxAttempts });
  } catch (e) {
    return safeError(e, req, { route: 'reminders_list' });
  }
}

export async function POST(req: Request) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  try {
    const parsed = await parseJson(req, reminderCreateSchema);
    if (!parsed.ok) return errResponse(parsed);

    const r = await createReminder(parsed.data);
    return NextResponse.json({ reminder: r }, { status: 201 });
  } catch (e) {
    return safeError(e, req, { route: 'reminders_create' });
  }
}
