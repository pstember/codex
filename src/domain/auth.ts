import { randomUUID } from "node:crypto";
import type { Permission, Role } from "@/domain/roles";
import { can } from "@/domain/roles";
import type { AuthenticatedUser, Session, User } from "@/domain/users";

export interface AuthStore {
  findUserByEmail(email: string): User | null;
  createSession(session: Session): void;
  findUserBySession(sessionId: string, now: Date): AuthenticatedUser | null;
  deleteSession(sessionId: string): void;
}

export const sessionTtlMs = 1000 * 60 * 60 * 8;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function loginWithEmail(
  store: AuthStore,
  email: string,
  now = new Date(),
): AuthenticatedUser | null {
  const user = store.findUserByEmail(normalizeEmail(email));

  if (!user) {
    return null;
  }

  const session: Session = {
    id: randomUUID(),
    userId: user.id,
    expiresAt: new Date(now.getTime() + sessionTtlMs),
  };

  store.createSession(session);

  return {
    ...user,
    sessionId: session.id,
  };
}

export function requirePermission(user: AuthenticatedUser, permission: Permission): void {
  if (!can(user.role, permission)) {
    throw new AuthorizationError(user.role, permission);
  }
}

export class AuthorizationError extends Error {
  constructor(role: Role, permission: Permission) {
    super(`Role "${role}" cannot perform "${permission}".`);
    this.name = "AuthorizationError";
  }
}
