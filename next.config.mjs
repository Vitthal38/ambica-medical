import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ============================================================================
 * Security headers — applied to every response.
 *
 * Rationale per header:
 *
 *  Strict-Transport-Security
 *    Forces HTTPS for 2 years incl. subdomains. Only effective in prod (and
 *    safe in dev because dev server isn't HTTPS — browser won't latch HSTS).
 *
 *  Content-Security-Policy
 *    Default-src 'self' blocks third-party script/style/iframe inclusion.
 *    Inline scripts are required by Next.js's runtime so we keep
 *    'unsafe-inline' for script-src — strictly the right answer is nonces,
 *    but Next 16 doesn't expose stable nonce hooks in App Router yet.
 *    'frame-ancestors: none' is the clickjacking defense (replaces deprecated
 *    X-Frame-Options).
 *
 *  Referrer-Policy
 *    `strict-origin-when-cross-origin` — sends full path on same-origin and
 *    only the origin to other sites. Avoids leaking admin URLs as Referer.
 *
 *  Permissions-Policy
 *    Disable APIs the app doesn't need so a compromised dep can't quietly use
 *    them (camera, mic, geolocation, payment, etc.).
 *
 *  X-Content-Type-Options
 *    nosniff — block MIME sniffing attacks especially on prescription files.
 *
 *  X-DNS-Prefetch-Control
 *    off — reduce side-channel telemetry to third parties.
 *
 *  Cross-Origin-Opener-Policy
 *    same-origin — process isolation for top-level browsing context.
 *
 *  Cross-Origin-Resource-Policy
 *    same-origin — block cross-origin reads of our resources (incl. fetched
 *    prescription bytes).
 *
 * NOTE: We DON'T set X-Frame-Options separately — CSP frame-ancestors is its
 * modern replacement and superior (works on more browsers, finer-grained).
 * ============================================================================ */

const isProd = process.env.NODE_ENV === 'production';

// Build CSP. 'self' is the project. We allow Google Fonts because next/font
// Inter loads from fonts.gstatic.com. data: is needed for inlined SVGs.
// In a STRICTER deployment, host the font yourself and drop fonts.googleapis.
const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `img-src 'self' data: https: blob:`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  `connect-src 'self'`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  `object-src 'none'`,
  `upgrade-insecure-requests`,
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), bluetooth=()',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  // HSTS only in prod (dev server is HTTP and we don't want to latch it).
  ...(isProd
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
];

// Extra headers for /admin/* — never index, never cache.
const adminOnlyHeaders = [
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
  { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't expose Next version in the X-Powered-By header.
  poweredByHeader: false,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/admin/:path*',
        headers: adminOnlyHeaders,
      },
      {
        source: '/api/admin/:path*',
        headers: adminOnlyHeaders,
      },
    ];
  },
};

export default nextConfig;
