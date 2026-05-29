import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getReminderById, setReminderStatus } from '@/lib/services/reminders';
import { dispatchReminderNotification } from '@/lib/notifications';
import { safeError } from '@/lib/error-envelope';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('PHARMACIST');
  if ('response' in auth) return auth.response;

  try {
    const { id } = await params;

    const reminder = await getReminderById(id);
    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found.' }, { status: 404 });
    }
    if (reminder.channel === 'NONE') {
      return NextResponse.json(
        { error: 'Set a notification channel (SMS / WhatsApp / Email) before sending.' },
        { status: 400 },
      );
    }
    if (reminder.status === 'FULFILLED') {
      return NextResponse.json({ error: 'Reminder is already marked as completed.' }, { status: 400 });
    }

    const result = await dispatchReminderNotification({
      customer: {
        name: reminder.customer.name,
        phone: reminder.customer.phone,
        email: reminder.customer.email,
      },
      medicine: {
        name: reminder.medicine.name,
        brand: reminder.medicine.brand,
      },
      channel: reminder.channel as 'SMS' | 'WHATSAPP' | 'EMAIL',
      customMessage: reminder.message,
    });

    // Mark as SENT if the dispatch actually went out (not skipped)
    if (result.status !== 'skipped') {
      await setReminderStatus(id, 'SENT');
    }

    return NextResponse.json({ result });
  } catch (e) {
    return safeError(e, req, { route: 'reminders_notify' });
  }
}
