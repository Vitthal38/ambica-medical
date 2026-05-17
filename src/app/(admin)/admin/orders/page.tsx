import Link from 'next/link';
import { AdminBadge, AdminCard } from '@/components/admin/ui';
import { listOrders } from '@/lib/services/orders';

export const dynamic = 'force-dynamic';

function fmt(d: Date) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function rupees(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default async function OrdersPage() {
  const rows = await listOrders({ limit: 100 });

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100">Orders</h1>
      <p className="mt-1 text-sm text-zinc-400">{rows.length} orders recorded.</p>

      <AdminCard className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/50 text-xs uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Order</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Placed</th>
                <th className="px-4 py-3 text-left font-semibold">Items</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No orders yet.
                  </td>
                </tr>
              )}
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-mono text-zinc-100">{o.code}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/customers/${o.customer.id}`}
                      className="text-zinc-100 hover:text-emerald-300"
                    >
                      {o.customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-300">{fmt(o.placedAt)}</td>
                  <td className="px-4 py-3 tabular-nums text-zinc-300">{o.items.length}</td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={o.status === 'DELIVERED' ? 'success' : 'info'}>
                      {o.status}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-100">
                    {rupees(o.totalPaise)}
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
