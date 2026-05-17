'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { AdminInput } from '@/components/admin/ui';

export function CustomerSearch({ initialQuery }: { initialQuery: string }) {
  const [q, setQ] = useState(initialQuery);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function go(next: string) {
    startTransition(() => {
      router.replace(next ? `/admin/customers?q=${encodeURIComponent(next)}` : '/admin/customers');
    });
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(q.trim());
      }}
      className="relative mt-5"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      <AdminInput
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or phone…"
        autoFocus
        className="pl-9 pr-9"
        aria-label="Search customers"
      />
      {q && (
        <button
          type="button"
          onClick={() => {
            setQ('');
            go('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-200"
          aria-label="Clear"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
