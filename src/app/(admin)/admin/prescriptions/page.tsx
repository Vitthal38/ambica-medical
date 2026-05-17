import Link from 'next/link';
import { AdminBadge, AdminCard } from '@/components/admin/ui';
import { listPrescriptions } from '@/lib/services/prescriptions';

export const dynamic = 'force-dynamic';

function fmt(d: Date | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function PrescriptionsPage() {
  const { rows } = await listPrescriptions({ limit: 100 });

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100">Prescriptions</h1>
      <p className="mt-1 text-sm text-zinc-400">{rows.length} on file.</p>

      <AdminCard className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/50 text-xs uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Doctor</th>
                <th className="px-4 py-3 text-left font-semibold">Issued</th>
                <th className="px-4 py-3 text-left font-semibold">Expires</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Medicines</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No prescriptions uploaded yet.
                  </td>
                </tr>
              )}
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/customers/${p.customer.id}`}
                      className="font-medium text-zinc-100 hover:text-emerald-300"
                    >
                      {p.customer.name}
                    </Link>
                    <p className="text-xs text-zinc-500">+91 {p.customer.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{p.doctorName || '—'}</td>
                  <td className="px-4 py-3 text-zinc-300 tabular-nums">{fmt(p.issueDate)}</td>
                  <td className="px-4 py-3 text-zinc-300 tabular-nums">{fmt(p.expiryDate)}</td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={p.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {p.status}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {p.medicines.length === 0
                      ? '—'
                      : p.medicines
                          .slice(0, 3)
                          .map((m) => m.medicine.brand)
                          .join(', ') +
                        (p.medicines.length > 3 ? ` +${p.medicines.length - 3}` : '')}
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
