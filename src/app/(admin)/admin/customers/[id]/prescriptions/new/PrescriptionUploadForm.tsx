'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UploadCloud, FileText, ImageIcon, X } from 'lucide-react';
import { AdminButton, AdminCard, AdminInput } from '@/components/admin/ui';
import {
  prescriptionCreateMeta,
  type PrescriptionCreateInput,
} from '@/features/admin/schemas';
import { ALLOWED_TYPES, MAX_FILE_SIZE } from '@/features/prescription/schema';
import { cn } from '@/lib/cn';

const ACCEPT = ALLOWED_TYPES.join(',');

export function PrescriptionUploadForm({ customerId }: { customerId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PrescriptionCreateInput>({
    resolver: zodResolver(prescriptionCreateMeta),
    defaultValues: {
      customerId,
      doctorName: '',
      doctorReg: '',
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      notes: '',
      medicineIds: [],
    },
  });

  function acceptFile(f: File) {
    if (f.size > MAX_FILE_SIZE) {
      setFileError(`File must be ≤ ${MAX_FILE_SIZE / 1024 / 1024} MB.`);
      return;
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      setFileError('Only JPG, PNG, WebP, or PDF allowed.');
      return;
    }
    setFile(f);
    setFileError(null);
  }

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    if (!file) {
      setFileError('Pick a prescription file to upload.');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('meta', JSON.stringify(data));

    const res = await fetch('/api/admin/prescriptions', {
      method: 'POST',
      body: form,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(body.error || 'Could not upload.');
      return;
    }
    router.push(`/admin/customers/${customerId}`);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <AdminCard className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">File</p>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) acceptFile(f);
          }}
          className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-700 px-4 py-8 text-center transition-colors hover:border-emerald-500/50"
        >
          <UploadCloud className="h-7 w-7 text-zinc-500" />
          <p className="text-sm text-zinc-300">
            {file ? 'Replace file' : 'Drag a file or click to browse'}
          </p>
          <p className="text-[11px] text-zinc-500">JPG · PNG · WebP · PDF · max 5 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => e.target.files?.[0] && acceptFile(e.target.files[0])}
          />
        </div>

        {file && (
          <div className="mt-3 flex items-center gap-3 rounded-md bg-zinc-900 px-3 py-2">
            {file.type === 'application/pdf' ? (
              <FileText className="h-4 w-4 text-emerald-400" />
            ) : (
              <ImageIcon className="h-4 w-4 text-emerald-400" />
            )}
            <span className="flex-1 truncate text-sm text-zinc-100">{file.name}</span>
            <span className="text-xs text-zinc-500">{(file.size / 1024).toFixed(0)} KB</span>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-zinc-500 hover:text-rose-400"
              aria-label="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {fileError && <p className="mt-3 text-xs text-rose-400">{fileError}</p>}
      </AdminCard>

      <AdminCard className="p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Doctor name" error={errors.doctorName?.message}>
            <AdminInput {...register('doctorName')} placeholder="Dr. Anil Kulkarni, MD" />
          </Field>
          <Field label="Medical reg. no." error={errors.doctorReg?.message}>
            <AdminInput {...register('doctorReg')} placeholder="MMC-12345" />
          </Field>
          <Field label="Issue date" error={errors.issueDate?.message} required>
            <AdminInput {...register('issueDate')} type="date" />
          </Field>
          <Field label="Expiry date" error={errors.expiryDate?.message}>
            <AdminInput {...register('expiryDate')} type="date" />
          </Field>
          <Field label="Notes" error={errors.notes?.message} className="sm:col-span-2">
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Any verification notes from the pharmacist."
              className={cn(
                'w-full rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500',
                'border border-zinc-700',
                'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
              )}
            />
          </Field>
        </div>
      </AdminCard>

      {serverError && (
        <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {serverError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <AdminButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save prescription'}
        </AdminButton>
        <AdminButton type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </AdminButton>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
  required,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
        {label} {required && <span className="text-emerald-400">*</span>}
      </span>
      {children}
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </label>
  );
}
