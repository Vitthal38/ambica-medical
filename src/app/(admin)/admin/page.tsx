/**
 * Admin dashboard home — quick stats + recent activity.
 * Server component so the data is rendered before paint with no client fetch.
 */
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { AdminCard } from '@/components/admin/ui';
import { Users, FileText, Package, Bell, ArrowRight } from 'lucide-react';
import { listDueReminders } from '@/lib/services/reminders';

export const dynamic = 'force-dynamic';

async function stats() {
  const [customers, prescriptions, orders, pendingReminders] = await Promise.all([
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.prescription.count(),
    prisma.order.count(),
    prisma.refillReminder.count({ where: { status: 'PENDING' } }),
  ]);
  return { customers, prescriptions, orders, pendingReminders };
}

async function recentCustomers() {
  return prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: { id: true, name: true, phone: true, createdAt: true },
  });
}

const CARDS = [
  { key: 'customers', label: 'Customers', icon: Users, href: '/admin/customers' },
  { key: 'prescriptions', label: 'Prescriptions', icon: FileText, href: '/admin/prescriptions' },
  { key: 'orders', label: 'Orders', icon: Package, href: '/admin/orders' },
  { key: 'pendingReminders', label: 'Refills due', icon: Bell, href: '/admin/reminders' },
] as const;

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default async function DashboardHome() {
  const [s, customers, due] = await Promise.all([
    stats(),
    recentCustomers(),
    listDueReminders(7),
  ]);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">Pharmacy CRM at a glance.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CARDS.map((c) => (
          <Link key={c.key} href={c.href}>
            <AdminCard className="p-5 transition-colors hover:border-zinc-700">
              <c.icon className="h-5 w-5 text-emerald-400" strokeWidth={1.75} />
              <p className="mt-3 text-3xl font-bold tabular-nums text-zinc-100">
                {s[c.key].toLocaleString('en-IN')}
              </p>
              <p className="text-xs uppercase tracking-widest text-zinc-500">{c.label}</p>
            </AdminCard>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <AdminCard className="p-6">
          <div className="flex items-end justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">Recent customers</h2>
            <Link
              href="/admin/customers"
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-zinc-800">
            {customers.length === 0 && (
              <li className="py-6 text-center text-xs text-zinc-500">No customers yet.</li>
            )}
            {customers.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3">
                <Link
                  href={`/admin/customers/${c.id}`}
                  className="text-sm text-zinc-100 hover:text-emerald-300"
                >
                  {c.name}
                </Link>
                <span className="text-xs tabular-nums text-zinc-500">+91 {c.phone}</span>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard className="p-6">
          <div className="flex items-end justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">Refills due · next 7 days</h2>
            <Link
              href="/admin/reminders"
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
            >
              All reminders <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-zinc-800">
            {due.length === 0 && (
              <li className="py-6 text-center text-xs text-zinc-500">Nothing coming up.</li>
            )}
            {due.slice(0, 6).map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/admin/customers/${r.customer.id}`}
                    className="text-sm text-zinc-100 hover:text-emerald-300"
                  >
                    {r.customer.name}
                  </Link>
                  <span className="text-xs tabular-nums text-amber-400">{fmtDate(r.dueOn)}</span>
                </div>
                <p className="text-xs text-zinc-500">
                  {r.medicine.brand} · {r.medicine.name}
                </p>
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>
    </div>
  );
}
