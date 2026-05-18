import type { Metadata } from 'next';
import { LegalShell } from '@/components/layout/LegalShell';

export const metadata: Metadata = {
  title: 'Return & Refund Policy',
  description:
    'Ambica Medical return, replacement, and refund policy — including which medicines are non-returnable under the Drugs and Cosmetics Act and how to raise a claim.',
};

export default function ReturnPolicyPage() {
  return (
    <LegalShell
      eyebrow="↩️ Returns"
      title="Return & Refund Policy"
      subtitle="What can be returned, what cannot, and how to claim a refund or replacement at Ambica Medical."
      lastUpdated="17 May 2026"
    >
      <h2>1. Why pharmacy returns are different</h2>
      <p>
        Medicines are not ordinary consumer goods. The Drugs and Cosmetics Act, 1940 and the Drugs
        and Cosmetics Rules, 1945 prohibit any licensed pharmacy from re-stocking or re-selling a
        product once it has left the premises and the cold-chain / tamper-evident seal cannot be
        re-verified. Returning the medicine you no longer want is therefore not possible in most
        cases — not as a matter of company policy, but as a matter of statutory compliance and
        patient safety. We follow these rules strictly.
      </p>

      <h2>2. When you can return or replace</h2>
      <p>You may raise a return / replacement request within <strong>48 hours of delivery</strong> for any of the following reasons:</p>
      <ul>
        <li>
          <strong>Damaged on arrival</strong> — physical damage, broken seal, leaking liquid,
          crushed strip, soaked secondary packaging.
        </li>
        <li>
          <strong>Wrong product dispensed</strong> — the molecule, brand, strength, dosage form, or
          quantity does not match your order or prescription.
        </li>
        <li>
          <strong>Short-expiry dispatch</strong> — the dispensed product had less than{' '}
          <strong>30 days to expiry</strong> on the date of dispatch and you were not informed at
          the time of order.
        </li>
        <li>
          <strong>Cold-chain breach</strong> — for refrigerated items (insulins, certain vaccines,
          biologicals): the gel-pack was warm, the seal was broken, or the temperature indicator
          shows excursion outside 2–8 °C on receipt.
        </li>
        <li>
          <strong>Visibly altered tablet/capsule</strong> — discoloration, crumbling, unusual smell,
          presence of foreign particles in a liquid.
        </li>
      </ul>

      <h2>3. Items that cannot be returned</h2>
      <p>
        The following are <strong>non-returnable in all circumstances</strong> (except where Section
        2 applies):
      </p>
      <ul>
        <li>
          <strong>Schedule X drugs</strong> (narcotics, psychotropics, certain controlled
          substances) — once dispensed, statutory record entries are made and the medicine cannot
          re-enter inventory.
        </li>
        <li>
          <strong>Refrigerated medicines</strong> — insulins, GLP-1 agonists, certain vaccines,
          biologicals, eye drops requiring 2–8 °C storage. Cold-chain integrity cannot be verified
          after the medicine leaves us.
        </li>
        <li>
          <strong>Custom-compounded preparations</strong> — pharmacy-compounded creams, syrups,
          paediatric reconstitutions made specifically against your prescription.
        </li>
        <li>
          <strong>Opened, partially used, or tampered packaging</strong> — strip cut, blister
          punctured, bottle seal broken, tube cap removed.
        </li>
        <li>
          <strong>Medical devices touching skin or body fluids</strong> — opened glucometer
          lancets, thermometers used orally/rectally, opened nebuliser masks, urinary catheters,
          ostomy bags after opening.
        </li>
        <li>
          <strong>Personal-care, hygiene, and intimate-use items</strong> — opened sanitary
          products, condoms, breast pumps, hearing aids after first use.
        </li>
      </ul>

      <h2>4. How to raise a return request</h2>
      <ol>
        <li>
          Photograph the issue clearly — for damaged packaging, include the outer carton, batch
          label, and the damage in the same frame.
        </li>
        <li>
          Write to <a href="mailto:returns@ambicamedical.in">returns@ambicamedical.in</a> within 48
          hours of delivery with your order number and the photographs, or call{' '}
          <a href="tel:+919999900000">+91 99999 00000</a> during working hours.
        </li>
        <li>
          Our pharmacist will respond within one working day to either approve a pickup, request
          additional information, or — for cold-chain claims — arrange immediate replacement.
        </li>
        <li>
          Keep the product in its original packaging until pickup. Our courier will collect it free
          of charge within Aurangabad city.
        </li>
      </ol>

      <h2>5. Refunds</h2>
      <p>
        Once the returned product is received and inspected (typically 1–2 working days), we will
        process the refund:
      </p>
      <ul>
        <li>
          <strong>Online payments</strong> (UPI / card / net banking) — refunded to the original
          payment instrument within 5–7 working days. The actual credit time depends on your bank
          or UPI app.
        </li>
        <li>
          <strong>Cash on Delivery</strong> — refunded to your registered UPI ID or bank account.
          We do not refund in cash.
        </li>
        <li>
          <strong>Replacement</strong> — if you prefer a like-for-like replacement instead of a
          refund, we’ll dispatch it the same working day at no extra cost.
        </li>
      </ul>

      <h2>6. Order cancellation</h2>
      <p>
        You can cancel an order any time before it has been dispensed (sealed and packed). Once
        dispensed, statutory rules prevent re-stocking and the cancellation will be treated as a
        return request, subject to the conditions above.
      </p>
      <ul>
        <li>
          <strong>Within 15 minutes of placing</strong> — instant cancellation from your order page,
          full refund.
        </li>
        <li>
          <strong>After dispensing but before dispatch</strong> — call us; we will assess whether
          the seal can be voided.
        </li>
        <li>
          <strong>After dispatch</strong> — please refuse delivery; the courier will return the
          order and a refund is processed as per Section 5.
        </li>
      </ul>

      <h2>7. Pricing errors, out-of-stock, prescription mismatch</h2>
      <p>
        If we discover after order placement that (a) the listed price was a clerical error, (b) the
        item is unavailable, or (c) the prescription does not authorize the requested dispensing,
        we will contact you within 2 hours. You may choose to accept the corrected order, modify
        it, or cancel for a full refund.
      </p>

      <h2>8. Disputes</h2>
      <p>
        If you are not satisfied with our decision on a return claim, you may escalate to our
        Grievance Officer at <a href="mailto:grievance@ambicamedical.in">grievance@ambicamedical.in</a>{' '}
        (response within 7 working days, in line with the IT Rules, 2011 and the Consumer
        Protection Act, 2019). Unresolved consumer disputes can be referred to the District
        Consumer Disputes Redressal Commission, Chhatrapati Sambhajinagar.
      </p>

      <h2>9. Contact</h2>
      <p>
        Ambica Medical, Jawahar Colony, Trimurti Chowk, Near Hegdewar Hospital, Chhatrapati
        Sambhajinagar (Aurangabad), Maharashtra 431001.<br />
        Phone: <a href="tel:+919999900000">+91 99999 00000</a> ·{' '}
        Email: <a href="mailto:returns@ambicamedical.in">returns@ambicamedical.in</a>
      </p>
    </LegalShell>
  );
}
