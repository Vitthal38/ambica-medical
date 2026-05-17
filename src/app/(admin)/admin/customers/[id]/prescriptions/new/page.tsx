import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getCustomerById } from '@/lib/services/customers';
import { PrescriptionUploadForm } from './PrescriptionUploadForm';

export default async function NewPrescriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCustomerById(id);
  if (!c) notFound();

  return (
    <div className="max-w-2xl">
      <Link
        href={`/admin/customers/${id}`}
        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to profile
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-zinc-100">Upload prescription</h1>
      <p className="mt-1 text-sm text-zinc-400">
        For <span className="text-zinc-200">{c.name}</span> · +91 {c.phone}
      </p>
      <div className="mt-6">
        <PrescriptionUploadForm customerId={id} />
      </div>
    </div>
  );
}
