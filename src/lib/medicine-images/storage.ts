/**
 * Medicine-image storage adapter.
 *
 * Two backends, picked at runtime by env-var sniffing:
 *
 *   ─ VercelBlobStorage  — production. Requires BLOB_READ_WRITE_TOKEN.
 *                          Returns a public CDN URL after upload.
 *   ─ LocalFsStorage     — dev / self-hosted. Writes to a directory on
 *                          disk; served via /api/medicines/{id}/image.
 *
 * Why a separate module from src/lib/storage.ts (the prescription store)?
 *   Prescriptions are PHI — every read is access-controlled, files never
 *   touch the CDN. Medicine packshots are PUBLIC — they ARE the CDN
 *   content. Mixing the two in one adapter leads to a single config
 *   change accidentally exposing PHI. Keep them physically separate.
 *
 * The adapter intentionally exposes only three operations:
 *   put(key, bytes, mime) → publicUrl
 *   remove(key)
 *   publicUrl(key)          (sync, when the caller already knows the key)
 *
 * Read is via HTTP GET against the returned public URL — no `.get()`
 * method, because we never proxy bytes through the app. The CDN serves
 * them directly, which is what makes the pipeline fast.
 */

import { mkdir, writeFile, unlink, stat } from 'fs/promises';
import { join } from 'path';

export interface MedicineImageStorage {
  /** Store bytes under `key`. Returns the public URL clients can fetch. */
  put(key: string, bytes: Buffer, mime: string): Promise<string>;
  /** Remove if present. Idempotent — must not throw on "not found". */
  remove(key: string): Promise<void>;
  /** Return the public URL for an already-stored key. */
  publicUrl(key: string): string;
  /** Human label for logs / admin UI ("vercel-blob" | "local-fs"). */
  readonly backendName: string;
}

// ----------------------------------------------------------------------------
//  Vercel Blob (production)
// ----------------------------------------------------------------------------

class VercelBlobStorage implements MedicineImageStorage {
  readonly backendName = 'vercel-blob';

  async put(key: string, bytes: Buffer, mime: string): Promise<string> {
    // Dynamic import — the package is optional at install time; we only
    // load it when this backend is actually selected. Keeps `next build`
    // happy in environments without the package.
    const { put } = await import('@vercel/blob');
    const result = await put(key, bytes, {
      access: 'public',
      contentType: mime,
      // Vercel Blob auto-adds a random suffix unless told otherwise; we want
      // deterministic URLs because the storage key already includes our hash.
      addRandomSuffix: false,
      // Aggressive cache — content is content-addressable (key includes hash).
      cacheControlMaxAge: 31536000,
    });
    return result.url;
  }

  async remove(key: string): Promise<void> {
    const { del } = await import('@vercel/blob');
    try {
      await del(this.publicUrl(key));
    } catch {
      // Idempotent: 'not found' is a success outcome for callers.
    }
  }

  publicUrl(key: string): string {
    // Vercel Blob returns the canonical URL at upload time. For lookups by key
    // alone we can't construct it without the store hostname, but in practice
    // we always have the cached `imagePublicUrl` column for that purpose.
    // This stub is only called when the caller HAS the public URL and is
    // asking for it back — return the key as-is, assuming the caller already
    // stored the full URL in their DB.
    return key.startsWith('http') ? key : key;
  }
}

// ----------------------------------------------------------------------------
//  Local filesystem (dev + single-VM self-hosting)
// ----------------------------------------------------------------------------

class LocalFsStorage implements MedicineImageStorage {
  readonly backendName = 'local-fs';

  constructor(
    /** Absolute dir on disk where bytes live. */
    private readonly dir: string,
    /** Public route serving back those bytes (e.g. /api/medicines/file). */
    private readonly servePath: string,
  ) {}

  async put(key: string, bytes: Buffer, _mime: string): Promise<string> {
    await mkdir(this.dir, { recursive: true });
    // The key path includes sub-dirs; ensure each segment exists.
    const target = join(this.dir, key);
    const parent = target.substring(0, target.lastIndexOf('/'));
    if (parent && parent !== this.dir) {
      await mkdir(parent, { recursive: true });
    }
    await writeFile(target, bytes);
    return this.publicUrl(key);
  }

  async remove(key: string): Promise<void> {
    try {
      await unlink(join(this.dir, key));
    } catch {
      // Idempotent.
    }
  }

  publicUrl(key: string): string {
    // Encoded key — defends against any future key that includes slashes
    // or special chars in the URL path. Currently keys are hash-based so
    // this is overkill, but cheap.
    return `${this.servePath}/${encodeURIComponent(key)}`;
  }

  /** Used by the serving route to read bytes back. */
  async read(key: string): Promise<Buffer | null> {
    try {
      await stat(join(this.dir, key));
    } catch {
      return null;
    }
    const { readFile } = await import('fs/promises');
    return readFile(join(this.dir, key));
  }
}

/**
 * Local-FS reader, exported so the file-serving route can dereference keys
 * without re-instantiating the adapter and its env detection.
 */
export const LOCAL_STORAGE_DIR =
  process.env.MEDICINE_IMAGE_DIR || join(process.cwd(), '.local-uploads', 'medicines');
export const LOCAL_STORAGE_SERVE_PATH = '/api/medicines/file';

const localBackend = new LocalFsStorage(LOCAL_STORAGE_DIR, LOCAL_STORAGE_SERVE_PATH);

// ----------------------------------------------------------------------------
//  Backend selection
// ----------------------------------------------------------------------------

let selected: MedicineImageStorage | null = null;

/**
 * Get the active storage backend. Memoized — picks once per process.
 *
 *   BLOB_READ_WRITE_TOKEN set → Vercel Blob
 *   otherwise                 → Local FS
 *
 * Test suites can override by setting `selected` directly.
 */
export function getMedicineImageStorage(): MedicineImageStorage {
  if (selected) return selected;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    selected = new VercelBlobStorage();
  } else {
    selected = localBackend;
  }
  return selected;
}

/** Reader for the local backend (used by the file-serve route). Returns null when not on local FS. */
export function getLocalReader(): LocalFsStorage | null {
  return getMedicineImageStorage().backendName === 'local-fs' ? localBackend : null;
}
