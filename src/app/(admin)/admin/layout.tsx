import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Sidebar } from '@/components/admin/Sidebar';

/**
 * Admin shell layout.
 *
 *  - This layout wraps every /admin/* route except /admin/login (which has
 *    its own layout via the route group).
 *  - The middleware already redirects unauthenticated visitors, but we
 *    re-check here so the layout never renders without a user (defense in
 *    depth + lets us pass user info to the sidebar without a client fetch).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/admin/login');

  return (
    <div className="min-h-svh bg-zinc-950 text-zinc-100 antialiased">
      <div className="flex min-h-svh">
        <Sidebar user={{ name: session.name, email: session.email, role: session.role }} />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
