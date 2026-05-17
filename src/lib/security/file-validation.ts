/**
 * Server-side file content validation — magic-byte ("file signature") sniff.
 *
 * Why: the browser-reported `file.type` is fully attacker-controlled. A
 * malicious user can upload an HTML/JS payload with `Content-Type: image/png`.
 * Combined with a future header-stripping bug, the file could be served as
 * HTML and execute in the admin's browser.
 *
 * Defense: read the first few bytes and confirm they match a known signature
 * for the allowed MIME types. Mismatch → reject the upload.
 *
 * We DO NOT use a third-party MIME-detection library (those have their own
 * CVE history) — we hand-roll the signature checks for our small allowlist.
 *
 * Supported types and their signatures:
 *   image/jpeg : FF D8 FF
 *   image/png  : 89 50 4E 47 0D 0A 1A 0A
 *   image/webp : 52 49 46 46 ?? ?? ?? ?? 57 45 42 50  (RIFF…WEBP)
 *   application/pdf : 25 50 44 46 2D                  (%PDF-)
 *
 * Returns:
 *   { ok: true, mimeType }  — bytes match the claimed type
 *   { ok: false, error }    — reject; error is safe to surface to the client
 */
export const ALLOWED_UPLOAD_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
export type AllowedUploadMime = (typeof ALLOWED_UPLOAD_MIME)[number];

export interface SniffOk {
  ok: true;
  mimeType: AllowedUploadMime;
}
export interface SniffFail {
  ok: false;
  error: string;
}
export type SniffResult = SniffOk | SniffFail;

/**
 * Detect MIME from the first bytes and confirm it matches the claimed value.
 * Pass `claimedMime` (from the multipart File.type) so we reject mismatches
 * loudly — silent reassignment would let an attacker upload a PDF when the
 * UI thinks it's an image, for example.
 */
export function sniffUpload(bytes: Buffer, claimedMime: string): SniffResult {
  if (bytes.length < 12) {
    return { ok: false, error: 'File too small to validate.' };
  }
  const detected = detectMime(bytes);
  if (!detected) {
    return { ok: false, error: 'File type not recognized.' };
  }
  if (detected !== claimedMime) {
    return {
      ok: false,
      error: `File content (${detected}) does not match the declared type (${claimedMime}).`,
    };
  }
  if (!ALLOWED_UPLOAD_MIME.includes(detected as AllowedUploadMime)) {
    return { ok: false, error: `Unsupported file type: ${detected}` };
  }
  return { ok: true, mimeType: detected as AllowedUploadMime };
}

function detectMime(b: Buffer): string | null {
  // JPEG
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  // PNG
  if (
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return 'image/png';
  }
  // WebP: RIFF????WEBP
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return 'image/webp';
  }
  // PDF: %PDF-
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) {
    return 'application/pdf';
  }
  return null;
}
