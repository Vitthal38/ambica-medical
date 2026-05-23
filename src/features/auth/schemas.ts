import { z } from 'zod';

/**
 * Customer-auth validation — shared by the API handlers and the React forms.
 *
 * Login accepts EITHER an email or a 10-digit Indian mobile as the identifier,
 * disambiguated server-side. Signup requires at least one of the two.
 */

const INDIAN_MOBILE = /^[6-9]\d{9}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Normalize a user-typed Indian mobile to the canonical 10 digits.
 * Handles the common things people actually type:
 *   "+91 98765 43210" · "+919876543210" · "098765-43210" · "9876543210"
 * Returns the cleaned 10-digit string, or the original input untouched if it
 * doesn't look like a phone (so the regex below still produces a clear error).
 */
export function normalizeIndianPhone(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  let d = input.replace(/\D/g, ''); // strip +, spaces, dashes, parens
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2); // +91 / 91 prefix
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1); // leading 0
  return d;
}

/** Strong-ish password: ≥8 chars, at least one letter and one number. */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), {
    message: 'Password needs at least one letter and one number',
  });

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your name').max(80),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .regex(EMAIL, 'Enter a valid email')
      .optional()
      .or(z.literal('')),
    phone: z.preprocess(
      normalizeIndianPhone,
      z
        .string()
        .regex(INDIAN_MOBILE, 'Enter a valid Indian mobile number (10 digits, with or without +91)')
        .optional()
        .or(z.literal('')),
    ),
    password: passwordSchema,
  })
  .refine((d) => !!(d.email && d.email.length) || !!(d.phone && d.phone.length), {
    message: 'Provide an email or a mobile number',
    path: ['email'],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  /** Email or 10-digit mobile. */
  identifier: z.string().trim().min(3, 'Enter your email or mobile number'),
  password: z.string().min(1, 'Enter your password'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16),
  password: passwordSchema,
});

/** Classify a login identifier without trusting the client. */
export function classifyIdentifier(raw: string): { kind: 'email' | 'phone' | 'unknown'; value: string } {
  const v = raw.trim().toLowerCase();
  if (EMAIL.test(v)) return { kind: 'email', value: v };
  if (INDIAN_MOBILE.test(v.replace(/\D/g, '').slice(-10))) {
    return { kind: 'phone', value: v.replace(/\D/g, '').slice(-10) };
  }
  return { kind: 'unknown', value: v };
}
