/**
 * Role hierarchy. Higher index = more privilege.
 * Used by both middleware (edge) and route handlers (server).
 */
export type Role = 'PHARMACIST' | 'MANAGER' | 'ADMIN';

const ORDER: Role[] = ['PHARMACIST', 'MANAGER', 'ADMIN'];

export function rank(role: Role): number {
  return ORDER.indexOf(role);
}

/** Returns true when `actual` is at or above `required`. */
export function hasRole(actual: Role | undefined, required: Role): boolean {
  if (!actual) return false;
  return rank(actual) >= rank(required);
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  PHARMACIST: 'Pharmacist',
};
