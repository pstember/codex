import { describe, expect, it } from "vitest";
import type { PublishedStorefrontVersion } from "@/domain/storefrontPublishing";
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

  it("persists and lists recent Metrics Copilot traces", () => {
    const database = createCommerceDatabase();

    try {
      database.saveMetricsTrace({
        id: "trace-1",
        question: "What should we promote for Father’s Day?",
        operationName: "FatherDayPromotionCandidates",
        validationStatus: "valid",
        validationErrors: [],
        generatedGraphql: "query FatherDayPromotionCandidates { products { id } }",
        rationale: "Rank products by margin, inventory, and conversion.",
        chartType: "productTable",
        recommendedProductIds: ["portable-charcoal-grill"],
        createdByUserId: "demo-manager",
        createdAt: new Date("2026-05-22T10:00:00.000Z"),
      });

      expect(database.listRecentMetricsTraces()).toEqual([
        {
          id: "trace-1",
          question: "What should we promote for Father’s Day?",
          operationName: "FatherDayPromotionCandidates",
          validationStatus: "valid",
          validationErrors: [],
          generatedGraphql: "query FatherDayPromotionCandidates { products { id } }",
          rationale: "Rank products by margin, inventory, and conversion.",
          chartType: "productTable",
          recommendedProductIds: ["portable-charcoal-grill"],
          createdByUserId: "demo-manager",
          createdAt: new Date("2026-05-22T10:00:00.000Z"),
        },
      ]);
      expect(database.findMetricsTraceById("trace-1")).toEqual({
        id: "trace-1",
        question: "What should we promote for Father’s Day?",
        operationName: "FatherDayPromotionCandidates",
        validationStatus: "valid",
        validationErrors: [],
        generatedGraphql: "query FatherDayPromotionCandidates { products { id } }",
        rationale: "Rank products by margin, inventory, and conversion.",
        chartType: "productTable",
        recommendedProductIds: ["portable-charcoal-grill"],
        createdByUserId: "demo-manager",
        createdAt: new Date("2026-05-22T10:00:00.000Z"),
      });
    } finally {
      database.close();
    }
  });

  it("persists Operator campaign proposals for review", () => {
    const database = createCommerceDatabase();

    try {
      database.saveCampaignProposal({
        id: "proposal-1",
        sourceTraceId: "trace-1",
        campaign: {
          id: "fathers-day-2026",
          name: "Grill, Travel, and Everyday Carry",
          season: "fathers-day",
          summary: "A fixture campaign.",
          audience: "Father’s Day gift buyers.",
          productIds: ["portable-charcoal-grill"],
          expectedImpact: "Lift gift conversion.",
          storefrontAngle: "Confident Father’s Day gifting.",
        },
        validationStatus: "valid",
        validationErrors: [],
        createdByUserId: "demo-operator",
        createdAt: new Date("2026-05-22T12:00:00.000Z"),
      });

      expect(database.listRecentCampaignProposals()).toEqual([
        {
          id: "proposal-1",
          sourceTraceId: "trace-1",
          campaign: {
            id: "fathers-day-2026",
            name: "Grill, Travel, and Everyday Carry",
            season: "fathers-day",
            summary: "A fixture campaign.",
            audience: "Father’s Day gift buyers.",
            productIds: ["portable-charcoal-grill"],
            expectedImpact: "Lift gift conversion.",
            storefrontAngle: "Confident Father’s Day gifting.",
          },
          validationStatus: "valid",
          validationErrors: [],
          createdByUserId: "demo-operator",
          createdAt: new Date("2026-05-22T12:00:00.000Z"),
        },
      ]);
      expect(database.findCampaignProposalById("proposal-1")?.sourceTraceId).toBe("trace-1");
    } finally {
      database.close();
    }
  });

  it("persists generated storefront configs for Operator review", () => {
    const database = createCommerceDatabase();

    try {
      database.saveStorefrontConfig({
        id: "storefront-draft-1",
        sourceProposalId: "proposal-1",
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
        validationStatus: "valid",
        validationErrors: [],
        createdByUserId: "demo-operator",
        createdAt: new Date("2026-05-22T14:00:00.000Z"),
      });

      expect(database.listRecentStorefrontConfigs()).toEqual([
        {
          id: "storefront-draft-1",
          sourceProposalId: "proposal-1",
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
          validationStatus: "valid",
          validationErrors: [],
          createdByUserId: "demo-operator",
          createdAt: new Date("2026-05-22T14:00:00.000Z"),
        },
      ]);
      expect(database.findStorefrontConfigById("storefront-draft-1")?.sourceProposalId).toBe(
        "proposal-1",
      );
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
};

const secretSantaVisualAsset = {
  id: "secret-santa-2026-hero-asset",
  campaignId: "secret-santa-2026",
  prompt: "Playful office Secret Santa gifting.",
  alt: "A festive desk scene with wrapped small gifts from Atlas & Co.",
  source: "static" as const,
  path: "/static-assets/secret-santa-hero.svg",
};
