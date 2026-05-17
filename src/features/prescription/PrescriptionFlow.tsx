'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePrescriptionStore } from './prescriptionStore';
import { StepIndicator } from './StepIndicator';
import { StepUpload } from './StepUpload';
import { StepPatient } from './StepPatient';
import { StepReview } from './StepReview';
import { StepDispatch } from './StepDispatch';

export function PrescriptionFlow() {
  const step = usePrescriptionStore((s) => s.step);

  return (
    <div className="rounded-3xl border border-neutral-200/70 bg-white p-6 shadow-card sm:p-10">
      <StepIndicator current={step} />

      <div className="mt-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && <StepUpload />}
            {step === 2 && <StepPatient />}
            {step === 3 && <StepReview />}
            {step === 4 && <StepDispatch />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
