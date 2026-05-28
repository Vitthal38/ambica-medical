/**
 * Daily cron: dispatch notifications for all reminders due today (or overdue)
 * that have a channel configured (not NONE) and have not exhausted retries.
 *
 * Caller: Vercel Cron Jobs (vercel.json), or any external scheduler.
 * Auth  : Bearer CRON_SECRET header — NOT the admin JWT session cookie.
 *
 * Retry policy:
 *   - On provider exception (network error, 4xx/5xx from Resend etc.):
 *       failedAttempts increments; reminder stays PENDING.
 *   - When failedAttempts >= MAX_REMINDER_ATTEMPTS (default 3):
 *       reminder is excluded from future cron runs.
 *       Staff can manually reset by editing the reminder in the dashboard.
 *
 * Schedule: 0 9 * * *  (daily at 09:00 UTC ≈ 14:30 IST)
 *
 * To test manually:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://your-domain.com/api/cron/send-reminders
 */

import { NextResponse } from 'next/server';
import { listReminders, setReminderStatus, incrementFailedAttempts } from '@/lib/services/reminders';
import { dispatchReminderNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const BATCH_SIZE = Number(process.env.CRON_BATCH_SIZE ?? '50');
const MAX_ATTEMPTS = Number(process.env.MAX_REMINDER_ATTEMPTS ?? '3');

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

  // Query: PENDING reminders due today or overdue, channel set, under retry cap
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const { rows } = await listReminders({
    status: 'PENDING',
    to: today,
    failedAttemptsBefore: MAX_ATTEMPTS, // exclude exhausted reminders
    limit: BATCH_SIZE,
  });

  // Only dispatch reminders that have an actual channel configured
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
          email: reminder.customer.email,
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
      // Increment failedAttempts; reminder stays PENDING for next run
      // until failedAttempts reaches MAX_ATTEMPTS, then cron excludes it
      await incrementFailedAttempts(reminder.id).catch(() => undefined);
      logger.warn('cron.reminder.failed', {
        reminderId: reminder.id,
        error: String(err),
        failedAttempts: reminder.failedAttempts + 1,
        maxAttempts: MAX_ATTEMPTS,
      });
    }
  }

  logger.info('cron.send_reminders.complete', {
    total: actionable.length,
    sent,
    skipped,
    failed,
    maxAttempts: MAX_ATTEMPTS,
  });

  return NextResponse.json({ sent, skipped, failed, total: actionable.length });
}
