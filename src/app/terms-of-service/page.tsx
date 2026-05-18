import type { Metadata } from 'next';
import { LegalShell } from '@/components/layout/LegalShell';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Legal terms governing your use of Ambica Medical — eligibility, prescription handling, payments, liability, and jurisdiction.',
};

export default function TermsOfServicePage() {
  return (
    <LegalShell
      eyebrow="📜 Legal"
      title="Terms of Service"
      subtitle="The agreement between you and Ambica Medical when you use this website or order from us."
      lastUpdated="17 May 2026"
    >
      <p>
        These Terms of Service (“Terms”) govern your access to and use of the website{' '}
        <a href="https://ambica-medical.vercel.app">ambica-medical.vercel.app</a> and the
        in-store and home-delivery services offered by Ambica Medical. By placing an order, creating
        an account, or browsing, you agree to these Terms. If you do not agree, please do not use
        our services.
      </p>

      <h2>1. Who we are</h2>
      <p>
        Ambica Medical is a licensed retail chemist operating in Chhatrapati Sambhajinagar
        (Aurangabad), Maharashtra, under Drug Licence Nos. <code>MH-AUR-00001</code> (Form 20) and{' '}
        <code>MH-AUR-00002</code> (Form 21) granted under the Drugs and Cosmetics Rules, 1945, and
        registered under the Maharashtra Shops and Establishments Act, 2017.
      </p>

      <h2>2. Eligibility</h2>
      <ul>
        <li>You must be at least 18 years old to place an order or hold an account.</li>
        <li>
          Orders for Schedule H, H1, and X medicines must be supported by a valid prescription
          issued by a registered medical practitioner with a verifiable Medical Council
          registration number.
        </li>
        <li>
          You must be a resident of, or able to receive delivery within, the service area we
          currently cover (Chhatrapati Sambhajinagar district and surrounding pin codes).
        </li>
      </ul>

      <h2>3. Account</h2>
      <ul>
        <li>You are responsible for the accuracy of the information in your account.</li>
        <li>
          You are responsible for keeping your password and login session confidential, and for all
          activity that occurs under your account.
        </li>
        <li>
          Notify us immediately at{' '}
          <a href="mailto:care@ambicamedical.in">care@ambicamedical.in</a> if you suspect
          unauthorised use.
        </li>
        <li>
          We may suspend or close accounts that we reasonably believe have been used to commit
          fraud, abuse, or breach of these Terms.
        </li>
      </ul>

      <h2>4. Prescriptions and dispensing</h2>
      <ul>
        <li>
          Every prescription is reviewed manually by our pharmacist before dispensing. We may
          contact you or the issuing doctor for clarification.
        </li>
        <li>
          We reserve the right to refuse to dispense any medicine if the prescription is illegible,
          appears forged, has expired, exceeds quantity limits, presents a clinically significant
          interaction with another medicine in your order history, or otherwise raises a safety
          concern. In such cases we will not charge you and will explain the reason.
        </li>
        <li>
          Use of medicines purchased from us must follow the directions on the label and the
          advice of your physician. This website is not a substitute for medical advice.
        </li>
      </ul>

      <h2>5. Pricing and payment</h2>
      <ul>
        <li>
          Prices are listed in Indian Rupees and include applicable GST as required by law. Prices
          may change without notice; the price applicable to your order is the one displayed at the
          time you confirm checkout.
        </li>
        <li>
          We accept UPI, debit / credit cards, net banking, and Cash on Delivery (up to ₹5,000 per
          order). Payments are processed by PCI-DSS-compliant third-party gateways.
        </li>
        <li>
          If a payment is captured but the order cannot be fulfilled, you will receive a full
          refund per our Return &amp; Refund Policy.
        </li>
      </ul>

      <h2>6. Delivery</h2>
      <ul>
        <li>
          Delivery timelines are estimates, not guarantees. Same-day delivery in Aurangabad city is
          contingent on prescription verification and stock availability.
        </li>
        <li>
          Cold-chain medicines travel in validated thermal packaging. Please inspect on arrival and
          refuse delivery if the seal or temperature indicator is compromised.
        </li>
        <li>
          You or an authorised adult must be present to receive Schedule H, H1, or X items —
          identification may be requested.
        </li>
      </ul>

      <h2>7. Returns and refunds</h2>
      <p>
        Returns and refunds are governed by our{' '}
        <a href="/return-policy">Return &amp; Refund Policy</a>, which forms part of these Terms.
      </p>

      <h2>8. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          Submit forged, altered, or fabricated prescriptions, or impersonate another person to
          obtain medication.
        </li>
        <li>
          Attempt to acquire Schedule H, H1, or X medicines beyond the quantity prescribed, or to
          stockpile narcotics or psychotropic substances.
        </li>
        <li>
          Scrape, crawl, or systematically download the catalog except as permitted by{' '}
          <code>robots.txt</code> for legitimate search-engine indexing.
        </li>
        <li>
          Probe, scan, or attempt to bypass authentication, rate-limits, or any other security
          control. Vulnerability research is welcome under our security policy in{' '}
          <a href="https://github.com/Vitthal38/ambica-medical/blob/main/SECURITY.md">
            SECURITY.md
          </a>{' '}
          — please report responsibly.
        </li>
        <li>
          Use our services to harass our staff, other customers, or any third party.
        </li>
      </ul>

      <h2>9. Intellectual property</h2>
      <p>
        The name “Ambica Medical”, our logo, the site design, and the medicine catalog as
        compiled, organised, and presented by us are our intellectual property. Brand names, drug
        names, and manufacturer trademarks shown in the catalog belong to their respective owners
        and are used for product identification only.
      </p>

      <h2>10. Disclaimers</h2>
      <ul>
        <li>
          Information shown on the website — uses, side effects, interactions, dosages — is provided
          for general reference only. <strong>It is not medical advice.</strong> Always consult a
          qualified physician before starting, stopping, or changing any medication.
        </li>
        <li>
          We do not guarantee uninterrupted availability of the website. Planned and unplanned
          downtime may occur.
        </li>
        <li>
          Search results and recommendations are not endorsements of any particular medicine,
          generic, or brand.
        </li>
      </ul>

      <h2>11. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, our aggregate liability arising out of or relating
        to any order shall not exceed the amount you paid for that order. We are not liable for
        indirect, incidental, special, or consequential damages, except where such limitation is
        not permitted by law (such as gross negligence or wilful misconduct, or liability that
        cannot be limited under the Consumer Protection Act, 2019).
      </p>

      <h2>12. Indemnity</h2>
      <p>
        You agree to indemnify Ambica Medical against any loss, claim, or expense arising from your
        breach of these Terms, your submission of forged or misleading information, or your misuse
        of medicines obtained through us.
      </p>

      <h2>13. Force majeure</h2>
      <p>
        We are not liable for any delay or failure to perform caused by events beyond our
        reasonable control, including acts of God, pandemics, public-health emergencies, regulatory
        action, network or payment-gateway outages, strikes, or transport disruption.
      </p>

      <h2>14. Changes to these Terms</h2>
      <p>
        We may revise these Terms from time to time. Material changes will be notified via email or
        a prominent banner at least 7 days before they take effect. Your continued use of the
        service after the effective date constitutes acceptance.
      </p>

      <h2>15. Governing law and jurisdiction</h2>
      <p>
        These Terms are governed by the laws of India. Any dispute arising out of or in connection
        with these Terms shall be subject to the exclusive jurisdiction of the courts at
        Chhatrapati Sambhajinagar (Aurangabad), Maharashtra.
      </p>

      <h2>16. Contact</h2>
      <p>
        Ambica Medical, Jawahar Colony, Trimurti Chowk, Near Hegdewar Hospital, Chhatrapati
        Sambhajinagar (Aurangabad), Maharashtra 431001.<br />
        Phone: <a href="tel:+919420402595">+91 94204 02595</a> ·{' '}
        Email: <a href="mailto:care@ambicamedical.in">care@ambicamedical.in</a>
      </p>
    </LegalShell>
  );
}
