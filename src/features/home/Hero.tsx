'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Pill, FileText, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Container } from '@/components/layout/Container';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function Hero() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Subtle decoration */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-accent-200/40 blur-3xl" />

      <Container className="relative py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <Link
            href="/prescription"
            className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary-700 backdrop-blur"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Licensed Pharmacy · Aurangabad
          </Link>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
            Healthcare,{' '}
            <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              Reimagined.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base text-neutral-600 sm:text-lg">
            Premium medicines, wellness products, and expert pharmacist care — delivered to your door
            in Aurangabad.
          </p>

          {/* Search */}
          <form onSubmit={submit} className="mx-auto mt-8 flex max-w-xl gap-2" role="search">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400"
                strokeWidth={2}
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search medicines, vitamins, devices…"
                aria-label="Search products"
                className="h-13 rounded-2xl pl-12 text-base shadow-card"
              />
            </div>
            <Button type="submit" size="lg" className="rounded-2xl px-6">
              Search
            </Button>
          </form>

          {/* CTAs */}
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/products')}
              className="w-full sm:w-auto"
            >
              <Pill className="h-4 w-4" strokeWidth={2} /> Shop Medicines
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push('/prescription')}
              className="w-full sm:w-auto"
            >
              <FileText className="h-4 w-4" strokeWidth={2} /> Upload Prescription
            </Button>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
