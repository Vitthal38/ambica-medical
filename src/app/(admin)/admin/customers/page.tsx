import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AdminButton, AdminCard } from '@/components/admin/ui';
import { listCustomers } from '@/lib/services/customers';
import { CustomerSearch } from './CustomerSearch';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const { rows } = await listCustomers({ q, limit: 100 });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Customers</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {rows.length} {rows.length === 1 ? 'customer' : 'customers'}
            {q ? ` matching "${q}"` : ''}
          </p>
        </div>
        <Link href="/admin/customers/new">
          <AdminButton>
            <Plus className="h-4 w-4" /> Add customer
          </AdminButton>
        </Link>
      </div>

      <CustomerSearch initialQuery={q ?? ''} />

      <AdminCard className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/50 text-xs uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Phone</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-right font-semibold">Orders</th>
                <th className="px-4 py-3 text-right font-semibold">Rx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-500">
                    {q
                      ? 'No customers match this search.'
                      : 'No customers yet. Add your first one.'}
                  </td>
                </tr>
              )}
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="font-medium text-zinc-100 hover:text-emerald-300"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-300">+91 {c.phone}</td>
                  <td className="px-4 py-3 text-zinc-400">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                    {c._count.orders}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                    {c._count.prescriptions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
