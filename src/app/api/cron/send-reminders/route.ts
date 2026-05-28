/**
 * Daily cron: dispatch notifications for all reminders due today (or overdue)
 * that have a channel configured (not NONE).
 *
 * Caller: Vercel Cron Jobs (vercel.json), or any external scheduler.
 * Auth  : Bearer CRON_SECRET header — NOT the admin JWT session cookie.
 *
 * Schedule: 0 9 * * *  (daily at 09:00 UTC ≈ 14:30 IST)
 *
 * To test manually:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://your-domain.com/api/cron/send-reminders
 */

import { NextResponse } from 'next/server';
import { listReminders, setReminderStatus } from '@/lib/services/reminders';
import { dispatchReminderNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const BATCH_SIZE = Number(process.env.CRON_BATCH_SIZE ?? '50');

export async function GET(req: Request) {
  // Verify cron secret — prevents public invocation
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.warn('cron.send_reminders.no_secret', {});
    return NextResponse.json({ error: 'Cron not configured.' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // Query reminders due today or overdue, with a channel configured
  const today = new Date();
  today.setHours(23, 59, 59, 999); // end of today

  const { rows } = await listReminders({
    status: 'PENDING',
    to: today,
    limit: BATCH_SIZE,
  });

  // Filter to only reminders with a real channel set
  const actionable = rows.filter((r) => r.channel !== 'NONE');

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const reminder of actionable) {
    try {
      const result = await dispatchReminderNotification({
        customer: {
          name: reminder.customer.name,
          phone: reminder.customer.phone,
        },
        medicine: {
          name: reminder.medicine.name,
          brand: reminder.medicine.brand,
        },
        channel: reminder.channel as 'SMS' | 'WHATSAPP' | 'EMAIL',
      });

      if (result.status === 'skipped') {
        skipped++;
        logger.warn('cron.reminder.skipped', { reminderId: reminder.id, reason: result.reason });
      } else {
        await setReminderStatus(reminder.id, 'SENT');
        sent++;
        logger.info('cron.reminder.sent', { reminderId: reminder.id, channel: result.channel });
      }
    } catch (err) {
      failed++;
      logger.warn('cron.reminder.failed', { reminderId: reminder.id, error: String(err) });
    }
  }

  logger.info('cron.send_reminders.complete', {
    total: actionable.length,
    sent,
    skipped,
    failed,
  });

  return NextResponse.json({ sent, skipped, failed, total: actionable.length });
}
