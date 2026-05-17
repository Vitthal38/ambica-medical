/**
 * Pluggable storage for prescription files.
 *
 *  - Files are stored OUTSIDE `public/` so they can never be served statically.
 *  - The admin downloads via `/api/admin/prescriptions/[id]/file` after auth.
 *  - Local-FS implementation by default. Swap to S3/R2/Vercel Blob in prod
 *    by replacing `storage` with another implementation of the same interface.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface Storage {
  /** Persist bytes. Returns the opaque `storageKey` used to read back. */
  put(bytes: Buffer, opts: { mimeType: string; extension: string }): Promise<string>;
  /** Read bytes back. Throws on missing. */
  get(key: string): Promise<Buffer>;
  /** Best-effort delete. Should not throw on missing. */
  remove(key: string): Promise<void>;
}

class LocalFsStorage implements Storage {
  constructor(private root: string) {}

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
  }

  async put(bytes: Buffer, opts: { mimeType: string; extension: string }): Promise<string> {
    await this.ensureDir();
    const id = crypto.randomBytes(16).toString('hex');
    // Date-partitioned for easier on-disk navigation in big stores.
    const yyyy = new Date().getUTCFullYear().toString();
    const mm = String(new Date().getUTCMonth() + 1).padStart(2, '0');
    const dir = path.join(this.root, yyyy, mm);
    await fs.mkdir(dir, { recursive: true });
    const key = `${yyyy}/${mm}/${id}.${opts.extension}`;
    await fs.writeFile(path.join(this.root, key), bytes, { mode: 0o600 });
    return key;
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(path.join(this.root, key));
  }

  async remove(key: string): Promise<void> {
    try {
      await fs.unlink(path.join(this.root, key));
    } catch {
      /* ignore missing */
    }
  }
}

// Default to a sibling-of-project private directory so it's never bundled.
// Override with PRESCRIPTION_STORAGE_DIR for a custom location.
const DEFAULT_DIR = path.join(process.cwd(), '.private', 'prescriptions');

/**
 * Production safety net.
 *
 * The default LocalFsStorage writes to the host's filesystem. That's fine in
 * dev and on a single VM, but on serverless platforms (Vercel functions, AWS
 * Lambda) the filesystem is EPHEMERAL — files written during one request are
 * gone before the next request lands. Silently storing prescriptions in
 * /tmp would mean later downloads return 500s or, worse, succeed against
 * stale bytes from a recycled lambda.
 *
 * The guard fires LAZILY — on the first .put() or .get() call. Throwing at
 * module-init time would break Next.js's build-phase page-data collection
 * (the storage module is imported just to inspect the route, not to run it).
 *
 * In production, refuse to fall back to local FS unless the operator has
 * explicitly opted in by setting PRESCRIPTION_STORAGE_DIR (e.g. on their own
 * VM with persistent disk) or ALLOW_LOCAL_FS_STORAGE_IN_PRODUCTION=1.
 * Otherwise the operator MUST replace the `storage` export below with an
 * object-store implementation (S3 / R2 / Vercel Blob).
 */
function assertSafeForProduction(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const isVercel = !!process.env.VERCEL;
  const optedIn =
    !!process.env.PRESCRIPTION_STORAGE_DIR ||
    process.env.ALLOW_LOCAL_FS_STORAGE_IN_PRODUCTION === '1';
  if (isProd && isVercel && !optedIn) {
    throw new Error(
      'Local-FS prescription storage is not safe on Vercel (ephemeral disk). ' +
        'Replace src/lib/storage.ts with an object-store implementation ' +
        '(S3, R2, Vercel Blob) before serving production traffic. ' +
        'To explicitly opt in for evaluation, set ALLOW_LOCAL_FS_STORAGE_IN_PRODUCTION=1 ' +
        '— uploads will appear to work but files will not persist across function ' +
        'invocations and downloads will fail.',
    );
  }
}

/** Wrap the local-FS storage in a lazy guard that checks each I/O call. */
class GuardedLocalFsStorage implements Storage {
  constructor(private inner: LocalFsStorage) {}
  put(bytes: Buffer, opts: { mimeType: string; extension: string }): Promise<string> {
    assertSafeForProduction();
    return this.inner.put(bytes, opts);
  }
  get(key: string): Promise<Buffer> {
    assertSafeForProduction();
    return this.inner.get(key);
  }
  remove(key: string): Promise<void> {
    // Removal is fine even if storage is later swapped — best-effort cleanup.
    return this.inner.remove(key);
  }
}

export const storage: Storage = new GuardedLocalFsStorage(
  new LocalFsStorage(process.env.PRESCRIPTION_STORAGE_DIR || DEFAULT_DIR),
);

export function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'application/pdf':
      return 'pdf';
    default:
      return 'bin';
  }
}
