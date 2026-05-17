import type { Metadata } from 'next';
import { CheckoutView } from './checkout-view';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Confirm your delivery details and place your order with Ambica Medical.',
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
