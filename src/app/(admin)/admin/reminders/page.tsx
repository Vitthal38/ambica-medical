import Link from 'next/link';
import { Bell } from 'lucide-react';
import { AdminBadge, AdminCard } from '@/components/admin/ui';
import { listDueReminders } from '@/lib/services/reminders';

export const dynamic = 'force-dynamic';

function daysFromNow(d: Date) {
  const diffMs = new Date(d).getTime() - Date.now();
  return Math.round(diffMs / 86_400_000);
}

export default async function RemindersPage() {
  const rows = await listDueReminders(30);

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100">Refill reminders</h1>
      <p className="mt-1 text-sm text-zinc-400">Due within the next 30 days.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.length === 0 && (
          <AdminCard className="col-span-full p-10 text-center text-sm text-zinc-500">
            <Bell className="mx-auto h-6 w-6 text-zinc-700" />
            <p className="mt-3">No refills due right now.</p>
          </AdminCard>
        )}
        {rows.map((r) => {
          const days = daysFromNow(r.dueOn);
          const tone = days <= 1 ? 'danger' : days <= 7 ? 'warning' : 'info';
          return (
            <AdminCard key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/admin/customers/${r.customer.id}`}
                  className="font-medium text-zinc-100 hover:text-emerald-300"
                >
                  {r.customer.name}
                </Link>
                <AdminBadge tone={tone}>
                  {days <= 0 ? 'Overdue' : `${days}d`}
                </AdminBadge>
              </div>
              <p className="mt-2 text-sm text-zinc-300">
                {r.medicine.brand} · {r.medicine.name}
              </p>
              <p className="mt-1 text-xs tabular-nums text-zinc-500">+91 {r.customer.phone}</p>
              {r.message && (
                <p className="mt-2 rounded bg-zinc-900 px-2 py-1.5 text-xs text-zinc-400">
                  {r.message}
                </p>
              )}
            </AdminCard>
          );
        })}
      </div>
    </div>
  );
}
