'use client';

import { useRef, useState } from 'react';
import { UploadCloud, FileText, ImageIcon, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { fileMetaSchema, ALLOWED_TYPES, ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from './schema';
import { usePrescriptionStore } from './prescriptionStore';
import { cn } from '@/lib/cn';

// MIME types AND file extensions so the picker accepts .jpeg + .webp even on
// platforms where the browser reports an empty `file.type` for those.
const ACCEPT_ATTR = [...ALLOWED_TYPES, ...ALLOWED_EXTENSIONS].join(',');

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function StepUpload() {
  const { file, setFile } = usePrescriptionStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (raw: File) => {
    setError(null);
    const dataUrl = await readAsDataUrl(raw);
    const result = fileMetaSchema.safeParse({
      name: raw.name,
      size: raw.size,
      type: raw.type,
      dataUrl,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid file');
      return;
    }
    setFile(result.data);
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await handleFile(f);
    e.target.value = '';
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) await handleFile(f);
  };

  const next = () => usePrescriptionStore.setState({ step: 2 });

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Upload your prescription</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Drag &amp; drop, or browse to upload. We accept JPG / JPEG, PNG, WebP or PDF up to 5&nbsp;MB.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-white p-10 text-center transition-colors',
          dragOver
            ? 'border-primary-500 bg-primary-50/50'
            : 'border-neutral-300 hover:border-primary-400',
        )}
      >
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
          <UploadCloud className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <p className="text-sm font-semibold text-neutral-900">
          Drag a file here, or
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="ml-1 text-primary-700 underline-offset-2 hover:underline"
          >
            click to browse
          </button>
        </p>
        <p className="text-xs text-neutral-500">JPG / JPEG · PNG · WebP · PDF · max 5MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          onChange={onPick}
        />
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 border border-rose-100">
          {error}
        </p>
      )}

      {file && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-card">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
            {file.type === 'application/pdf' ? (
              <FileText className="h-5 w-5" />
            ) : (
              <ImageIcon className="h-5 w-5" />
            )}
          </span>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-semibold">{file.name}</p>
            <p className="text-xs text-neutral-500">
              {(file.size / 1024).toFixed(0)} KB · {file.type.split('/').pop()?.toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={() => usePrescriptionStore.setState({ file: undefined, status: 'idle' })}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-danger"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button size="lg" onClick={next} disabled={!file}>
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <p className="mt-6 text-[11px] text-neutral-500">
        Your prescription is encrypted in transit and visible only to our licensed pharmacist (Lic. No: MH-AUR-00001).
        Maximum file size: {(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)} MB.
      </p>
    </div>
  );
}
