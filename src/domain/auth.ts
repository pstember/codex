import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
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

export function hashStaffPassword(password: string, salt: string): string {
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyStaffPassword(password: string, passwordHash: string): boolean {
  const [algorithm, salt, hashHex] = passwordHash.split(":");

  if (algorithm !== "scrypt" || !salt || !hashHex) {
    return false;
  }

  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function loginWithPassword(
  store: AuthStore,
  email: string,
  password: string,
  now = new Date(),
): AuthenticatedUser | null {
  const user = store.findUserByEmail(normalizeEmail(email));

  if (!user || !verifyStaffPassword(password, user.passwordHash)) {
    return null;
  }

  const session: Session = {
    id: randomUUID(),
    userId: user.id,
    expiresAt: new Date(now.getTime() + sessionTtlMs),
  };

  store.createSession(session);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
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
