import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { AdminBadge, AdminCard } from '@/components/admin/ui';
import { getPrescriptionById } from '@/lib/services/prescriptions';

export const dynamic = 'force-dynamic';

function fmt(d: Date | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function PrescriptionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getPrescriptionById(id);
  if (!p) notFound();

  const isImage = p.mimeType.startsWith('image/');
  const fileUrl = `/api/admin/prescriptions/${p.id}/file`;

  return (
    <div>
      <Link
        href={`/admin/customers/${p.customer.id}`}
        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> {p.customer.name}
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Prescription</h1>
          <p className="mt-1 text-sm text-zinc-400">
            For{' '}
            <Link
              href={`/admin/customers/${p.customer.id}`}
              className="text-zinc-200 hover:text-emerald-300"
            >
              {p.customer.name}
            </Link>{' '}
            · +91 {p.customer.phone}
          </p>
        </div>
        <AdminBadge tone={p.status === 'ACTIVE' ? 'success' : 'warning'}>{p.status}</AdminBadge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Viewer */}
        <AdminCard className="overflow-hidden">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl}
              alt={`Prescription ${p.id}`}
              className="max-h-[80vh] w-full object-contain bg-zinc-950"
            />
          ) : (
            <iframe
              src={fileUrl}
              className="h-[80vh] w-full bg-zinc-950"
              title={`Prescription ${p.id}`}
            />
          )}
          <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-2.5 text-xs text-zinc-500">
            <span>
              {p.mimeType} · {(p.fileSize / 1024).toFixed(0)} KB
            </span>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Open in new tab
            </a>
          </div>
        </AdminCard>

        {/* Metadata */}
        <aside className="space-y-4">
          <AdminCard className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Details</p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label="Doctor" value={p.doctorName || '—'} />
              <Row label="Reg. no." value={p.doctorReg || '—'} />
              <Row label="Issued" value={fmt(p.issueDate)} />
              <Row label="Expires" value={fmt(p.expiryDate)} />
              <Row label="Uploaded by" value={p.uploadedBy?.name || '—'} />
              <Row label="Uploaded at" value={fmt(p.createdAt)} />
            </dl>
            {p.notes && (
              <>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Notes
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{p.notes}</p>
              </>
            )}
          </AdminCard>

          <AdminCard className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Medicines</p>
            {p.medicines.length === 0 ? (
              <p className="mt-3 text-xs text-zinc-500">No medicines linked.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {p.medicines.map((m) => (
                  <li key={m.medicineId} className="rounded-md bg-zinc-900 px-3 py-2 text-sm">
                    <p className="font-medium text-zinc-100">
                      {m.medicine.brand} · {m.medicine.name}
                    </p>
                    {m.dosageNote && (
                      <p className="mt-0.5 text-xs text-zinc-500">{m.dosageNote}</p>
                    )}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-xs uppercase tracking-widest text-zinc-500">{label}</dt>
      <dd className="text-right text-zinc-200">{value}</dd>
    </div>
  );
}
