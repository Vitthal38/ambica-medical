/**
 * Edge middleware — first line of defense for /admin/* and /api/admin/*.
 *
 *  1. Generates a request id (`x-request-id`) and propagates it downstream so
 *     every log line and error envelope can reference the same request.
 *  2. Enforces CSRF on state-changing /api/admin/* requests by checking Origin
 *     / Referer / Sec-Fetch-Site headers. Login itself is exempt — there's no
 *     session yet, and brute force is handled by rate-limit + bcrypt.
 *  3. Auth-gates /admin/* (UI) and /api/admin/* (REST). Unauthenticated UI
 *     requests redirect to /admin/login; API requests return 401 JSON.
 *  4. Passes identifying headers downstream (x-user-id, x-user-role) so route
 *     handlers can short-circuit a second DB call when they only need ID/role.
 *  5. Defense in depth: every sensitive route ALSO calls requireRole() which
 *     re-fetches the user record from the DB — so a still-valid JWT for a
 *     deactivated user can't keep operating.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { verifyCustomerSession, CUSTOMER_COOKIE_NAME } from '@/lib/customer-auth';
import { csrfCheck } from '@/lib/security/csrf';

const ADMIN_UI_PATH = '/admin';
const ADMIN_API_PATH = '/api/admin';
const LOGIN_PATH = '/admin/login';

// Paths anyone (auth or not) may reach — login UI and login/logout API.
// Logout is here too because we want it to work even from an expired session.
const PUBLIC_ADMIN_PATHS = new Set<string>([
  LOGIN_PATH,
  '/api/admin/auth/login',
  '/api/admin/auth/logout',
]);

// State-changing endpoints exempt from CSRF (login is the only one — no
// session yet, and is protected by rate-limit + constant-time bcrypt).
const CSRF_EXEMPT_API_PATHS = new Set<string>(['/api/admin/auth/login']);

function randomRequestId(): string {
  // 16 bytes hex, edge-runtime safe (no Node crypto module here).
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Customer-protected storefront paths — require a customer session.
// Checkout (and, later, the payment flow) must not be reachable anonymously.
const CUSTOMER_PROTECTED_PREFIXES = ['/checkout'];
const CUSTOMER_LOGIN_PATH = '/login';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ---- Customer-protected storefront routes (checkout, payment) ----
  if (CUSTOMER_PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const cust = await verifyCustomerSession(req.cookies.get(CUSTOMER_COOKIE_NAME)?.value);
    if (cust) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = CUSTOMER_LOGIN_PATH;
    url.searchParams.set('next', sanitizeStorefrontPath(pathname));
    return NextResponse.redirect(url);
  }

  const isAdminUi = pathname === ADMIN_UI_PATH || pathname.startsWith(`${ADMIN_UI_PATH}/`);
  const isAdminApi = pathname.startsWith(ADMIN_API_PATH);
  if (!isAdminUi && !isAdminApi) return NextResponse.next();

  // ---- CSRF on state-changing API requests ----
  if (isAdminApi && !CSRF_EXEMPT_API_PATHS.has(pathname)) {
    const csrfReject = csrfCheck(req);
    if (csrfReject) return csrfReject;
  }

  // ---- Generate / reuse request id ----
  const incoming = req.headers.get('x-request-id');
  const requestId = incoming && /^[a-zA-Z0-9_-]{8,128}$/.test(incoming) ? incoming : randomRequestId();

  // ---- Public admin paths skip auth ----
  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    const res = NextResponse.next({ request: { headers: withReqId(req.headers, requestId) } });
    res.headers.set('x-request-id', requestId);
    return res;
  }

  // ---- Auth ----
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySession(token);

  if (session) {
    const headers = withReqId(req.headers, requestId);
    headers.set('x-user-id', String(session.sub));
    headers.set('x-user-role', session.role);
    const res = NextResponse.next({ request: { headers } });
    res.headers.set('x-request-id', requestId);
    return res;
  }

  if (isAdminApi) {
    const res = NextResponse.json(
      { error: 'Unauthenticated', requestId },
      { status: 401 },
    );
    res.headers.set('x-request-id', requestId);
    return res;
  }

  // UI fallback — bounce to login with a sanitized `next` parameter (only
  // same-origin path; the login client does NOT use raw next directly).
  const url = req.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.searchParams.set('next', sanitizeReturnPath(pathname));
  const res = NextResponse.redirect(url);
  res.headers.set('x-request-id', requestId);
  return res;
}

function withReqId(h: Headers, id: string): Headers {
  const next = new Headers(h);
  next.set('x-request-id', id);
  return next;
}

/** Server-side sanitize — only allow same-origin admin paths. */
function sanitizeReturnPath(p: string): string {
  if (!p.startsWith('/')) return '/admin';
  if (p.startsWith('//')) return '/admin';
  if (p.includes('\\') || /[\r\n]/.test(p)) return '/admin';
  if (!p.startsWith('/admin')) return '/admin';
  return p;
}

/** Same-origin storefront path sanitizer for the customer `next` param. */
function sanitizeStorefrontPath(p: string): string {
  if (!p.startsWith('/')) return '/';
  if (p.startsWith('//')) return '/';
  if (p.includes('\\') || /[\r\n]/.test(p)) return '/';
  if (p.startsWith('/admin')) return '/';
  return p;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/checkout/:path*', '/checkout'],
};
