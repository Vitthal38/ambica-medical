import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { PrescriptionFlow } from '@/features/prescription/PrescriptionFlow';

export const metadata: Metadata = {
  title: 'Upload Prescription',
  description: 'Upload your prescription and our licensed pharmacist will review it within 30 minutes.',
};

export default function PrescriptionPage() {
  return (
    <section className="bg-gradient-to-b from-primary-50/40 to-transparent py-10 md:py-14">
      <Container className="max-w-3xl">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary-700">
            📋 Prescription Upload
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Got a Doctor's Prescription?
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
            Upload it below and our licensed pharmacist will review and dispatch your order in
            under 30 minutes.
          </p>
        </div>

        <PrescriptionFlow />
      </Container>
    </section>
  );
}
