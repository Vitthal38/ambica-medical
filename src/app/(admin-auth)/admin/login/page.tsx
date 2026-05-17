import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Sign in · Ambica Admin',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-zinc-950 px-4 antialiased">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
