'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Loader2,
  Plus,
  Search,
  X,
  Pill,
  Trash2,
} from 'lucide-react';
import { AdminBadge, AdminButton, AdminCard, AdminInput } from '@/components/admin/ui';
import {
  customerCreateWithMedicinesSchema,
  type CustomerCreateWithMedicinesInput,
  ENTRY_TYPES,
  type EntryType,
} from '@/features/admin/schemas';
import { cn } from '@/lib/cn';

interface MedicineHit {
  id: string;
  brand: string;
  name: string;
  dosage: string | null;
  dosageForm: string | null;
  pack: string;
  rxRequired: boolean;
}

const TODAY = new Date().toISOString().split('T')[0];

const ENTRY_LABEL: Record<EntryType, string> = {
  PRESCRIPTION: 'Rx',
  MANUAL: 'Manual',
  OTC: 'OTC',
};

const ENTRY_TONE: Record<EntryType, string> = {
  PRESCRIPTION: 'bg-rose-500/20 text-rose-300',
  MANUAL: 'bg-sky-500/20 text-sky-300',
  OTC: 'bg-emerald-500/20 text-emerald-300',
};

export function NewCustomerForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  // Cache resolved medicine objects so each row can show brand · name
  // without re-fetching after submit.
  const [medicineCache, setMedicineCache] = useState<Record<string, MedicineHit>>({});

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerCreateWithMedicinesInput>({
    resolver: zodResolver(customerCreateWithMedicinesSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      dob: '',
      address: '',
      notes: '',
      medicines: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'medicines' });

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    // Strip empty optional strings so backend doesn't store ""s.
    const payload = {
      ...data,
      email: data.email || undefined,
      dob: data.dob || undefined,
      address: data.address || undefined,
      notes: data.notes || undefined,
      medicines: data.medicines?.length ? data.medicines : undefined,
    };

    const res = await fetch('/api/admin/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (body.fieldErrors) {
        for (const [k, v] of Object.entries(body.fieldErrors)) {
          setError(k as keyof CustomerCreateWithMedicinesInput, {
            message: Array.isArray(v) ? v[0] : String(v),
          });
        }
      } else {
        setServerError(body.error || 'Could not save customer.');
      }
      return;
    }

    router.push(`/admin/customers/${body.customer.id}`);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* -------- Customer details -------- */}
      <AdminCard className="p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Customer details
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field label="Full name" error={errors.name?.message} required>
            <AdminInput
              {...register('name')}
              placeholder="e.g. Anil Kulkarni"
              autoComplete="name"
            />
          </Field>
          <Field label="Phone (10 digits)" error={errors.phone?.message} required>
            <AdminInput
              {...register('phone')}
              inputMode="numeric"
              placeholder="9876543210"
              autoComplete="tel-national"
            />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <AdminInput {...register('email')} type="email" placeholder="optional" />
          </Field>
          <Field label="Date of birth" error={errors.dob?.message}>
            <AdminInput {...register('dob')} type="date" />
          </Field>
          <Field label="Address" error={errors.address?.message} className="sm:col-span-2">
            <textarea
              {...register('address')}
              rows={2}
              placeholder="Street, area, city, pincode"
              className={cn(
                'w-full rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500',
                'border border-zinc-700',
                'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
              )}
            />
          </Field>
          <Field label="Internal notes" error={errors.notes?.message} className="sm:col-span-2">
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Allergies, ongoing treatment, anything staff should know."
              className={cn(
                'w-full rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500',
                'border border-zinc-700',
                'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
              )}
            />
          </Field>
        </div>
      </AdminCard>

      {/* -------- Medicines (optional) -------- */}
      <AdminCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Initial medicines (optional)
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Recorded directly — no prescription upload needed. Saved atomically with the customer.
            </p>
          </div>
          <AdminButton
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              append({
                medicineId: '',
                quantity: 1,
                dosage: '',
                notes: '',
                entryDate: TODAY,
                entryType: 'MANUAL',
              })
            }
          >
            <Plus className="h-3.5 w-3.5" /> Add row
          </AdminButton>
        </div>

        {fields.length === 0 ? (
          <p className="mt-5 rounded-md border border-dashed border-zinc-700 px-4 py-6 text-center text-xs text-zinc-500">
            No medicines yet. Click <span className="text-zinc-300">Add row</span> to record one.
          </p>
        ) : (
          <ul className="mt-5 space-y-4">
            {fields.map((row, idx) => (
              <li key={row.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                    Medicine #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="text-zinc-500 hover:text-rose-400"
                    aria-label={`Remove medicine ${idx + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Medicine picker */}
                <div className="mt-3">
                  <Controller
                    control={control}
                    name={`medicines.${idx}.medicineId`}
                    render={({ field, fieldState }) => {
                      const v = field.value ?? '';
                      return (
                        <MedicinePicker
                          value={v}
                          cached={v ? medicineCache[v] : undefined}
                          onChange={(hit) => {
                            field.onChange(hit?.id ?? '');
                            if (hit) setMedicineCache((c) => ({ ...c, [hit.id]: hit }));
                          }}
                          error={fieldState.error?.message}
                        />
                      );
                    }}
                  />
                </div>

                {/* Qty + Date + Type */}
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                      Quantity
                    </label>
                    <AdminInput
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={999}
                      {...register(`medicines.${idx}.quantity`, { valueAsNumber: true })}
                      className="mt-1"
                    />
                    {errors.medicines?.[idx]?.quantity && (
                      <p className="mt-1 text-xs text-rose-400">
                        {errors.medicines[idx]?.quantity?.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                      Date
                    </label>
                    <AdminInput
                      type="date"
                      {...register(`medicines.${idx}.entryDate`)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                      Type
                    </label>
                    <Controller
                      control={control}
                      name={`medicines.${idx}.entryType`}
                      render={({ field }) => (
                        <div className="mt-1 inline-flex w-full rounded-md border border-zinc-700 bg-zinc-900 p-0.5">
                          {ENTRY_TYPES.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => field.onChange(t)}
                              className={cn(
                                'flex-1 rounded px-1.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                                field.value === t
                                  ? ENTRY_TONE[t]
                                  : 'text-zinc-500 hover:text-zinc-300',
                              )}
                            >
                              {ENTRY_LABEL[t]}
                            </button>
                          ))}
                        </div>
                      )}
                    />
                  </div>
                </div>

                {/* Dosage + Notes */}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Dosage" error={errors.medicines?.[idx]?.dosage?.message}>
                    <AdminInput
                      {...register(`medicines.${idx}.dosage`)}
                      placeholder="e.g. 1-0-1 after food, 5 days"
                    />
                  </Field>
                  <Field label="Notes" error={errors.medicines?.[idx]?.notes?.message}>
                    <AdminInput
                      {...register(`medicines.${idx}.notes`)}
                      placeholder="Optional"
                    />
                  </Field>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      {serverError && (
        <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {serverError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <AdminButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : fields.length === 0 ? (
            'Create customer'
          ) : (
            `Create customer + ${fields.length} medicine${fields.length === 1 ? '' : 's'}`
          )}
        </AdminButton>
        <AdminButton type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </AdminButton>
      </div>
    </form>
  );
}

/* --------------------------------------------------------------------------
 * Local helpers
 * ------------------------------------------------------------------------ */

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

function MedicinePicker({
  value,
  cached,
  onChange,
  error,
}: {
  value: string;
  cached?: MedicineHit;
  onChange: (hit: MedicineHit | null) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<MedicineHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/medicines?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        setHits(data.rows ?? []);
      } finally {
        setSearching(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  if (value && cached) {
    return (
      <div>
        <div className="flex items-center gap-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5">
          <Pill className="h-4 w-4 flex-shrink-0 text-emerald-300" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-100">
              {cached.brand} · {cached.name}
            </p>
            <p className="truncate text-xs text-zinc-400">{cached.pack}</p>
          </div>
          {cached.rxRequired && <AdminBadge tone="rx">Rx</AdminBadge>}
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery('');
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Change medicine"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <AdminInput
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by brand or generic… e.g. Crocin"
          className="pl-9"
        />
        {(hits.length > 0 || searching) && (
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-xl">
            {searching && hits.length === 0 ? (
              <div className="px-3 py-3 text-xs text-zinc-500">Searching…</div>
            ) : (
              hits.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    onChange(h);
                    setQuery('');
                    setHits([]);
                  }}
                  className="flex w-full items-center gap-3 border-b border-zinc-800 px-3 py-2 text-left last:border-0 hover:bg-zinc-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-100">
                      <span className="font-semibold">{h.brand}</span> · {h.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {h.pack}
                      {h.dosage ? ` · ${h.dosage}` : ''}
                    </p>
                  </div>
                  {h.rxRequired && <AdminBadge tone="rx">Rx</AdminBadge>}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
