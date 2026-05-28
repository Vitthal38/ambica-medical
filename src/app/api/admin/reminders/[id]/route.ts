import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { reminderUpdateSchema } from '@/features/admin/schemas';
import { parseJson, errResponse } from '@/lib/validate';
import { updateReminder, getReminderById } from '@/lib/services/reminders';
import { safeError } from '@/lib/error-envelope';

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  try {
    const { id } = await params;

    const parsed = await parseJson(req, reminderUpdateSchema);
    if (!parsed.ok) return errResponse(parsed);

    const existing = await getReminderById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Reminder not found.' }, { status: 404 });
    }

    const reminder = await updateReminder(id, parsed.data);
    return NextResponse.json({ reminder });
  } catch (e) {
    return safeError(e, req, { route: 'reminders_update' });
  }
}
