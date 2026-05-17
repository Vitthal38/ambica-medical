'use client';

/**
 * Editable medicine timeline shown on the customer edit page.
 *
 * Each row supports inline editing of quantity, dosage, notes, date, and
 * type. Save / Cancel are per-row — there's no global "submit all" because
 * each PATCH is independent and the optimistic update keeps the UI honest.
 *
 * Delete is also per-row with a confirm step (no native confirm() — small
 * inline "Confirm delete?" inline button instead, less jarring).
 *
 * NOTE: we don't allow changing the medicine itself. If staff picked the
 * wrong medicine, the cleanest path is delete + re-add via Add medicine.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Pencil,
  Save,
  Trash2,
  X,
  Pill,
  Check,
} from 'lucide-react';
import { AdminBadge, AdminButton, AdminCard, AdminInput } from '@/components/admin/ui';
import { ENTRY_TYPES, type EntryType } from '@/features/admin/schemas';
import { cn } from '@/lib/cn';

export interface TimelineEntry {
  id: string;
  quantity: number;
  dosage: string | null;
  notes: string | null;
  entryDate: string; // ISO yyyy-mm-dd
  entryType: EntryType;
  medicine: {
    id: string;
    brand: string;
    name: string;
    pack: string;
    rxRequired: boolean;
  };
}

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

export function EditTimelineSection({
  customerId,
  initialEntries,
}: {
  customerId: string;
  initialEntries: TimelineEntry[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <AdminCard className="p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Medicine timeline
        </h2>
        <p className="mt-3 rounded-md border border-dashed border-zinc-700 px-4 py-6 text-center text-xs text-zinc-500">
          No medicine entries to edit. Add some from the customer profile.
        </p>
      </AdminCard>
    );
  }

  return (
    <AdminCard className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Medicine timeline
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Edit or remove direct entries. Order-based entries can't be edited here.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {entries.map((entry) => {
          const isEditing = editingId === entry.id;
          const isBusy = busyId === entry.id;
          return (
            <li
              key={entry.id}
              className={cn(
                'rounded-lg border bg-zinc-900/40 p-4 transition-colors',
                isEditing ? 'border-emerald-500/40' : 'border-zinc-800',
              )}
            >
              {/* Medicine name + Rx badge — never editable */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Pill className="h-4 w-4 flex-shrink-0 text-emerald-300" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-100">
                      {entry.medicine.brand} · {entry.medicine.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">{entry.medicine.pack}</p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {entry.medicine.rxRequired && <AdminBadge tone="rx">Rx</AdminBadge>}
                  {!isEditing && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(entry.id);
                          setConfirmDeleteId(null);
                          setError(null);
                        }}
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                        aria-label="Edit entry"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {confirmDeleteId === entry.id ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={async () => {
                            setBusyId(entry.id);
                            setError(null);
                            const res = await fetch(
                              `/api/admin/customers/${customerId}/medicine-entries/${entry.id}`,
                              { method: 'DELETE' },
                            );
                            setBusyId(null);
                            if (!res.ok) {
                              const body = await res.json().catch(() => ({}));
                              setError(body.error || 'Could not delete.');
                              return;
                            }
                            setEntries((cur) => cur.filter((e) => e.id !== entry.id));
                            setConfirmDeleteId(null);
                            router.refresh();
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-rose-500/20 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/30"
                        >
                          {isBusy ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Confirm
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(entry.id)}
                          className="rounded-md p-1.5 text-zinc-400 hover:bg-rose-500/20 hover:text-rose-300"
                          aria-label="Delete entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <EntryEditForm
                  entry={entry}
                  busy={isBusy}
                  onCancel={() => setEditingId(null)}
                  onSave={async (patch) => {
                    setBusyId(entry.id);
                    setError(null);
                    const res = await fetch(
                      `/api/admin/customers/${customerId}/medicine-entries/${entry.id}`,
                      {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(patch),
                      },
                    );
                    setBusyId(null);
                    if (!res.ok) {
                      const body = await res.json().catch(() => ({}));
                      setError(body.error || 'Could not save changes.');
                      return;
                    }
                    const body = await res.json();
                    setEntries((cur) =>
                      cur.map((e) =>
                        e.id === entry.id
                          ? {
                              ...e,
                              ...patch,
                              entryDate: patch.entryDate ?? e.entryDate,
                              dosage:
                                patch.dosage === undefined
                                  ? e.dosage
                                  : patch.dosage || null,
                              notes:
                                patch.notes === undefined
                                  ? e.notes
                                  : patch.notes || null,
                              entryType: body.entry?.entryType ?? e.entryType,
                            }
                          : e,
                      ),
                    );
                    setEditingId(null);
                    router.refresh();
                  }}
                />
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                  <span>
                    {new Date(entry.entryDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span>×{entry.quantity}</span>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      ENTRY_TONE[entry.entryType],
                    )}
                  >
                    {ENTRY_LABEL[entry.entryType]}
                  </span>
                  {entry.dosage && (
                    <>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-300">{entry.dosage}</span>
                    </>
                  )}
                  {entry.notes && (
                    <>
                      <span className="text-zinc-600">·</span>
                      <span className="italic text-zinc-500">{entry.notes}</span>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </AdminCard>
  );
}

function EntryEditForm({
  entry,
  busy,
  onCancel,
  onSave,
}: {
  entry: TimelineEntry;
  busy: boolean;
  onCancel: () => void;
  onSave: (patch: {
    quantity: number;
    dosage: string;
    notes: string;
    entryDate: string;
    entryType: EntryType;
  }) => void;
}) {
  const [quantity, setQuantity] = useState(entry.quantity);
  const [dosage, setDosage] = useState(entry.dosage ?? '');
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [entryDate, setEntryDate] = useState(entry.entryDate);
  const [entryType, setEntryType] = useState<EntryType>(entry.entryType);

  return (
    <div className="mt-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Quantity">
          <AdminInput
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
          />
        </Field>
        <Field label="Date">
          <AdminInput
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
          />
        </Field>
        <Field label="Type">
          <div className="inline-flex w-full rounded-md border border-zinc-700 bg-zinc-900 p-0.5">
            {ENTRY_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setEntryType(t)}
                className={cn(
                  'flex-1 rounded px-1.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                  entryType === t ? ENTRY_TONE[t] : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                {ENTRY_LABEL[t]}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Dosage">
          <AdminInput
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="e.g. 1-0-1 after food"
          />
        </Field>
        <Field label="Notes">
          <AdminInput
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <AdminButton
          type="button"
          size="sm"
          disabled={busy}
          onClick={() =>
            onSave({
              quantity,
              dosage,
              notes,
              entryDate,
              entryType,
            })
          }
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save changes
        </AdminButton>
        <AdminButton type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
          Cancel
        </AdminButton>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
