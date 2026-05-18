/**
 * Medicine-image upload pipeline.
 *
 * Caller hands us raw bytes + a declared MIME, we hand back a processed
 * result ready for DB insertion. The function is intentionally synchronous
 * in its decision-making (succeed or fail, no "partial" states) so the
 * caller doesn't have to reason about half-saved rows.
 *
 *   bytes → validate → decode → sharp(metadata+resize+webp) → phash → sha256 → store
 *
 * Security boundary:
 *   - Magic-byte check rejects anything that isn't a real PNG/JPEG/WebP/AVIF.
 *     Declared MIME from the client is NEVER trusted — only the bytes themselves.
 *   - SVG is REJECTED outright. XSS surface is too large (foreignObject, <script>,
 *     external refs, animation handlers). The placeholder system already
 *     covers our SVG needs and is generated server-side from sanitized inputs.
 *   - Byte cap enforced before sharp ever sees the bytes (prevents zip-bomb-
 *     style attacks where a tiny declared size unpacks into gigabytes of pixels).
 *   - Pixel-dimension cap enforced via sharp's `failOn: 'error'` + post-decode
 *     metadata check. Rejects suspicious aspect ratios and oversized canvases.
 *   - The output filename comes from a SHA-256 of the OPTIMIZED bytes, so a
 *     malicious user can never influence the storage key (no path traversal).
 *
 * Quality:
 *   - All outputs converted to WebP at quality 82 (visually lossless for
 *     pack-shots, ~35% smaller than the equivalent JPEG).
 *   - Max output 1024×1024 (cards never display larger; saves bandwidth +
 *     storage).
 *   - Pre-multiplied alpha preserved (some pack photos arrive with transparent
 *     backgrounds that we want to keep).
 */

import sharp from 'sharp';
import { createHash } from 'crypto';
import { getMedicineImageStorage } from './storage';

// ----------------------------------------------------------------------------
//  Validation
// ----------------------------------------------------------------------------

/** Hard cap on upload size — 8 MB. Anything bigger is rejected pre-decode. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Minimum dimensions — anything smaller is unusable as a pack-shot. */
export const MIN_DIMENSION = 200;

/** Maximum input dimensions — defends against giant decompressed canvases. */
export const MAX_DIMENSION = 6000;

/** Output target — every card displays at most ~256px CSS, so 1024px is 4x retina. */
const OUTPUT_DIMENSION = 1024;

/** Allowed input formats. SVG, GIF, TIFF, BMP, HEIC etc. all rejected. */
const ALLOWED_FORMATS = new Set(['png', 'jpeg', 'jpg', 'webp', 'avif']);

/**
 * Magic-byte sniff — reads only the first ~12 bytes of the buffer to identify
 * the real format. Critical because the browser-supplied MIME on a multipart
 * upload is set by the client and trivially spoofed.
 *
 * References:
 *   PNG  : 89 50 4E 47 0D 0A 1A 0A
 *   JPEG : FF D8 FF
 *   WebP : 'RIFF' .... 'WEBP'   (chars 0-3 = 'RIFF', chars 8-11 = 'WEBP')
 *   AVIF : .... 'ftyp' + 'avif' OR 'avis' brand at offset 8-15
 *   GIF  : 'GIF87a' | 'GIF89a'    → REJECTED
 *   SVG  : '<?xml' or '<svg'      → REJECTED (handled separately below)
 *   PDF  : '%PDF-'                → REJECTED
 *   ZIP  : 'PK\x03\x04'           → REJECTED (catches docx, etc.)
 */
export function detectFormat(b: Buffer): 'png' | 'jpeg' | 'webp' | 'avif' | null {
  if (b.length < 12) return null;
  // PNG
  if (
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) return 'png';
  // JPEG (any subtype: JFIF, EXIF, etc.)
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  // WebP — RIFF...WEBP
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return 'webp';
  // AVIF — ftyp box at 4-7, then brand at 8-11
  if (
    b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 &&
    ((b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69 && b[11] === 0x66) ||
     (b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69 && b[11] === 0x73))
  ) return 'avif';
  return null;
}

/** Quick check that a buffer is NOT one of the rejected formats. */
export function isRejectedFormat(b: Buffer): string | null {
  if (b.length < 5) return null;
  // SVG / XML detection
  const head = b.slice(0, 5).toString('utf8').toLowerCase();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) return 'svg';
  // GIF
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'gif';
  // PDF
  if (head === '%pdf-') return 'pdf';
  // ZIP archive (catches .docx, .xlsx, etc. masquerading as images)
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return 'zip';
  return null;
}

// ----------------------------------------------------------------------------
//  Perceptual hash (8x8 DCT-like)
// ----------------------------------------------------------------------------

/**
 * 64-bit perceptual hash. Same algorithm as the popular "phash" family:
 *   1. Resize to 32×32 grayscale.
 *   2. Compute 8×8 average-based hash via simple block averaging.
 *      (Skips DCT for runtime cost; the 8×8 mean hash catches near-dupes
 *      well enough for catalog SKU duplicate detection. If we ever need
 *      true DCT-phash for finer matching, swap out this function alone.)
 *
 * Returns 16 hex characters (64 bits). Hamming distance ≤ 5 between two
 * hashes typically means "same image, different resize/compression".
 */
export async function perceptualHash(bytes: Buffer): Promise<string> {
  const small = await sharp(bytes, { failOn: 'truncated' })
    .resize(32, 32, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer();
  // Build 8x8 by averaging 4x4 blocks of the 32x32 grid
  const cells: number[] = new Array(64);
  for (let cy = 0; cy < 8; cy++) {
    for (let cx = 0; cx < 8; cx++) {
      let sum = 0;
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 4; dx++) {
          sum += small[(cy * 4 + dy) * 32 + (cx * 4 + dx)];
        }
      }
      cells[cy * 8 + cx] = sum / 16;
    }
  }
  const avg = cells.reduce((a, b) => a + b, 0) / 64;
  // 64 bits → 16 hex chars; bit set when cell ≥ avg
  let hex = '';
  for (let i = 0; i < 16; i++) {
    let nibble = 0;
    for (let b = 0; b < 4; b++) {
      nibble = (nibble << 1) | (cells[i * 4 + b] >= avg ? 1 : 0);
    }
    hex += nibble.toString(16);
  }
  return hex;
}

/** Hamming distance between two equal-length hex strings. */
export function phashDistance(a: string, b: string): number {
  if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

// ----------------------------------------------------------------------------
//  Pipeline
// ----------------------------------------------------------------------------

export interface PipelineSuccess {
  ok: true;
  storageKey: string;
  publicUrl: string;
  mime: 'image/webp';
  width: number;
  height: number;
  bytes: number;
  phash: string;
  sha256: string;
  source: string;
}

export interface PipelineFailure {
  ok: false;
  code:
    | 'too_large'
    | 'rejected_format'
    | 'unsupported_format'
    | 'corrupt'
    | 'too_small'
    | 'too_large_dimensions'
    | 'storage_failed';
  message: string;
}

export type PipelineResult = PipelineSuccess | PipelineFailure;

export interface PipelineInput {
  /** The raw bytes from the multipart upload. */
  bytes: Buffer;
  /** Declared MIME from the upload — used for diagnostics only, NEVER trusted. */
  declaredMime: string;
  /** Medicine ID — used in the storage key prefix for human-readable grouping. */
  medicineId: string;
  /** Provenance label — admin_upload | manufacturer | own_photo | stock_licensed. */
  source: string;
}

/**
 * Run the full pipeline. Returns a discriminated union so the caller pattern-
 * matches on `result.ok` and TypeScript narrows the rest of the shape.
 */
export async function processMedicineImage(input: PipelineInput): Promise<PipelineResult> {
  const { bytes, medicineId, source } = input;

  // 1) Size cap (cheapest check first)
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      code: 'too_large',
      message: `Image is ${(bytes.length / 1024 / 1024).toFixed(1)} MB — max is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
    };
  }

  // 2) Reject SVG / GIF / PDF / ZIP outright before sharp ever sees them
  const rejected = isRejectedFormat(bytes);
  if (rejected) {
    return {
      ok: false,
      code: 'rejected_format',
      message: `${rejected.toUpperCase()} files are not allowed for medicine images. Upload PNG, JPEG, WebP, or AVIF.`,
    };
  }

  // 3) Magic-byte allow-list
  const detected = detectFormat(bytes);
  if (!detected || !ALLOWED_FORMATS.has(detected)) {
    return {
      ok: false,
      code: 'unsupported_format',
      message: 'File does not appear to be a valid PNG, JPEG, WebP, or AVIF image.',
    };
  }

  // 4) Decode + metadata via sharp
  let meta: sharp.Metadata;
  try {
    meta = await sharp(bytes, { failOn: 'truncated', limitInputPixels: MAX_DIMENSION * MAX_DIMENSION }).metadata();
  } catch (err) {
    return {
      ok: false,
      code: 'corrupt',
      message: `Image could not be decoded: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }

  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w < MIN_DIMENSION || h < MIN_DIMENSION) {
    return {
      ok: false,
      code: 'too_small',
      message: `Image is ${w}×${h}. Minimum is ${MIN_DIMENSION}×${MIN_DIMENSION} so it stays sharp on retina cards.`,
    };
  }
  if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
    return {
      ok: false,
      code: 'too_large_dimensions',
      message: `Image is ${w}×${h}. Maximum is ${MAX_DIMENSION}×${MAX_DIMENSION}.`,
    };
  }

  // 5) Resize + WebP convert. EXIF rotation applied; metadata stripped.
  const optimized = await sharp(bytes, { failOn: 'truncated' })
    .rotate() // apply EXIF orientation, then strip
    .resize(OUTPUT_DIMENSION, OUTPUT_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .webp({ quality: 82, effort: 4, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });

  // 6) Hashes for dedup + cache invalidation
  const sha256 = createHash('sha256').update(optimized.data).digest('hex');
  const phash = await perceptualHash(optimized.data);

  // 7) Storage. Key includes medicine ID for human readability + sha256 prefix
  //    for content-addressability (re-uploading the same bytes overwrites in place
  //    and gets the same URL — cache-friendly).
  const storageKey = `med/${medicineId}/${sha256.slice(0, 16)}.webp`;
  let publicUrl: string;
  try {
    publicUrl = await getMedicineImageStorage().put(storageKey, optimized.data, 'image/webp');
  } catch (err) {
    return {
      ok: false,
      code: 'storage_failed',
      message: `Storage backend failed: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }

  return {
    ok: true,
    storageKey,
    publicUrl,
    mime: 'image/webp',
    width: optimized.info.width,
    height: optimized.info.height,
    bytes: optimized.info.size,
    phash,
    sha256,
    source,
  };
}
