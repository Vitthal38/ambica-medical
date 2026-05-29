import { listReminders } from '@/lib/services/reminders';
import RemindersClient from './RemindersClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

const ALLOWED_STATUSES = new Set(['PENDING', 'SENT', 'FULFILLED', 'DISMISSED', 'ALL']);

export default async function RemindersPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  // Validate status — reject unknown values to avoid passing garbage to the DB
  const rawStatus = sp.status ?? 'ALL';
  const status = ALLOWED_STATUSES.has(rawStatus)
    ? (rawStatus as 'PENDING' | 'SENT' | 'FULFILLED' | 'DISMISSED' | 'ALL')
    : 'ALL';

  const q = sp.q?.trim() || undefined;

  // Validate daysAhead — must be a positive finite integer
  const rawDaysAhead = sp.daysAhead ? Number(sp.daysAhead) : undefined;
  const daysAhead =
    rawDaysAhead !== undefined && Number.isFinite(rawDaysAhead) && rawDaysAhead > 0
      ? rawDaysAhead
      : undefined;

  const { rows, nextCursor } = await listReminders({
    status,
    q,
    daysAhead,
    limit: 50,
  });

  // Serialize dates to strings for the client component
  const serialized = rows.map((r) => ({
    ...r,
    dueOn: r.dueOn instanceof Date ? r.dueOn.toISOString() : r.dueOn,
    sentAt: r.sentAt instanceof Date ? r.sentAt.toISOString() : r.sentAt,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  }));

  return (
    <RemindersClient
      initialRows={serialized as Parameters<typeof RemindersClient>[0]['initialRows']}
      initialNextCursor={nextCursor}
      initialQ={q ?? ''}
      initialStatusFilter={status}
    />
  );
}
