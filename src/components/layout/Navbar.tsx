'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Search, X } from 'lucide-react';
import { Container } from './Container';
import { Logo } from './Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CartIconButton } from '@/features/cart/CartIconButton';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/cn';

// Quick-access nav links — top user categories most people visit.
const NAV_LINKS = [
  { href: '/products', label: 'Shop All' },
  { href: '/category/fever-and-pain-relief', label: 'Fever & Pain' },
  { href: '/category/cold-cough-and-flu', label: 'Cold & Cough' },
  { href: '/category/diabetes-care', label: 'Diabetes' },
  { href: '/category/heart-and-bp', label: 'Heart & BP' },
  { href: '/prescription', label: 'Upload Rx' },
];

export function Navbar() {
  const { mobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useUIStore();
  const [query, setQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
    closeMobileMenu();
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <Container>
        <div className="flex h-18 items-center gap-4 py-3">
          <Logo />

          {/* Desktop search */}
          <form onSubmit={submitSearch} className="ml-2 hidden flex-1 md:block" role="search">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                strokeWidth={2}
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                placeholder="Search medicines, symptoms, brands…"
                className="pl-10"
                aria-label="Search products"
              />
            </div>
          </form>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(l.href)
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-neutral-700 hover:text-primary-700 hover:bg-neutral-100',
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <CartIconButton />
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-neutral-700 hover:bg-neutral-100 lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={submitSearch} className="pb-3 md:hidden" role="search">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              strokeWidth={2}
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Search medicines, symptoms, brands…"
              className="pl-10"
              aria-label="Search products"
            />
          </div>
        </form>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="border-t border-neutral-200/80 py-3 lg:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={closeMobileMenu}
                  className={cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive(l.href)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-700 hover:bg-neutral-100',
                  )}
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 px-1">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    router.push('/products');
                    closeMobileMenu();
                  }}
                >
                  Shop Medicines
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    router.push('/prescription');
                    closeMobileMenu();
                  }}
                >
                  Upload Rx
                </Button>
              </div>
            </nav>
          </div>
        )}
      </Container>
    </header>
  );
}
