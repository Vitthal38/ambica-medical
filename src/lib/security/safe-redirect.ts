/**
 * Safe-redirect helpers — prevent open-redirect vulnerabilities on the login
 * `?next=...` parameter.
 *
 * The threat: attacker links `/admin/login?next=https://evil.com/fake-admin`.
 * Victim signs in correctly, server blindly redirects to evil.com which shows
 * a fake "session expired" page → harvest credentials.
 *
 * Defense: ONLY accept relative-internal paths starting with `/`, never
 * protocol-relative (`//`) or full URLs. Strip everything else and fall back
 * to the safe dashboard route.
 */
const SAFE_FALLBACK = '/admin';

export function sanitizeNextParam(raw: string | null | undefined): string {
  if (!raw) return SAFE_FALLBACK;

  // Strip whitespace / control chars.
  const trimmed = raw.trim();
  if (!trimmed) return SAFE_FALLBACK;

  // Reject anything that's not a same-origin path:
  //   - must start with single "/"
  //   - must NOT start with "//" (protocol-relative)
  //   - must NOT contain "\" (Windows / IE quirks)
  //   - must NOT contain newlines (header-splitting)
  if (!trimmed.startsWith('/')) return SAFE_FALLBACK;
  if (trimmed.startsWith('//')) return SAFE_FALLBACK;
  if (trimmed.includes('\\')) return SAFE_FALLBACK;
  if (/[\r\n]/.test(trimmed)) return SAFE_FALLBACK;

  // Only redirect within the admin tree — extra paranoia.
  if (!trimmed.startsWith('/admin')) return SAFE_FALLBACK;

  return trimmed;
}
