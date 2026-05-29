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

    // Clamp failedAttempts to [0, MAX_ATTEMPTS - 1] so staff cannot override
    // the retry cap upward, only reset it downward.
    const parsedMax = Number(process.env.MAX_REMINDER_ATTEMPTS ?? '3');
    const maxAttempts = Number.isInteger(parsedMax) && parsedMax > 0 ? parsedMax : 3;
    const updateData = {
      ...parsed.data,
      ...(parsed.data.failedAttempts !== undefined
        ? { failedAttempts: Math.min(parsed.data.failedAttempts, maxAttempts - 1) }
        : {}),
    };

    const reminder = await updateReminder(id, updateData);
    return NextResponse.json({ reminder });
  } catch (e) {
    return safeError(e, req, { route: 'reminders_update' });
  }
}
