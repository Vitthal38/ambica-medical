import type { Metadata } from 'next';
import { LegalShell } from '@/components/layout/LegalShell';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Answers about prescriptions, delivery in Aurangabad, returns, Schedule H/X medicines, insurance invoices, and substitution policy at Ambica Medical.',
};

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Are the medicines you sell genuine?',
    a: 'Every medicine we dispatch is procured directly from manufacturer-authorized distributors. Each invoice carries the batch number, manufacturing date, and expiry, and you can cross-verify the batch on the manufacturer’s website. We do not stock medicines from grey-market or parallel-import sources.',
  },
  {
    q: 'How do I upload a prescription, and how long does verification take?',
    a: 'Go to “Upload Prescription” in the top menu, attach a clear photo or PDF (max 10 MB), and submit. A registered pharmacist on our staff reviews every prescription manually — typical turnaround during working hours (every day, 9 AM–11 PM) is under 30 minutes. If anything is unclear, we’ll call the number on file before dispensing.',
  },
  {
    q: 'Which medicines require a prescription?',
    a: 'Under the Drugs and Cosmetics Act, 1940 and its Rules, all Schedule H, H1, and X drugs require a valid prescription from a registered medical practitioner. Common over-the-counter (OTC) items — paracetamol, antacids, oral rehydration salts, basic first-aid, vitamins below regulatory thresholds — can be purchased without one. If you are unsure, our pharmacist will flag the requirement during order review.',
  },
  {
    q: 'Do you deliver same-day in Aurangabad?',
    a: 'Yes — orders placed before 6 PM with a verified prescription (where applicable) are dispatched the same day across Aurangabad (Chhatrapati Sambhajinagar) city limits. Outlying areas such as Waluj, Chikalthana MIDC, Paithan Road, and Daulatabad receive next-business-day delivery. You can opt for in-store pickup at our Jawahar Colony outlet at any time during working hours.',
  },
  {
    q: 'What are the delivery charges?',
    a: 'Orders above ₹499 are delivered free within Aurangabad city. Below that, a flat ₹40 delivery fee applies. Cash on Delivery is supported for orders up to ₹5,000; larger orders require online pre-payment.',
  },
  {
    q: 'Can I return a medicine I no longer need?',
    a: 'For your safety and under statutory rules, medicines once sold cannot be returned or exchanged, with limited exceptions: damaged-on-arrival items, wrong product dispensed, or items whose expiry was within 30 days at the time of dispatch. Full details — including the non-returnable list (Schedule X narcotics, refrigerated insulin, vaccines, etc.) — are in our Return Policy.',
  },
  {
    q: 'Will the pharmacist substitute my prescribed brand?',
    a: 'Only with your explicit consent. If a prescribed brand is out of stock, we’ll call you with options: (a) wait for the original, (b) accept a generic equivalent at the same molecule/strength, or (c) cancel and refund. We never auto-substitute, especially for narrow-therapeutic-index drugs (warfarin, levothyroxine, anti-epileptics, lithium).',
  },
  {
    q: 'Can I get a GST invoice for insurance or tax reimbursement?',
    a: 'Yes. Every order includes a GST-compliant tax invoice with our GSTIN, drug license number (Form 20/21 under the Maharashtra Drugs Rules), batch numbers, and HSN codes. You can re-download invoices from your order history at any time, or request a duplicate from our Help line.',
  },
  {
    q: 'How are cold-chain medicines (insulin, certain vaccines, biologicals) shipped?',
    a: 'They travel in a validated thermal box with gel-packs that hold 2–8 °C for up to 24 hours. Our delivery riders carry the box separately from ambient-temperature orders. If you receive a cold-chain item with a broken seal or warm packaging, refuse the delivery — we will replace it at no cost.',
  },
  {
    q: 'How do I store my prescription with you for refills?',
    a: 'Once verified, your prescription is stored against your customer profile (visible only to our pharmacy staff, never shared). For maintenance medication — diabetes, hypertension, thyroid, etc. — you can request a refill from your order history and we’ll dispense again without re-uploading, until the prescription expires or the doctor’s validity period ends (typically 6 months for chronic conditions, 30 days for antibiotics).',
  },
  {
    q: 'Do you offer reminders for chronic medication?',
    a: 'Yes — refill reminders are sent via SMS/WhatsApp 5 days before your usual refill date. You can opt in or out at any time from your customer profile, or by replying STOP to any reminder message.',
  },
  {
    q: 'My medicine looks different from what I’ve received before — is it the same?',
    a: 'Packaging refreshes happen frequently. The composition, strength, and brand name on the strip are what matter. If anything other than the packaging looks different — colour of tablet, embossing, foil layout — do not consume it and call us immediately on +91 94204 02595. We’ll verify the batch and replace if needed.',
  },
  {
    q: 'Is my health data safe?',
    a: 'Prescription files, order history, and personal data are encrypted at rest and in transit. We comply with the Digital Personal Data Protection Act, 2023 and the IT Rules, 2011. We do not sell or share your data with third parties for marketing. Full details: see our Privacy Policy.',
  },
  {
    q: 'How do I cancel an order?',
    a: 'Cancel within 15 minutes of placing — straight from your order page — with no questions asked. After that, cancellation depends on whether the order has been dispensed. Once a prescription medicine has been dispensed and sealed, it cannot be cancelled because we cannot legally re-sell it.',
  },
];

export default function FaqPage() {
  return (
    <LegalShell
      eyebrow="❓ Help Centre"
      title="Frequently Asked Questions"
      subtitle="Common questions about ordering, prescriptions, delivery, and returns at Ambica Medical. Can’t find what you need? See our Contact page."
    >
      <p>
        Below are the questions we hear most often at the Jawahar Colony counter and on our
        Help line. If something here is unclear, or your question isn’t covered, write to{' '}
        <a href="mailto:care@ambicamedical.in">care@ambicamedical.in</a> or call{' '}
        <a href="tel:+919420402595">+91 94204 02595</a>.
      </p>

      {FAQS.map((f, i) => (
        <details
          key={i}
          className="group mt-3 rounded-lg border border-neutral-200 bg-white open:border-primary-200"
        >
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 text-[15px] font-medium text-neutral-900 hover:bg-neutral-50 group-open:bg-primary-50/40">
            <span>{f.q}</span>
            <span
              aria-hidden="true"
              className="mt-0.5 text-primary-700 transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="px-4 pb-4 pt-1 text-[15px] leading-relaxed text-neutral-700">{f.a}</div>
        </details>
      ))}

      <h2>Still need help?</h2>
      <p>
        Our staff is available <strong>every day, 9 AM – 11 PM</strong>. You can also{' '}
        <a href="/contact">reach us through the Contact page</a> or walk in to the Jawahar Colony
        store near Hegdewar Hospital.
      </p>
    </LegalShell>
  );
}
