import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/components/layout/Container';
import { SignupForm } from '@/features/auth/AuthForms';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create an Ambica Medical account to order medicines and track prescriptions.',
};

export default function SignupPage() {
  return (
    <section className="bg-gradient-to-b from-primary-50/40 to-transparent py-12 md:py-16">
      <Container className="max-w-md">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-card">
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary-700">
              ⚕ Create your account
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Join Ambica Medical</h1>
            <p className="mt-1 text-sm text-neutral-600">
              An account is required for secure checkout &amp; order history.
            </p>
          </div>
          <Suspense fallback={<div className="h-80" />}>
            <SignupForm />
          </Suspense>
        </div>
      </Container>
    </section>
  );
}
