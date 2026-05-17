import Link from 'next/link';
import { Upload, FilePlus2, ClipboardCheck, Truck, ArrowRight, Clock3 } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';

const STEPS = [
  { icon: Upload, title: 'Upload prescription', desc: 'Image or PDF' },
  { icon: FilePlus2, title: 'Patient details', desc: 'Quick form' },
  { icon: ClipboardCheck, title: 'Pharmacist review', desc: 'Verified & confirmed' },
  { icon: Truck, title: 'Order dispatched', desc: 'Promptly delivered' },
];

export function PrescriptionPromo() {
  return (
    <section className="bg-white py-14">
      <Container>
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 p-8 text-white shadow-card sm:p-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
                📋 Prescription Upload
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Got a Doctor's Prescription?
              </h2>
              <p className="mt-3 max-w-md text-sm text-primary-50/90 sm:text-base">
                Upload your prescription and our licensed pharmacist will review and fulfil your
                order with care and accuracy.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                <Clock3 className="h-4 w-4" strokeWidth={2} /> 30-minute turnaround
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/prescription">
                  <Button
                    size="lg"
                    className="bg-white text-primary-700 shadow-card hover:bg-primary-50"
                  >
                    Upload Now <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/prescription">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="border border-white/30 bg-transparent text-white hover:bg-white/10"
                  >
                    How it works
                  </Button>
                </Link>
              </div>
            </div>

            {/* Steps */}
            <ol className="grid gap-3 sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm"
                >
                  <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 text-sm font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      <s.icon className="h-4 w-4" strokeWidth={1.75} />
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-xs text-primary-50/80">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Container>
    </section>
  );
}
