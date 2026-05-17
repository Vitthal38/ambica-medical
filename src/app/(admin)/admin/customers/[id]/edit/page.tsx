import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CustomerForm } from '../../CustomerForm';
import { getCustomerById } from '@/lib/services/customers';
import { listMedicineEntries } from '@/lib/services/medicine-entries';
import { EditTimelineSection, type TimelineEntry } from './EditTimelineSection';

export const dynamic = 'force-dynamic';

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCustomerById(id);
  if (!c) notFound();

  // Pull the timeline separately — we want the medicine join + a tighter
  // include shape than getCustomerById returns.
  const rawEntries = await listMedicineEntries({ customerId: id });
  const entries: TimelineEntry[] = rawEntries.map((e) => ({
    id: e.id,
    quantity: e.quantity,
    dosage: e.dosage,
    notes: e.notes,
    entryDate: e.entryDate.toISOString().split('T')[0],
    entryType: e.entryType,
    medicine: {
      id: e.medicine.id,
      brand: e.medicine.brand,
      name: e.medicine.name,
      pack: e.medicine.pack,
      rxRequired: e.medicine.rxRequired,
    },
  }));

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link
          href={`/admin/customers/${id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back to profile
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-100">Edit {c.name}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Update customer details and inline-edit medicine timeline entries below.
        </p>
      </div>

      <CustomerForm
        mode="edit"
        customerId={id}
        initial={{
          name: c.name,
          phone: c.phone,
          email: c.email ?? '',
          dob: c.dob ? c.dob.toISOString().split('T')[0] : '',
          address: c.address ?? '',
          notes: c.notes ?? '',
        }}
      />

      <EditTimelineSection customerId={id} initialEntries={entries} />
    </div>
  );
}
