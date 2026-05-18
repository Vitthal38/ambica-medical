'use client';

import { useEffect, useState, useTransition } from 'react';
import { AdminButton } from '@/components/admin/ui';
import { Search, Upload, Trash2, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { placeholderUrl } from '@/lib/medicine-images/client';

interface MedicineRow {
  id: string;
  brand: string;
  name: string;
  manufacturer: string | null;
  dosage: string | null;
  category: string;
  rxRequired: boolean;
  imageUrl: string | null;
  imagePublicUrl: string | null;
  imageVerifiedAt: string | null;
  imageConfidence: number | null;
  imageSource: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  imageBytes: number | null;
  imagePhash: string | null;
}

interface ListResponse {
  items: MedicineRow[];
  total: number;
  offset: number;
  limit: number;
  counts: { all: number; verified: number; uploadedUnverified: number; noUpload: number };
}

type StatusFilter = 'all' | 'verified' | 'uploaded_unverified' | 'no_upload';

const PAGE_SIZE = 24;

export function MedicineImagesClient() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [offset, setOffset] = useState(0);

  const [, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/admin/medicine-images', window.location.origin);
      if (q) url.searchParams.set('q', q);
      if (status !== 'all') url.searchParams.set('status', status);
      url.searchParams.set('limit', String(PAGE_SIZE));
      url.searchParams.set('offset', String(offset));
      const r = await fetch(url.toString(), { credentials: 'include' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as ListResponse;
      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, offset]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    startTransition(load);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Medicine images</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Upload pack-shots and verify them. SVG placeholders show automatically for medicines
            without an uploaded image.
          </p>
        </div>
        <AdminButton variant="secondary" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Reload
        </AdminButton>
      </div>

      {/* Status filter tiles */}
      {data && (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatusTile
            label="All"
            count={data.counts.all}
            active={status === 'all'}
            onClick={() => {
              setOffset(0);
              setStatus('all');
            }}
          />
          <StatusTile
            label="Verified"
            count={data.counts.verified}
            tone="emerald"
            active={status === 'verified'}
            onClick={() => {
              setOffset(0);
              setStatus('verified');
            }}
          />
          <StatusTile
            label="Uploaded · unverified"
            count={data.counts.uploadedUnverified}
            tone="amber"
            active={status === 'uploaded_unverified'}
            onClick={() => {
              setOffset(0);
              setStatus('uploaded_unverified');
            }}
          />
          <StatusTile
            label="No upload"
            count={data.counts.noUpload}
            tone="rose"
            active={status === 'no_upload'}
            onClick={() => {
              setOffset(0);
              setStatus('no_upload');
            }}
          />
        </div>
      )}

      {/* Search */}
      <form onSubmit={onSearch} className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search brand or generic name…"
            className="block h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <AdminButton type="submit">Search</AdminButton>
      </form>

      {error && (
        <div className="mt-4 rounded-md border border-rose-700/50 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading && !data && (
        <p className="mt-6 text-sm text-zinc-500">Loading…</p>
      )}

      {data && data.items.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">No medicines match.</p>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.items.map((m) => (
              <MedicineCard key={m.id} med={m} onChanged={load} />
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Showing {data.offset + 1}–{Math.min(data.offset + data.limit, data.total)} of{' '}
              {data.total}
            </p>
            <div className="flex gap-2">
              <AdminButton
                variant="secondary"
                size="sm"
                disabled={data.offset === 0}
                onClick={() => setOffset(Math.max(0, data.offset - data.limit))}
              >
                ← Prev
              </AdminButton>
              <AdminButton
                variant="secondary"
                size="sm"
                disabled={data.offset + data.limit >= data.total}
                onClick={() => setOffset(data.offset + data.limit)}
              >
                Next →
              </AdminButton>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusTile({
  label,
  count,
  active,
  onClick,
  tone = 'zinc',
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tone?: 'zinc' | 'emerald' | 'amber' | 'rose';
}) {
  const toneClasses = {
    zinc: 'border-zinc-700 text-zinc-300',
    emerald: 'border-emerald-700/60 text-emerald-300',
    amber: 'border-amber-700/60 text-amber-300',
    rose: 'border-rose-700/60 text-rose-300',
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-md border bg-zinc-900 p-3 text-left transition-colors',
        toneClasses,
        active ? 'ring-2 ring-emerald-500/50' : 'hover:bg-zinc-800',
      ].join(' ')}
    >
      <p className="text-[11px] uppercase tracking-widest">{label}</p>
      <p className="mt-0.5 text-2xl font-bold text-zinc-100">{count}</p>
    </button>
  );
}

function MedicineCard({ med, onChanged }: { med: MedicineRow; onChanged: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const previewSrc =
    med.imagePublicUrl ||
    med.imageUrl ||
    placeholderUrl({
      id: med.id,
      brand: med.brand,
      name: med.name,
      manufacturer: med.manufacturer ?? undefined,
      dosage: med.dosage ?? undefined,
      category: med.category,
      rxRequired: med.rxRequired,
    });

  async function handleFile(file: File) {
    setUploading(true);
    setUploadErr(null);
    setWarning(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('source', 'admin_upload');
      const r = await fetch(`/api/admin/medicines/${med.id}/image`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const body = await r.json().catch(() => null);
      if (!r.ok) {
        throw new Error(body?.error || `HTTP ${r.status}`);
      }
      if (body?.warnings?.length) {
        setWarning(body.warnings[0].message);
      }
      onChanged();
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleVerify() {
    await fetch(`/api/admin/medicines/${med.id}/image`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ verified: true, confidence: 100 }),
    });
    onChanged();
  }

  async function handleDelete() {
    if (!confirm(`Remove the uploaded image for ${med.brand}? The SVG placeholder will be used.`)) return;
    await fetch(`/api/admin/medicines/${med.id}/image`, {
      method: 'DELETE',
      credentials: 'include',
    });
    onChanged();
  }

  const hasUpload = !!med.imagePublicUrl;
  const isVerified = !!med.imageVerifiedAt;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="relative aspect-square bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt={`${med.brand} preview`}
          className="h-full w-full object-contain p-3"
          loading="lazy"
        />
        <div className="absolute right-2 top-2 flex gap-1">
          {isVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-zinc-950">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          )}
          {hasUpload && !isVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-zinc-950">
              <AlertTriangle className="h-3 w-3" /> Review
            </span>
          )}
          {!hasUpload && (
            <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
              Placeholder
            </span>
          )}
        </div>
      </div>

      <div className="p-3">
        <p className="truncate text-sm font-semibold text-zinc-100">{med.brand}</p>
        <p className="truncate text-xs text-zinc-400">
          {med.name}
          {med.dosage ? ` · ${med.dosage}` : ''}
        </p>
        {med.imageWidth && med.imageHeight && (
          <p className="mt-0.5 text-[10px] text-zinc-500">
            {med.imageWidth}×{med.imageHeight} ·{' '}
            {med.imageBytes ? `${(med.imageBytes / 1024).toFixed(0)} KB` : '?'} ·{' '}
            {med.imageSource}
            {med.imageConfidence != null ? ` · conf ${med.imageConfidence}` : ''}
          </p>
        )}

        {warning && (
          <p className="mt-2 rounded border border-amber-700/40 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-300">
            {warning}
          </p>
        )}
        {uploadErr && (
          <p className="mt-2 rounded border border-rose-700/40 bg-rose-950/30 px-2 py-1 text-[11px] text-rose-300">
            {uploadErr}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-emerald-500 px-2.5 py-1.5 text-[11px] font-medium text-zinc-950 hover:bg-emerald-400">
            <Upload className="h-3.5 w-3.5" />
            {uploading ? 'Uploading…' : hasUpload ? 'Replace' : 'Upload'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = '';
              }}
            />
          </label>
          {hasUpload && !isVerified && (
            <button
              type="button"
              onClick={handleVerify}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-700/60 bg-emerald-950/40 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-900/50"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Verify
            </button>
          )}
          {hasUpload && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-zinc-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
