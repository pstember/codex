import { describe, expect, it } from "vitest";
import { AuthorizationError, loginWithEmail, requirePermission } from "@/domain/auth";
import { demoUsers } from "@/fixtures/users";
import { createCommerceDatabase } from "@/persistence/database";

describe("auth domain", () => {
  it("logs in demo users case-insensitively and creates a session", () => {
    const database = createCommerceDatabase();

    try {
      database.seedUsers(demoUsers);
      const user = loginWithEmail(database, " MANAGER@DEMO.COM ");

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

  it("returns null for unknown demo users", () => {
    const database = createCommerceDatabase();

    try {
      database.seedUsers(demoUsers);

      expect(loginWithEmail(database, "unknown@demo.com")).toBeNull();
    } finally {
      database.close();
    }
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
