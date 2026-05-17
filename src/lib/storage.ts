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

export const storage: Storage = new LocalFsStorage(
  process.env.PRESCRIPTION_STORAGE_DIR || DEFAULT_DIR,
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
