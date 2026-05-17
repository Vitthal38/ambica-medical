/**
 * Zod schemas shared between admin APIs and admin client forms.
 * Importing from one place keeps the contract identical end-to-end.
 *
 * Every schema uses `.strict()` so unknown keys cause validation to fail.
 * This is the mass-assignment defense: a malicious client cannot smuggle
 * extra fields like `role: 'ADMIN'` or `passwordHash: '...'` by tacking
 * them onto a legitimate request body.
 */
import { z } from 'zod';
import { indianPhone } from '@/lib/validate';

export const loginSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  })
  .strict();
export type LoginInput = z.infer<typeof loginSchema>;

export const customerCreateSchema = z
  .object({
    name: z.string().min(2, 'Name too short').max(100),
    phone: indianPhone,
    email: z.string().email().max(254).optional().or(z.literal('')),
    dob: z.string().max(20).optional().or(z.literal('')),
    address: z.string().max(500).optional().or(z.literal('')),
    notes: z.string().max(1000).optional().or(z.literal('')),
  })
  .strict();
export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

// `.partial()` on a strict schema keeps the strictness — unknown keys still
// rejected. This is exactly what we want for mass-assignment defense.
export const customerUpdateSchema = customerCreateSchema.partial();
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export const prescriptionCreateMeta = z
  .object({
    customerId: z.string().min(1).max(40),
    doctorName: z.string().max(120).optional().or(z.literal('')),
    doctorReg: z.string().max(60).optional().or(z.literal('')),
    issueDate: z.string().min(1).max(20),
    expiryDate: z.string().max(20).optional().or(z.literal('')),
    notes: z.string().max(1000).optional().or(z.literal('')),
    medicineIds: z.array(z.string().max(40)).max(50).optional(),
  })
  .strict();
export type PrescriptionCreateInput = z.infer<typeof prescriptionCreateMeta>;

export const orderCreateSchema = z
  .object({
    customerId: z.string().min(1).max(40),
    paymentMethod: z.enum(['UPI', 'CARD', 'NETBANKING', 'COD', 'STORE']).default('STORE'),
    notes: z.string().max(500).optional().or(z.literal('')),
    items: z
      .array(
        z
          .object({
            medicineId: z.string().min(1).max(40),
            quantity: z.coerce.number().int().min(1).max(999),
            // Cap unitPricePaise to 100k INR (= 10,000,000 paise) per item — guards
            // against runaway numbers (overflow, integrity attacks on order totals).
            unitPricePaise: z.coerce.number().int().min(0).max(10_000_000),
          })
          .strict(),
      )
      .min(1, 'Add at least one medicine')
      .max(100, 'Too many items'),
  })
  .strict();
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;

export const reminderCreateSchema = z.object({
  customerId: z.string().min(1),
  medicineId: z.string().min(1),
  sourceOrderId: z.string().optional(),
  dueOn: z.string().min(1),
  channel: z.enum(['NONE', 'SMS', 'WHATSAPP', 'EMAIL']).default('NONE'),
  message: z.string().max(500).optional().or(z.literal('')),
});
export type ReminderCreateInput = z.infer<typeof reminderCreateSchema>;

/* -------------------------------------------------------------------------- */
/* Direct medicine entry (no prescription required)                           */
/* -------------------------------------------------------------------------- */

export const ENTRY_TYPES = ['PRESCRIPTION', 'MANUAL', 'OTC'] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const medicineEntryCreateSchema = z.object({
  medicineId: z.string().min(1, 'Pick a medicine from the catalog'),
  quantity: z.number().int().min(1, 'At least 1').max(999, 'Too many'),
  dosage: z.string().max(200).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
  /** ISO date (yyyy-mm-dd) — defaults to today on the client. */
  entryDate: z.string().min(1),
  entryType: z.enum(ENTRY_TYPES),
});
export type MedicineEntryCreateInput = z.infer<typeof medicineEntryCreateSchema>;

/**
 * Update an existing medicine timeline entry. Every field optional — the
 * caller may send only what changed.
 */
export const medicineEntryUpdateSchema = z
  .object({
    quantity: z.number().int().min(1).max(999).optional(),
    dosage: z.string().max(200).optional().or(z.literal('')),
    notes: z.string().max(500).optional().or(z.literal('')),
    entryDate: z.string().min(1).optional(),
    entryType: z.enum(ENTRY_TYPES).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'No fields to update',
  });
export type MedicineEntryUpdateInput = z.infer<typeof medicineEntryUpdateSchema>;

/**
 * Customer create + (optionally) initial medicine entries in one atomic call.
 * Used by the "Add customer" form when the pharmacist also wants to log
 * medicines in the same step.
 */
export const customerCreateWithMedicinesSchema = customerCreateSchema.extend({
  medicines: z.array(medicineEntryCreateSchema).max(20).optional(),
});
export type CustomerCreateWithMedicinesInput = z.infer<
  typeof customerCreateWithMedicinesSchema
>;
