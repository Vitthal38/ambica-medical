import { z } from 'zod';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
/**
 * File extensions we accept. Kept alongside ALLOWED_TYPES because browser
 * file pickers honour `accept=` either way, and some platforms (notably
 * Windows on `.jpeg` files) hand back `file.type === ''`. In that case we
 * fall back to the extension. The real type check is the server's magic-byte
 * sniff — see src/lib/security/file-validation.ts.
 */
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'] as const;

/** Returns true if `file.type` is allowed OR (when missing) the filename has
 *  an allowed extension. Use this everywhere instead of a strict MIME check. */
export function isAllowedFile(name: string, type: string): boolean {
  if (type && ALLOWED_TYPES.includes(type)) return true;
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export const fileMetaSchema = z.object({
  name: z.string(),
  size: z
    .number()
    .max(MAX_FILE_SIZE, `File must be 5 MB or smaller`),
  type: z.string(),
  dataUrl: z.string(),
}).refine(
  (v) => isAllowedFile(v.name, v.type),
  { message: 'Only JPG / JPEG / PNG / WebP / PDF allowed', path: ['type'] },
);

export type FileMeta = z.infer<typeof fileMetaSchema>;

export const patientSchema = z.object({
  fullName: z.string().min(2, 'Please enter the patient name'),
  age: z
    .string()
    .regex(/^\d+$/, 'Age must be a whole number')
    .refine((v) => {
      const n = Number(v);
      return n >= 1 && n <= 120;
    }, 'Please enter a valid age (1–120)'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number'),
  address: z.string().min(10, 'Please enter a complete address'),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export type PatientForm = z.infer<typeof patientSchema>;
