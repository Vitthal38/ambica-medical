import { create } from 'zustand';
import type { FileMeta, PatientForm } from './schema';

export type PrescriptionStatus = 'idle' | 'uploaded' | 'reviewing' | 'dispatched';
export type PrescriptionStep = 1 | 2 | 3 | 4;

interface PrescriptionState {
  step: PrescriptionStep;
  file?: FileMeta;
  patient?: PatientForm;
  status: PrescriptionStatus;
  setFile: (file: FileMeta) => void;
  setPatient: (patient: PatientForm) => void;
  setStep: (step: PrescriptionStep) => void;
  setStatus: (status: PrescriptionStatus) => void;
  reset: () => void;
}

export const usePrescriptionStore = create<PrescriptionState>((set) => ({
  step: 1,
  file: undefined,
  patient: undefined,
  status: 'idle',
  setFile: (file) => set({ file, status: 'uploaded', step: 2 }),
  setPatient: (patient) => set({ patient, status: 'reviewing', step: 3 }),
  setStep: (step) => set({ step }),
  setStatus: (status) => set({ status }),
  reset: () => set({ step: 1, file: undefined, patient: undefined, status: 'idle' }),
}));
