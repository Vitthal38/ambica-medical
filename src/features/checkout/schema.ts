import { z } from 'zod';

export const PAYMENT_METHODS = ['upi', 'card', 'netbanking', 'cod'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const DELIVERY_TYPES = ['home-delivery', 'store-pickup'] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

export const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Please enter your full name'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number'),
  email: z
    .string()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('')),
  addressLine: z.string().min(8, 'Please enter a complete street address'),
  landmark: z.string().max(80, 'Landmark too long').optional().or(z.literal('')),
  city: z.string().min(2, 'City is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a 6-digit pincode'),
  deliveryType: z.enum(DELIVERY_TYPES),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: z.string().max(500, 'Notes too long').optional().or(z.literal('')),
});

export type CheckoutForm = z.infer<typeof checkoutSchema>;
