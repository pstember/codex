import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultStorefrontHeroImageComposition } from "@/domain/storefront";
import type { PublishedStorefrontVersion } from "@/domain/storefrontPublishing";
import { demoUsers } from "@/fixtures/users";
import { createCommerceDatabase } from "@/persistence/database";

const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");

describe("commerce SQLite database", () => {
  it("creates only runtime persistence tables, not duplicated analytics fixture tables", () => {
    const directory = mkdtempSync(join(tmpdir(), "commerce-db-schema-"));
    const databasePath = join(directory, "commerce.db");

    try {
      createCommerceDatabase(databasePath).close();
      const database = new DatabaseSync(databasePath);
      const tables = database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;")
        .all()
        .map((row) => (row as { name: string }).name)
        .filter((name) => name !== "sqlite_sequence");
      database.close();

      expect(tables).toEqual([
        "codex_run_events",
        "codex_runs",
        "published_storefront_versions",
        "sessions",
        "storefront_configs",
        "users",
      ]);
    } finally {
      rmSync(directory, { force: true, recursive: true });
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
      expect(database.findUserByEmail("operator@demo.com")?.passwordHash).toMatch(/^scrypt:/);
      expect(database.findUserByEmail("guest@demo.com")).toBeNull();
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

  it("persists generated storefront configs for Operator review", () => {
    const database = createCommerceDatabase();

    try {
      database.saveStorefrontConfig({
        id: "storefront-draft-1",
        sourceDraftKey: "adaptation:summer-hosting",
        config: {
          id: "fathers-day-storefront",
          campaignId: "fathers-day-2026",
          versionName: "Father’s Day",
          style: {
            theme: "summer",
            accentColor: "#b45309",
            density: "editorial",
          },
          visualAsset: fatherDayVisualAsset,
          sections: [
            {
              id: "fd-hero",
              type: "hero",
              title: "Father’s Day gifts",
              body: "Practical picks.",
              productIds: ["portable-charcoal-grill"],
            },
          ],
        },
        validationStatus: "draft",
        validationErrors: [],
        createdByUserId: "demo-operator",
        createdAt: new Date("2026-05-22T14:00:00.000Z"),
      });

      expect(database.listRecentStorefrontConfigs()).toEqual([
        {
          id: "storefront-draft-1",
          sourceDraftKey: "adaptation:summer-hosting",
          config: {
            id: "fathers-day-storefront",
            campaignId: "fathers-day-2026",
            versionName: "Father’s Day",
            style: {
              theme: "summer",
              accentColor: "#b45309",
              density: "editorial",
            },
            visualAsset: fatherDayVisualAsset,
            sections: [
              {
                id: "fd-hero",
                type: "hero",
                sectionIntent: "heroProduct",
                title: "Father’s Day gifts",
                body: "Practical picks.",
                productIds: ["portable-charcoal-grill"],
              },
            ],
          },
          validationStatus: "draft",
          validationErrors: [],
          createdByUserId: "demo-operator",
          createdAt: new Date("2026-05-22T14:00:00.000Z"),
        },
      ]);
      expect(database.findStorefrontConfigById("storefront-draft-1")?.sourceDraftKey).toBe(
        "adaptation:summer-hosting",
      );
    } finally {
      database.close();
    }
  });

  it("does not return storefront configs whose persisted JSON fails validation", () => {
    const directory = mkdtempSync(join(tmpdir(), "commerce-db-invalid-config-"));
    const databasePath = join(directory, "commerce.db");

    try {
      const database = createCommerceDatabase(databasePath);
      database.saveStorefrontConfig({
        id: "invalid-draft",
        sourceDraftKey: "adaptation:invalid",
        config: {
          id: "invalid-storefront",
          campaignId: "event-invalid",
          versionName: "Invalid",
          style: {
            theme: "invalid",
            accentColor: "#2563eb",
            density: "editorial",
          },
          visualAsset: {
            ...fatherDayVisualAsset,
            campaignId: "event-invalid",
          },
          sections: [
            {
              id: "invalid-hero",
              type: "hero",
              sectionIntent: "heroProduct",
              title: "Invalid hero",
              productIds: ["portable-charcoal-grill"],
            },
            {
              id: "invalid-offer",
              type: "productRail",
              sectionIntent: "currentOffer",
              title: "Invalid offer",
              productIds: ["portable-charcoal-grill"],
            },
            {
              id: "invalid-spotlight",
              type: "featuredCollection",
              sectionIntent: "spotlight",
              title: "Invalid spotlight",
              productIds: ["portable-charcoal-grill"],
            },
          ],
        },
        validationStatus: "draft",
        validationErrors: [],
        createdByUserId: "demo-operator",
        createdAt: new Date("2026-05-22T14:00:00.000Z"),
      });
      database.close();

      const rawDatabase = new DatabaseSync(databasePath);
      rawDatabase.prepare("UPDATE storefront_configs SET config_json = ? WHERE id = ?;").run(
        JSON.stringify({
          id: "invalid-storefront",
          campaignId: "event-invalid",
          versionName: "Invalid",
          style: {
            theme: "invalid",
            accentColor: "not-a-color",
            density: "editorial",
          },
          sections: [],
        }),
        "invalid-draft",
      );
      rawDatabase.close();

      const reopenedDatabase = createCommerceDatabase(databasePath);
      expect(reopenedDatabase.findStorefrontConfigById("invalid-draft")).toBeNull();
      expect(reopenedDatabase.listRecentStorefrontConfigs()).toEqual([]);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("persists storefront adaptation drafts with generated image metadata", () => {
    const database = createCommerceDatabase();

    try {
      database.saveStorefrontConfig({
        id: "halloween-draft-1",
        sourceDraftKey: "adaptation:halloween",
        config: {
          id: "event-halloween-storefront",
          campaignId: "event-halloween",
          versionName: "Halloween",
          style: {
            theme: "halloween",
            accentColor: "#f97316",
            density: "editorial",
            palette: {
              background: "#12091f",
              surface: "#fff7ed",
              text: "#f8fafc",
              muted: "#fde7c8",
              border: "#f97316",
              accent: "#f97316",
              secondaryAccent: "#a3e635",
              button: "#f97316",
              buttonText: "#12091f",
            },
          },
          visualAsset: {
            id: "event-halloween-hero-asset",
            campaignId: "event-halloween",
            prompt: "Cosy Halloween office gifting with useful products.",
            alt: "A generated Halloween hero scene for Atlas & Co. gifts.",
            source: "generated",
            path: "/static-assets/generated-halloween-hero.svg",
            composition: defaultStorefrontHeroImageComposition,
          },
          sections: [
            {
              id: "event-halloween-hero",
              type: "hero",
              title: "Halloween gifts with a useful little shiver.",
              body: "Cosy desk, coffee, and travel picks for small surprises.",
              productIds: ["pour-over-coffee-set"],
            },
          ],
        },
        validationStatus: "draft",
        validationErrors: [],
        createdByUserId: "demo-operator",
        createdAt: new Date("2026-05-23T11:00:00.000Z"),
      });

      expect(database.findStorefrontConfigById("halloween-draft-1")).toMatchObject({
        id: "halloween-draft-1",
        sourceDraftKey: "adaptation:halloween",
        validationStatus: "draft",
        config: {
          versionName: "Halloween",
          style: {
            theme: "halloween",
            palette: {
              background: "#12091f",
              accent: "#f97316",
              secondaryAccent: "#a3e635",
            },
          },
          visualAsset: {
            source: "generated",
            path: "/static-assets/generated-halloween-hero.svg",
          },
        },
      });
    } finally {
      database.close();
    }
  });

  it("deletes generated storefront drafts without touching published versions", () => {
    const database = createCommerceDatabase();

    try {
      database.saveStorefrontConfig({
        id: "storefront-draft-delete",
        sourceDraftKey: "adaptation:halloween",
        config: {
          id: "event-halloween-storefront",
          campaignId: "event-halloween",
          versionName: "Halloween",
          style: {
            theme: "halloween",
            accentColor: "#f97316",
            density: "editorial",
          },
          visualAsset: fatherDayVisualAsset,
          sections: [
            {
              id: "event-halloween-hero",
              type: "hero",
              title: "Halloween gifts",
              body: "Useful seasonal picks.",
              productIds: ["pour-over-coffee-set"],
            },
          ],
        },
        validationStatus: "draft",
        validationErrors: [],
        createdByUserId: "demo-operator",
        createdAt: new Date("2026-05-23T12:00:00.000Z"),
      });
      database.savePublishedStorefrontVersion({
        id: "published-halloween",
        sourceStorefrontConfigId: "storefront-draft-delete",
        config: {
          id: "event-halloween-storefront",
          campaignId: "event-halloween",
          versionName: "Halloween",
          style: {
            theme: "halloween",
            accentColor: "#f97316",
            density: "editorial",
          },
          visualAsset: fatherDayVisualAsset,
          sections: [
            {
              id: "event-halloween-hero",
              type: "hero",
              title: "Halloween gifts",
              body: "Useful seasonal picks.",
              productIds: ["pour-over-coffee-set"],
            },
          ],
        },
        status: "active",
        rollbackOfVersionId: null,
        publishedByUserId: "demo-operator",
        publishedAt: new Date("2026-05-23T12:05:00.000Z"),
      });

      database.deleteStorefrontConfig("storefront-draft-delete");

      expect(database.findStorefrontConfigById("storefront-draft-delete")).toBeNull();
      expect(database.findPublishedStorefrontVersionById("published-halloween")).toMatchObject({
        id: "published-halloween",
        config: { versionName: "Halloween" },
      });
    } finally {
      database.close();
    }
  });

  it("backfills visual assets when reading legacy storefront configs", () => {
    const database = createCommerceDatabase();

    try {
      database.savePublishedStorefrontVersion({
        id: "legacy-version",
        sourceStorefrontConfigId: "legacy-draft",
        config: {
          id: "secret-santa-storefront",
          campaignId: "secret-santa-2026",
          versionName: "Secret Santa",
          style: {
            theme: "holiday",
            accentColor: "#be123c",
            density: "compact",
          },
          sections: [
            {
              id: "ss-hero",
              type: "hero",
              title: "Secret Santa gifts",
              body: "Under £50.",
              productIds: ["pour-over-coffee-set"],
            },
          ],
        } as PublishedStorefrontVersion["config"],
        status: "active",
        rollbackOfVersionId: null,
        publishedByUserId: "demo-operator",
        publishedAt: new Date("2026-05-22T15:30:00.000Z"),
      });

      expect(database.findActiveStorefrontVersion()?.config.visualAsset).toEqual(
        secretSantaVisualAsset,
      );
    } finally {
      database.close();
    }
  });

  it("persists published storefront versions and tracks the active version", () => {
    const database = createCommerceDatabase();

    try {
      database.savePublishedStorefrontVersion({
        id: "version-1",
        sourceStorefrontConfigId: "storefront-draft-1",
        config: {
          id: "fathers-day-storefront",
          campaignId: "fathers-day-2026",
          versionName: "Father’s Day",
          style: {
            theme: "summer",
            accentColor: "#b45309",
            density: "editorial",
          },
          visualAsset: fatherDayVisualAsset,
          sections: [
            {
              id: "fd-hero",
              type: "hero",
              title: "Father’s Day gifts",
              body: "Practical picks.",
              productIds: ["portable-charcoal-grill"],
            },
          ],
        },
        status: "active",
        rollbackOfVersionId: null,
        publishedByUserId: "demo-operator",
        publishedAt: new Date("2026-05-22T15:00:00.000Z"),
      });
      database.savePublishedStorefrontVersion({
        id: "version-2",
        sourceStorefrontConfigId: "storefront-draft-2",
        config: {
          id: "secret-santa-storefront",
          campaignId: "secret-santa-2026",
          versionName: "Secret Santa",
          style: {
            theme: "holiday",
            accentColor: "#be123c",
            density: "compact",
          },
          visualAsset: secretSantaVisualAsset,
          sections: [
            {
              id: "ss-hero",
              type: "hero",
              title: "Secret Santa gifts",
              body: "Under £50.",
              productIds: ["pour-over-coffee-set"],
            },
          ],
        },
        status: "active",
        rollbackOfVersionId: null,
        publishedByUserId: "demo-operator",
        publishedAt: new Date("2026-05-22T16:00:00.000Z"),
      });

      expect(database.findActiveStorefrontVersion()).toMatchObject({
        id: "version-2",
        status: "active",
        config: {
          versionName: "Secret Santa",
        },
      });
      expect(database.listPublishedStorefrontVersions()).toMatchObject([
        {
          id: "version-2",
          status: "active",
          rollbackOfVersionId: null,
        },
        {
          id: "version-1",
          status: "inactive",
          rollbackOfVersionId: null,
        },
      ]);
    } finally {
      database.close();
    }
  });

  it("persists inactive rollback targets without changing the active storefront version", () => {
    const database = createCommerceDatabase();

    try {
      expect(database.findActiveStorefrontVersion()).toBeNull();
      expect(database.findPublishedStorefrontVersionById("missing-version")).toBeNull();

      database.savePublishedStorefrontVersion({
        id: "version-archive",
        sourceStorefrontConfigId: "storefront-draft-1",
        config: {
          id: "fathers-day-storefront",
          campaignId: "fathers-day-2026",
          versionName: "Father’s Day",
          style: {
            theme: "summer",
            accentColor: "#b45309",
            density: "editorial",
          },
          visualAsset: fatherDayVisualAsset,
          sections: [
            {
              id: "fd-hero",
              type: "hero",
              title: "Father’s Day gifts",
              body: "Practical picks.",
              productIds: ["portable-charcoal-grill"],
            },
          ],
        },
        status: "inactive",
        rollbackOfVersionId: "version-previous",
        publishedByUserId: "demo-operator",
        publishedAt: new Date("2026-05-22T17:00:00.000Z"),
      });

      expect(database.findActiveStorefrontVersion()).toBeNull();
      expect(database.findPublishedStorefrontVersionById("version-archive")).toMatchObject({
        id: "version-archive",
        status: "inactive",
        rollbackOfVersionId: "version-previous",
      });
    } finally {
      database.close();
    }
  });
});

const fatherDayVisualAsset = {
  id: "fathers-day-2026-hero-asset",
  campaignId: "fathers-day-2026",
  prompt: "Warm outdoor Father’s Day gifting scene.",
  alt: "A warm outdoor Father’s Day gifting scene with grilling and travel essentials.",
  source: "static" as const,
  path: "/static-assets/fathers-day-hero.svg",
  composition: defaultStorefrontHeroImageComposition,
};

const secretSantaVisualAsset = {
  id: "secret-santa-2026-hero-asset",
  campaignId: "secret-santa-2026",
  prompt: "Playful office Secret Santa gifting.",
  alt: "A festive desk scene with wrapped small gifts from Atlas & Co.",
  source: "static" as const,
  path: "/static-assets/secret-santa-hero.svg",
  composition: defaultStorefrontHeroImageComposition,
};
