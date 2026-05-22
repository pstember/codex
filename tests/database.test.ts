import { describe, expect, it } from "vitest";
import { products } from "@/fixtures/products";
import { demoUsers } from "@/fixtures/users";
import { createCommerceDatabase } from "@/persistence/database";

describe("commerce SQLite database", () => {
  it("creates the schema and persists seeded products", () => {
    const database = createCommerceDatabase();

    try {
      database.seedProducts(products);

      expect(database.countProducts()).toBe(products.length);
    } finally {
      database.close();
    }
  });

  it("creates the auth schema and persists demo users and sessions", () => {
    const database = createCommerceDatabase();

    try {
      database.seedUsers(demoUsers);
      database.createSession({
        id: "session-1",
        userId: "demo-operator",
        expiresAt: new Date("2026-05-22T18:00:00.000Z"),
      });

      expect(database.countUsers()).toBe(demoUsers.length);
      expect(database.findUserByEmail("operator@demo.com")?.role).toBe("operator");
      expect(
        database.findUserBySession("session-1", new Date("2026-05-22T12:00:00.000Z")),
      ).toMatchObject({
        email: "operator@demo.com",
        role: "operator",
        sessionId: "session-1",
      });

      database.deleteSession("session-1");

      expect(
        database.findUserBySession("session-1", new Date("2026-05-22T12:00:00.000Z")),
      ).toBeNull();
    } finally {
      database.close();
    }
  });
});
