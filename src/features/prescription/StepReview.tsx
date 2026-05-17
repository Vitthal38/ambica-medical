'use client';

import { Loader2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export function StepReview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-4 py-12 text-center"
    >
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
        <Loader2 className="h-8 w-8 animate-spin" strokeWidth={1.75} />
      </span>
      <h2 className="text-2xl font-bold tracking-tight">Pharmacist reviewing your prescription</h2>
      <p className="max-w-md text-sm text-neutral-600">
        This usually takes under a minute. We're verifying the prescription and confirming
        availability of every item.
      </p>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
        <ShieldCheck className="h-3.5 w-3.5" /> Lic. No: MH-AUR-00001
      </div>
    </motion.div>
  );
}
