'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { useOrderStore } from '@/features/checkout/orderStore';
import { formatPrice } from '@/lib/formatPrice';

/**
 * Print-friendly invoice view.
 *
 * Browser "Save as PDF" is the simplest path to a downloadable invoice today.
 * If you wire up a real PDF generator (pdfkit / @react-pdf) later, this same
 * data binding lifts over — the layout below is the source of truth.
 */
export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const orders = useOrderStore((s) => s.orders);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (!hydrated) return null;
  const order = id ? orders[id] : undefined;
  if (!order) {
    return (
      <main className="mx-auto max-w-2xl p-10 text-center text-sm text-neutral-600">
        Invoice not found on this device.
      </main>
    );
  }

  const placed = new Date(order.placedAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <main className="mx-auto max-w-3xl bg-white p-10 text-neutral-900 print:p-0">
      {/* Print toolbar (hidden on print) */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <p className="text-xs text-neutral-500">
          Use your browser's <strong>Print → Save as PDF</strong> to download.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      {/* Letterhead */}
      <div className="flex items-start justify-between border-b border-neutral-200 pb-6">
        <div>
          <p className="text-xl font-bold tracking-tight">⚕ Ambica Medical</p>
          <p className="mt-1 text-xs text-neutral-500">
            Jawahar Colony, Trimurti Chowk, Near Hegdewar Hospital,
            <br />
            Aurangabad 431001 · +91 99999 00000 · care@ambicamedical.in
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-widest text-primary-700">
            Lic. No: MH-AUR-00001
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Invoice
          </p>
          <p className="mt-1 font-mono text-base font-semibold">{order.id}</p>
          <p className="mt-1 text-xs text-neutral-500">{placed}</p>
        </div>
      </div>

      {/* Bill to + payment */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            Billed to
          </p>
          <p className="mt-2 text-sm font-semibold">{order.customer.fullName}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-700">
            {order.customer.addressLine}
            {order.customer.landmark ? `, ${order.customer.landmark}` : ''}
            <br />
            {order.customer.city} – {order.customer.pincode}
            <br />
            +91 {order.customer.phone}
            {order.customer.email && (
              <>
                <br />
                {order.customer.email}
              </>
            )}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            Payment
          </p>
          <p className="mt-2 text-sm font-semibold uppercase">
            {order.paymentMethod === 'cod'
              ? 'Cash on Delivery'
              : order.paymentMethod === 'upi'
                ? 'UPI'
                : order.paymentMethod === 'card'
                  ? 'Card'
                  : 'Net Banking'}
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            {order.paymentMethod === 'cod' ? 'Pay on delivery' : 'Authorized'}
          </p>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            Fulfilment
          </p>
          <p className="mt-1 text-sm">
            {order.deliveryType === 'store-pickup' ? 'Store Pickup' : 'Home Delivery'}
          </p>
        </div>
      </div>

      {/* Items table */}
      <table className="mt-8 w-full border-t border-neutral-200 text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs uppercase tracking-widest text-neutral-500">
            <th className="py-2 text-left font-semibold">Item</th>
            <th className="py-2 text-right font-semibold">MRP</th>
            <th className="py-2 text-right font-semibold">Qty</th>
            <th className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map(({ product, qty }) => (
            <tr key={product.id} className="border-b border-neutral-100">
              <td className="py-2.5">
                <p className="font-medium">
                  {product.brand} · {product.name}
                </p>
                <p className="text-xs text-neutral-500">{product.pack}</p>
              </td>
              <td className="py-2.5 text-right tabular-nums text-neutral-500">
                {formatPrice(product.mrp)}
              </td>
              <td className="py-2.5 text-right tabular-nums">{qty}</td>
              <td className="py-2.5 text-right font-semibold tabular-nums">
                {formatPrice(product.price * qty)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-4 text-right text-neutral-600">
              Subtotal
            </td>
            <td className="pt-4 text-right font-semibold tabular-nums">
              {formatPrice(order.subtotal)}
            </td>
          </tr>
          {order.mrpTotal > order.subtotal && (
            <tr>
              <td colSpan={3} className="text-right text-success">
                You saved
              </td>
              <td className="text-right font-semibold tabular-nums text-success">
                −{formatPrice(order.mrpTotal - order.subtotal)}
              </td>
            </tr>
          )}
          <tr>
            <td colSpan={3} className="text-right text-neutral-600">
              Delivery
            </td>
            <td className="text-right font-semibold tabular-nums">
              {order.deliveryFee === 0 ? 'Free' : formatPrice(order.deliveryFee)}
            </td>
          </tr>
          <tr className="border-t border-neutral-200 text-base">
            <td colSpan={3} className="pt-3 text-right font-semibold">
              Total
            </td>
            <td className="pt-3 text-right text-lg font-bold tabular-nums">
              {formatPrice(order.total)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Footer note */}
      <div className="mt-10 border-t border-neutral-200 pt-4 text-[10px] leading-relaxed text-neutral-500">
        This is a system-generated invoice. Prescription items are dispatched only after
        verification by our licensed pharmacist. For queries reach us at care@ambicamedical.in or
        +91 99999 00000. Licensed under the Maharashtra Pharmacy Act, Lic. No: MH-AUR-00001.
      </div>
    </main>
  );
}
