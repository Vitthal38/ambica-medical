import { listReminders } from '@/lib/services/reminders';
import RemindersClient from './RemindersClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function RemindersPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  // Read initial filters from URL so deep-links / bookmarks work
  const status = (sp.status ?? 'ALL') as 'PENDING' | 'SENT' | 'FULFILLED' | 'DISMISSED' | 'ALL';
  const q = sp.q ?? undefined;
  const daysAhead = sp.daysAhead ? Number(sp.daysAhead) : undefined;

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
    />
  );
}
