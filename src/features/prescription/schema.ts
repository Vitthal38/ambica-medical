import { z } from 'zod';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const fileMetaSchema = z.object({
  name: z.string(),
  size: z
    .number()
    .max(MAX_FILE_SIZE, `File must be 5 MB or smaller`),
  type: z
    .string()
    .refine((t) => ALLOWED_TYPES.includes(t), 'Only JPG, PNG, WebP or PDF allowed'),
  dataUrl: z.string(),
});

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
