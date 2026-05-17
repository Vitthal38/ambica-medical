'use client';

import Link from 'next/link';
import { CheckCircle2, Truck, Clock3, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { usePrescriptionStore } from './prescriptionStore';

export function StepDispatch() {
  const reset = usePrescriptionStore((s) => s.reset);
  const patient = usePrescriptionStore((s) => s.patient);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="text-center"
    >
      <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
        <CheckCircle2 className="h-10 w-10" strokeWidth={1.5} />
      </span>
      <h2 className="mt-5 text-3xl font-bold tracking-tight">Order dispatched 🎉</h2>
      <p className="mt-2 max-w-md text-sm text-neutral-600 mx-auto">
        Thank you{patient ? `, ${patient.fullName.split(' ')[0]}` : ''}. Your prescription has been
        verified and your order is on its way.
      </p>

      <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-2 text-sm font-semibold text-primary-800">
        <Clock3 className="h-4 w-4" /> Arriving in 30 minutes or less
      </div>

      <dl className="mx-auto mt-8 grid max-w-md gap-3 text-left text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <dt className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Order ID</dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-neutral-900">
            AMB-{Math.floor(100000 + Math.random() * 900000)}
          </dd>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <dt className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
            Delivery
          </dt>
          <dd className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
            <Truck className="h-3.5 w-3.5 text-primary-600" /> Same-day, free
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/">
          <Button variant="primary" size="lg">
            <Home className="h-4 w-4" /> Back to home
          </Button>
        </Link>
        <Button variant="outline" size="lg" onClick={reset}>
          Upload another prescription
        </Button>
      </div>
    </motion.div>
  );
}
