import { describe, expect, it } from "vitest";
import { AuthorizationError, loginWithPassword, requirePermission } from "@/domain/auth";
import { demoStaffPasswords, demoUsers } from "@/fixtures/users";
import { createCommerceDatabase } from "@/persistence/database";

describe("auth domain", () => {
  it("logs in seeded staff by email and password and creates a session", () => {
    const database = createCommerceDatabase();

    try {
      database.seedUsers(demoUsers);
      const user = loginWithPassword(database, " MANAGER@DEMO.COM ", demoStaffPasswords.manager);

      expect(user?.email).toBe("manager@demo.com");
      expect(user?.role).toBe("manager");
      expect(user?.sessionId).toHaveLength(36);
      expect(database.findUserBySession(user?.sessionId ?? "", new Date())?.id).toBe(
        "demo-manager",
      );
    } finally {
      database.close();
    }
  });

  it("rejects unknown emails, bad passwords, and guest logins", () => {
    const database = createCommerceDatabase();

    try {
      database.seedUsers(demoUsers);

      expect(
        loginWithPassword(database, "unknown@demo.com", demoStaffPasswords.manager),
      ).toBeNull();
      expect(loginWithPassword(database, "manager@demo.com", "wrong-password")).toBeNull();
      expect(loginWithPassword(database, "guest@demo.com", "guest")).toBeNull();
    } finally {
      database.close();
    }
  });

  it("seeds backend staff users without plaintext passwords or guest accounts", () => {
    expect(demoUsers).toHaveLength(2);
    expect(demoUsers.map((user) => user.role)).toEqual(["manager", "operator"]);
    expect(demoUsers.every((user) => !("password" in user))).toBe(true);
    expect(demoUsers.every((user) => user.passwordHash.length > 20)).toBe(true);
  });

  it("rejects expired sessions and removes them", () => {
    const database = createCommerceDatabase();

    try {
      database.seedUsers(demoUsers);
      database.createSession({
        id: "expired-session",
        userId: "demo-manager",
        expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      expect(
        database.findUserBySession("expired-session", new Date("2026-01-02T00:00:00.000Z")),
      ).toBeNull();
      expect(
        database.findUserBySession("expired-session", new Date("2025-12-31T00:00:00.000Z")),
      ).toBeNull();
    } finally {
      database.close();
    }
  });

  it("enforces role permission boundaries", () => {
    const operator = {
      id: "demo-operator",
      email: "operator@demo.com",
      name: "Owen Patel",
      role: "operator" as const,
      sessionId: "session",
    };

    expect(() => requirePermission(operator, "publish_storefront")).not.toThrow();
    expect(() => requirePermission(operator, "ask_deep_metrics")).toThrow(AuthorizationError);
  });
});
