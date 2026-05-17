'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { patientSchema, type PatientForm } from './schema';
import { usePrescriptionStore } from './prescriptionStore';
import { cn } from '@/lib/cn';

export function StepPatient() {
  const { patient, setPatient } = usePrescriptionStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PatientForm>({
    resolver: zodResolver(patientSchema),
    defaultValues: patient,
  });

  const onSubmit = handleSubmit((data) => {
    setPatient(data);
    // Simulate pharmacist review (2.5s) → step 4
    setTimeout(() => {
      usePrescriptionStore.setState({ step: 4, status: 'dispatched' });
    }, 2500);
  });

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Patient details</h2>
      <p className="mt-1 text-sm text-neutral-600">
        We'll use this information to verify the prescription and arrange delivery.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.fullName?.message}>
          <Input
            placeholder="e.g. Anil Kulkarni"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            {...register('fullName')}
          />
        </Field>

        <Field label="Age" error={errors.age?.message}>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            placeholder="e.g. 42"
            aria-invalid={!!errors.age}
            {...register('age')}
          />
        </Field>

        <Field label="Phone (10-digit)" error={errors.phone?.message}>
          <Input
            type="tel"
            inputMode="numeric"
            placeholder="9876543210"
            autoComplete="tel-national"
            aria-invalid={!!errors.phone}
            {...register('phone')}
          />
        </Field>

        <Field label="Delivery address" error={errors.address?.message} className="sm:col-span-2">
          <Input
            placeholder="House no, area, landmark, Aurangabad"
            autoComplete="street-address"
            aria-invalid={!!errors.address}
            {...register('address')}
          />
        </Field>

        <Field label="Notes (optional)" error={errors.notes?.message} className="sm:col-span-2">
          <textarea
            rows={3}
            placeholder="Any allergies, preferences or instructions for the pharmacist?"
            className={cn(
              'w-full rounded-xl bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400',
              'border border-neutral-200 transition-colors',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100',
            )}
            {...register('notes')}
          />
        </Field>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => usePrescriptionStore.setState({ step: 1 })}
            className="text-neutral-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            Submit for review <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-semibold uppercase tracking-widest text-neutral-600">
        {label}
      </span>
      {children}
      {error && <span className="text-xs text-rose-700">{error}</span>}
    </label>
  );
}
