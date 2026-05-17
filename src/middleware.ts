/**
 * Edge middleware — first line of defense for /admin/* and /api/admin/*.
 *
 *  - Unauthenticated requests are redirected to /admin/login (UI) or returned
 *    a 401 (API).
 *  - This is NOT the only check — every route handler ALSO verifies the
 *    session before sensitive operations. Defense in depth.
 *
 *  The public site (/, /products, /cart, /prescription, /checkout, ...) is
 *  unaffected — we explicitly skip everything outside the admin tree.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

const ADMIN_UI_PATH = '/admin';
const ADMIN_API_PATH = '/api/admin';
const LOGIN_PATH = '/admin/login';

// Sub-paths that anyone (logged in or not) may hit.
const PUBLIC_ADMIN_PATHS = new Set<string>([LOGIN_PATH, '/api/admin/auth/login']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminUi = pathname === ADMIN_UI_PATH || pathname.startsWith(`${ADMIN_UI_PATH}/`);
  const isAdminApi = pathname.startsWith(ADMIN_API_PATH);
  if (!isAdminUi && !isAdminApi) return NextResponse.next();

  // Login pages and login API are public so users can authenticate.
  if (PUBLIC_ADMIN_PATHS.has(pathname)) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySession(token);

  if (session) {
    // Pass identifying headers downstream so route handlers can short-circuit
    // a second DB call when they only need the id/role.
    const headers = new Headers(req.headers);
    headers.set('x-user-id', String(session.sub));
    headers.set('x-user-role', session.role);
    return NextResponse.next({ request: { headers } });
  }

  if (isAdminApi) {
    return new NextResponse(JSON.stringify({ error: 'Unauthenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = req.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run only on admin paths; everything else (homepage, products, /api/...
  // anything-but-admin) skips middleware entirely.
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
