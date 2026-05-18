import type { Metadata } from 'next';
import { LegalShell } from '@/components/layout/LegalShell';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Ambica Medical collects, uses, stores, and protects your personal and health data, in compliance with the Digital Personal Data Protection Act, 2023 (India).',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalShell
      eyebrow="🔒 Privacy"
      title="Privacy Policy"
      subtitle="What we collect, why we collect it, how long we keep it, and what you can do about it."
      lastUpdated="17 May 2026"
    >
      <p>
        Ambica Medical (“we”, “us”, “our”) is a licensed retail pharmacy operating from Jawahar
        Colony, Chhatrapati Sambhajinagar (Aurangabad), Maharashtra, India. This Privacy Policy
        explains how we handle personal data, including health-related information, when you use{' '}
        <a href="https://ambica-medical.vercel.app">ambica-medical.vercel.app</a> or walk into our
        physical store.
      </p>
      <p>
        We follow the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>, the{' '}
        <strong>Information Technology (Reasonable Security Practices and Procedures and Sensitive
        Personal Data or Information) Rules, 2011</strong>, and the recordkeeping obligations of the
        <strong> Drugs and Cosmetics Act, 1940</strong> and its Rules.
      </p>

      <h2>1. What we collect</h2>
      <h3>Identity and contact data</h3>
      <ul>
        <li>Name, mobile number, email address, delivery address(es).</li>
        <li>Date of birth (only if you choose to provide it for age-restricted dispensing).</li>
      </ul>
      <h3>Health data (sensitive personal information)</h3>
      <ul>
        <li>Prescription images / PDFs you upload.</li>
        <li>Medicines you have ordered through us (date, batch, quantity).</li>
        <li>Doctor’s name and registration number as they appear on your prescription.</li>
        <li>Allergies, chronic conditions, or notes you volunteer to our pharmacist.</li>
      </ul>
      <h3>Transactional data</h3>
      <ul>
        <li>
          Payment instrument metadata only (UPI handle, last four digits of card, gateway
          transaction ID). <strong>We do not store full card numbers, CVV, UPI PIN, or net-banking
          credentials</strong> — these go directly to PCI-DSS-compliant payment gateways.
        </li>
        <li>Order history, invoices, and delivery status.</li>
      </ul>
      <h3>Technical data</h3>
      <ul>
        <li>IP address, device type, browser, anonymised crash and performance telemetry.</li>
        <li>Strictly-necessary cookies for login session, cart state, and CSRF protection.</li>
      </ul>

      <h2>2. Why we collect it (purpose &amp; legal basis)</h2>
      <ul>
        <li>
          <strong>Dispensing your order</strong> — performance of the contract you enter when you
          place an order with us.
        </li>
        <li>
          <strong>Statutory recordkeeping</strong> — the Drugs and Cosmetics Rules require us to
          maintain dispensing records for all Schedule H, H1, and X drugs for prescribed durations.
          This is a legal obligation we cannot waive.
        </li>
        <li>
          <strong>Refill reminders, order updates, delivery coordination</strong> — based on your
          consent, which you can withdraw at any time.
        </li>
        <li>
          <strong>Fraud, security, and abuse prevention</strong> — legitimate interest, balanced
          against your rights.
        </li>
        <li>
          <strong>Customer support and dispute resolution</strong> — performance of the contract and
          our legitimate interests.
        </li>
      </ul>

      <h2>3. Who can see your data</h2>
      <ul>
        <li>
          <strong>Our pharmacist and authorised staff</strong>, on a need-to-know basis, only for
          dispensing and follow-up.
        </li>
        <li>
          <strong>Delivery partner</strong> — name, delivery address, and order ID only (never the
          contents of your prescription).
        </li>
        <li>
          <strong>Payment gateway</strong> — only the amount and a reference; the gateway handles
          the rest.
        </li>
        <li>
          <strong>Government authorities</strong> — only when compelled by valid legal process
          (court order, summons under the CrPC, demand under the D&amp;C Act inspectorate).
        </li>
      </ul>
      <p>
        <strong>We do not sell your data.</strong> We do not share prescription details, medicine
        history, or contact information with advertisers, data brokers, or insurance companies.
      </p>

      <h2>4. How we protect it</h2>
      <ul>
        <li>All connections over HTTPS with HSTS preload.</li>
        <li>Passwords hashed with bcrypt; session tokens signed with HMAC-SHA-256.</li>
        <li>
          Database encrypted at rest by our cloud provider; backups encrypted; access logs retained.
        </li>
        <li>
          Strict Content Security Policy, anti-CSRF tokens, and same-origin enforcement on admin
          endpoints.
        </li>
        <li>
          Role-based access control: pharmacy staff see only the data needed for their function.
        </li>
        <li>
          Periodic security review and an immutable admin audit log for all access to patient
          records.
        </li>
      </ul>
      <p>
        No system is perfectly secure. If we discover a personal data breach that is likely to
        result in significant harm to you, we will notify you and the Data Protection Board of
        India as required by the DPDP Act, 2023.
      </p>

      <h2>5. How long we keep it</h2>
      <ul>
        <li>
          <strong>Prescriptions and dispensing records</strong> — at least 2 years (Schedule H/H1)
          and 5 years (Schedule X) from the date of supply, as required by law. Longer if a dispute
          or investigation is ongoing.
        </li>
        <li><strong>Order history and invoices</strong> — 8 years, for GST and accounting compliance.</li>
        <li>
          <strong>Contact and marketing preferences</strong> — until you withdraw consent or close
          your account, whichever is earlier.
        </li>
        <li>
          <strong>Anonymised analytics</strong> — indefinitely (no longer linked to your identity).
        </li>
      </ul>

      <h2>6. Your rights</h2>
      <p>Under the DPDP Act, 2023 and applicable rules, you have the right to:</p>
      <ul>
        <li><strong>Access</strong> the personal data we hold about you.</li>
        <li><strong>Correct or update</strong> inaccurate or incomplete data.</li>
        <li>
          <strong>Erase</strong> data we no longer need for a legal purpose. (Statutorily-mandated
          dispensing records are an exception until their retention period ends.)
        </li>
        <li><strong>Withdraw consent</strong> for marketing or refill reminders, at any time.</li>
        <li>
          <strong>Nominate</strong> another individual to exercise your rights in the event of your
          incapacity or death.
        </li>
        <li><strong>Grievance redressal</strong> — see Section 8.</li>
      </ul>
      <p>
        To exercise any of these rights, email{' '}
        <a href="mailto:privacy@ambicamedical.in">privacy@ambicamedical.in</a> from the address
        registered to your account. We respond within 7 working days.
      </p>

      <h2>7. Cookies</h2>
      <p>We use cookies that fall into three categories:</p>
      <ul>
        <li>
          <strong>Strictly necessary</strong> — login session (<code>ambica_admin_sess</code>),
          cart state, anti-CSRF token. The site cannot function without these.
        </li>
        <li>
          <strong>Preference</strong> — your remembered delivery address, last-viewed category. Not
          shared.
        </li>
        <li>
          <strong>Analytics</strong> — anonymised page-view counts. We do not use third-party
          advertising cookies and we have no Facebook Pixel, Google Ads, or similar tags.
        </li>
      </ul>

      <h2>8. Grievance Officer</h2>
      <p>
        In accordance with the IT Rules, 2011 and the DPDP Act, 2023, our Grievance Officer is:
      </p>
      <ul>
        <li>Name: The Pharmacist-in-Charge, Ambica Medical</li>
        <li>Email: <a href="mailto:grievance@ambicamedical.in">grievance@ambicamedical.in</a></li>
        <li>Phone: <a href="tel:+919999900000">+91 99999 00000</a></li>
        <li>
          Address: Jawahar Colony, Trimurti Chowk, Near Hegdewar Hospital, Chhatrapati
          Sambhajinagar (Aurangabad), Maharashtra 431001
        </li>
        <li>Response time: within 7 working days; resolution within 30 days.</li>
      </ul>

      <h2>9. Changes to this policy</h2>
      <p>
        We may update this policy from time to time — for example when the law changes or when we
        introduce a new feature. The “Last updated” date at the top of this page always reflects
        the current version. Material changes will be notified by email or a prominent banner on
        the site at least 7 days before they take effect.
      </p>
    </LegalShell>
  );
}
