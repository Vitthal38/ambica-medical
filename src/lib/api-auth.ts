/**
 * Route-handler helper — `requireRole()` is the per-route gate.
 *
 * Always re-checks the session against the DB so revoked or deactivated users
 * cannot operate with a still-valid JWT. Returns the user record on success
 * or a Response that the route should immediately return.
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { hasRole, type Role } from '@/lib/rbac';
import { prisma } from '@/lib/db';

export type AuthedUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export async function requireRole(
  required: Role,
): Promise<{ user: AuthedUser } | { response: Response }> {
  const session = await getSession();
  if (!session) {
    return { response: NextResponse.json({ error: 'Unauthenticated' }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({
    where: { id: String(session.sub) },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
  if (!user || !user.active) {
    return { response: NextResponse.json({ error: 'Account disabled' }, { status: 401 }) };
  }
  if (!hasRole(user.role as Role, required)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  const { active: _, ...rest } = user;
  return { user: rest as AuthedUser };
}

/** Lightweight JSON helper for consistent error shape. */
export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}
