'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Bell,
  Pill,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/prescriptions', label: 'Prescriptions', icon: FileText },
  { href: '/admin/orders', label: 'Orders', icon: Package },
  { href: '/admin/reminders', label: 'Reminders', icon: Bell },
];

interface Props {
  user: { name: string; email: string; role: string };
}

export function Sidebar({ user }: Props) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950 font-bold">
          <Pill className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-zinc-100">Ambica</p>
          <p className="text-[10px] uppercase tracking-widest text-emerald-400">Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((n) => {
          const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
              )}
            >
              <n.icon className="h-4 w-4" strokeWidth={1.75} />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-3">
        <div className="rounded-md bg-zinc-900 px-3 py-2.5">
          <p className="truncate text-xs font-semibold text-zinc-100">{user.name}</p>
          <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            {user.role}
          </p>
        </div>
        <form action="/api/admin/auth/logout" method="post" className="mt-2">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
