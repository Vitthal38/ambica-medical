'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Search, X, Pill, Check } from 'lucide-react';
import { AdminBadge, AdminButton, AdminCard, AdminInput } from '@/components/admin/ui';
import {
  medicineEntryCreateSchema,
  type MedicineEntryCreateInput,
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

interface Props {
  customerId: string;
}

export function AddMedicineDialog({ customerId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AdminButton size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Add medicine
      </AdminButton>
      {open && <DialogBody customerId={customerId} onClose={() => setOpen(false)} />}
    </>
  );
}

function DialogBody({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const router = useRouter();

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Auto-focus the search input on mount
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  /* ---------------- Form state ---------------- */
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MedicineEntryCreateInput>({
    resolver: zodResolver(medicineEntryCreateSchema),
    defaultValues: {
      medicineId: '',
      quantity: 1,
      dosage: '',
      notes: '',
      entryDate: new Date().toISOString().split('T')[0],
      entryType: 'MANUAL',
    },
  });

  /* ---------------- Autocomplete ---------------- */
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<MedicineHit[]>([]);
  const [selected, setSelected] = useState<MedicineHit | null>(null);
  const [searching, setSearching] = useState(false);
  const [entryType, setEntryType] = useState<EntryType>('MANUAL');
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (!term || selected) {
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
  }, [query, selected]);

  function pickHit(h: MedicineHit) {
    setSelected(h);
    setValue('medicineId', h.id, { shouldValidate: true });
    setQuery(`${h.brand} · ${h.name}`);
    setHits([]);
    // If the medicine requires Rx, suggest the entry type so the badge is accurate.
    if (h.rxRequired) {
      setEntryType('PRESCRIPTION');
      setValue('entryType', 'PRESCRIPTION');
    }
  }

  function clearPick() {
    setSelected(null);
    setQuery('');
    setValue('medicineId', '');
    searchRef.current?.focus();
  }

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    const res = await fetch(`/api/admin/customers/${customerId}/medicine-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, entryType }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (body.fieldErrors) {
        for (const [k, v] of Object.entries(body.fieldErrors)) {
          setError(k as keyof MedicineEntryCreateInput, {
            message: Array.isArray(v) ? v[0] : String(v),
          });
        }
      } else {
        setServerError(body.error || 'Could not save entry.');
      }
      return;
    }
    onClose();
    router.refresh();
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-10 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Add medicine entry"
    >
      <AdminCard className="relative w-full max-w-xl border-zinc-700 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-lg font-semibold text-zinc-100">Add medicine</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Direct entry — no prescription upload required.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          {/* --- Medicine search / selected pill --- */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Medicine <span className="text-emerald-400">*</span>
            </label>
            {selected ? (
              <div className="mt-1.5 flex items-center gap-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5">
                <Pill className="h-4 w-4 flex-shrink-0 text-emerald-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {selected.brand} · {selected.name}
                  </p>
                  <p className="truncate text-xs text-zinc-400">{selected.pack}</p>
                </div>
                {selected.rxRequired && <AdminBadge tone="rx">Rx</AdminBadge>}
                <button
                  type="button"
                  onClick={clearPick}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
                  aria-label="Change medicine"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <AdminInput
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by brand or generic… e.g. Crocin"
                  className="pl-9"
                />
                {(hits.length > 0 || searching) && (
                  <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-xl">
                    {searching && hits.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-zinc-500">Searching…</div>
                    ) : (
                      hits.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => pickHit(h)}
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
            )}
            {errors.medicineId && (
              <p className="mt-1 text-xs text-rose-400">{errors.medicineId.message}</p>
            )}
          </div>

          {/* --- Quantity + Date --- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Quantity <span className="text-emerald-400">*</span>
              </label>
              <AdminInput
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                {...register('quantity', { valueAsNumber: true })}
                className="mt-1.5"
              />
              {errors.quantity && (
                <p className="mt-1 text-xs text-rose-400">{errors.quantity.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Date
              </label>
              <AdminInput {...register('entryDate')} type="date" className="mt-1.5" />
            </div>
          </div>

          {/* --- Dosage --- */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Dosage
            </label>
            <AdminInput
              {...register('dosage')}
              placeholder="e.g. 1-0-1 after food, 5 days"
              className="mt-1.5"
            />
          </div>

          {/* --- Entry type segmented control --- */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Entry type
            </label>
            <div className="mt-1.5 inline-flex w-full rounded-md border border-zinc-700 bg-zinc-900 p-1">
              {ENTRY_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setEntryType(t);
                    setValue('entryType', t);
                  }}
                  className={cn(
                    'flex-1 rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors',
                    entryType === t
                      ? t === 'PRESCRIPTION'
                        ? 'bg-rose-500/20 text-rose-300'
                        : t === 'OTC'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-sky-500/20 text-sky-300'
                      : 'text-zinc-500 hover:text-zinc-300',
                  )}
                >
                  {ENTRY_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {/* --- Notes --- */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Optional — allergies, special instructions, etc."
              className={cn(
                'mt-1.5 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500',
                'border border-zinc-700',
                'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
              )}
            />
          </div>

          {serverError && (
            <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {serverError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <AdminButton type="button" variant="ghost" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={isSubmitting || !selected}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4" /> Save entry
                </>
              )}
            </AdminButton>
          </div>
        </form>

        <p className="mt-4 text-[10px] uppercase tracking-widest text-zinc-600">
          ↵ saves · Esc closes
        </p>
      </AdminCard>
    </div>
  );
}

const ENTRY_LABEL: Record<EntryType, string> = {
  PRESCRIPTION: 'Rx',
  MANUAL: 'Manual',
  OTC: 'OTC',
};
