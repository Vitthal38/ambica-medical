import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Edit2, FileText, Package, Pill } from 'lucide-react';
import { AdminBadge, AdminButton, AdminCard, AdminSection } from '@/components/admin/ui';
import { getCustomerById } from '@/lib/services/customers';
import {
  getMedicineHistoryForCustomer,
  type MedicineTouch,
} from '@/lib/services/orders';
import { AddMedicineDialog } from './AddMedicineDialog';

export const dynamic = 'force-dynamic';

function fmtDate(d: Date | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function rupees(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCustomerById(id);
  if (!c) notFound();

  const medicineHistory = await getMedicineHistoryForCustomer(id);

  return (
    <div>
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Customers
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{c.name}</h1>
          <p className="mt-1 text-sm tabular-nums text-zinc-400">
            +91 {c.phone} {c.email && <span className="ml-3">{c.email}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/customers/${id}/edit`}>
            <AdminButton variant="secondary" size="sm">
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </AdminButton>
          </Link>
          <AddMedicineDialog customerId={id} />
          <Link href={`/admin/customers/${id}/prescriptions/new`}>
            <AdminButton variant="secondary" size="sm">
              <FileText className="h-3.5 w-3.5" /> Upload Rx
            </AdminButton>
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
        {/* Left — history columns */}
        <div className="space-y-8">
          <AdminSection
            title="Prescription history"
            description={`${c.prescriptions.length} on file`}
            action={
              <Link
                href={`/admin/customers/${id}/prescriptions/new`}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
              >
                + Add new
              </Link>
            }
          >
            {c.prescriptions.length === 0 ? (
              <AdminCard className="p-8 text-center text-sm text-zinc-500">
                No prescriptions on file yet.
              </AdminCard>
            ) : (
              <div className="space-y-2">
                {c.prescriptions.map((p) => (
                  <Link key={p.id} href={`/admin/prescriptions/${p.id}`}>
                    <AdminCard className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:border-zinc-700">
                      <FileText className="h-5 w-5 text-emerald-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-100">
                          {p.doctorName || 'Unknown doctor'}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Issued {fmtDate(p.issueDate)} · Expires {fmtDate(p.expiryDate)}
                        </p>
                        {p.medicines.length > 0 && (
                          <p className="mt-1 text-xs text-zinc-400">
                            {p.medicines
                              .slice(0, 3)
                              .map((m) => m.medicine.brand)
                              .join(', ')}
                            {p.medicines.length > 3 ? ` +${p.medicines.length - 3} more` : ''}
                          </p>
                        )}
                      </div>
                      <AdminBadge
                        tone={
                          p.status === 'ACTIVE'
                            ? 'success'
                            : p.status === 'EXPIRED'
                              ? 'warning'
                              : 'default'
                        }
                      >
                        {p.status}
                      </AdminBadge>
                    </AdminCard>
                  </Link>
                ))}
              </div>
            )}
          </AdminSection>

          <AdminSection
            title="Medicine timeline"
            description={`${medicineHistory.length} unique medicines · orders + direct entries combined`}
          >
            {medicineHistory.length === 0 ? (
              <AdminCard className="p-8 text-center text-sm text-zinc-500">
                No purchases or entries yet. Use{' '}
                <span className="font-semibold text-emerald-400">Add medicine</span> above to log
                an over-the-counter sale or a quick manual entry.
              </AdminCard>
            ) : (
              <AdminCard className="divide-y divide-zinc-800">
                {medicineHistory.slice(0, 12).map((h) => (
                  <div key={h.medicineId} className="flex items-start gap-3 p-4">
                    <Pill className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-100">
                          {h.brand} · {h.name}
                        </p>
                        {h.touches.length >= 3 && (
                          <AdminBadge tone="info">Recurring</AdminBadge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {h.touches.length}× · total quantity {h.totalQty}
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {h.touches.slice(0, 4).map((t, i) => (
                          <li
                            key={i}
                            className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400"
                          >
                            <span className="tabular-nums text-zinc-300">{fmtDate(t.date)}</span>
                            <span className="text-zinc-600">·</span>
                            <span className="tabular-nums">×{t.qty}</span>
                            {renderTouchBadge(t)}
                            {t.source === 'ORDER' && (
                              <span className="font-mono text-zinc-500">{t.orderCode}</span>
                            )}
                            {t.source === 'ENTRY' && t.dosage && (
                              <span className="truncate text-zinc-500">· {t.dosage}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </AdminCard>
            )}
          </AdminSection>

          <AdminSection title="Orders" description={`${c.orders.length} total`}>
            {c.orders.length === 0 ? (
              <AdminCard className="p-8 text-center text-sm text-zinc-500">
                No orders yet.
              </AdminCard>
            ) : (
              <AdminCard className="divide-y divide-zinc-800">
                {c.orders.slice(0, 10).map((o) => (
                  <div key={o.id} className="flex items-center gap-4 p-4">
                    <Package className="h-4 w-4 text-emerald-400" />
                    <div className="flex-1">
                      <p className="font-mono text-sm text-zinc-100">{o.code}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {fmtDate(o.placedAt)} · {o.items.length} items
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-zinc-100">
                      {rupees(o.totalPaise)}
                    </span>
                  </div>
                ))}
              </AdminCard>
            )}
          </AdminSection>
        </div>

        {/* Right — profile facts + reminders */}
        <aside className="space-y-4">
          <AdminCard className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Profile</p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label="Date of birth" value={fmtDate(c.dob)} />
              <Row label="Address" value={c.address || '—'} />
              <Row label="Added" value={fmtDate(c.createdAt)} />
              <Row label="Internal notes" value={c.notes || '—'} multi />
            </dl>
          </AdminCard>

          <AdminCard className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Pending refills
            </p>
            {c.refillReminders.length === 0 ? (
              <p className="mt-3 text-xs text-zinc-500">No refills due.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {c.refillReminders.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-zinc-900 px-3 py-2"
                  >
                    <span className="text-xs text-zinc-200">
                      {r.medicine.brand} · {r.medicine.name}
                    </span>
                    <AdminBadge tone="warning">{fmtDate(r.dueOn)}</AdminBadge>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, multi }: { label: string; value: string; multi?: boolean }) {
  return (
    <div className={multi ? 'space-y-1' : 'flex justify-between gap-3'}>
      <dt className="text-xs uppercase tracking-widest text-zinc-500">{label}</dt>
      <dd className="text-right text-zinc-200">{value}</dd>
    </div>
  );
}

/** Render the source/type badge for a single timeline touch. */
function renderTouchBadge(t: MedicineTouch) {
  if (t.source === 'ORDER') return <AdminBadge tone="success">Order</AdminBadge>;
  if (t.entryType === 'PRESCRIPTION') return <AdminBadge tone="rx">Rx Entry</AdminBadge>;
  if (t.entryType === 'OTC') return <AdminBadge tone="success">OTC</AdminBadge>;
  return <AdminBadge tone="info">Manual</AdminBadge>;
}
