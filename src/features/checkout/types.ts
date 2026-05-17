import type { CartItem } from '@/features/products/types';
import type { CheckoutForm, DeliveryType, PaymentMethod } from './schema';

export type OrderStatus = 'placed' | 'confirmed' | 'dispatched' | 'delivered';

export interface Order {
  id: string;
  placedAt: number; // epoch ms
  items: CartItem[];
  customer: CheckoutForm;
  /** Money in paise/INR (whole rupees) */
  subtotal: number;
  mrpTotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  deliveryType: DeliveryType;
  status: OrderStatus;
  /** Whether any item in the order requires a prescription */
  requiresPrescription: boolean;
}
