import { describe, expect, it } from "vitest";
import type { CampaignProposal } from "@/domain/operatorCampaign";
import { generateStorefrontConfigFromProposal } from "@/domain/storefrontGeneration";
import { products } from "@/fixtures/products";
import type { CodexHarness } from "@/harness/codexHarness";
import { fixtureCodexHarness } from "@/harness/codexHarness";
import type { ImageHarness } from "@/harness/imageHarness";

describe("Operator storefront config generation", () => {
  it("creates and saves a validated storefront config from an approved campaign proposal", async () => {
    const savedConfigs: unknown[] = [];

    const storefront = await generateStorefrontConfigFromProposal({
      id: "storefront-draft-1",
      proposal: fatherDayProposal,
      harness: fixtureCodexHarness,
      products,
      createdByUserId: "demo-operator",
      createdAt: new Date("2026-05-22T14:00:00.000Z"),
      storefrontStore: {
        saveStorefrontConfig(savedConfig) {
          savedConfigs.push(savedConfig);
        },
      },
    });

    expect(storefront).toMatchObject({
      id: "storefront-draft-1",
      sourceProposalId: "proposal-1",
      validationStatus: "valid",
      validationErrors: [],
      createdByUserId: "demo-operator",
      createdAt: new Date("2026-05-22T14:00:00.000Z"),
      config: {
        id: "fathers-day-storefront",
        campaignId: "fathers-day-2026",
        versionName: "Father’s Day",
      },
    });
    expect(storefront.config.sections.map((section) => section.type)).toEqual([
      "hero",
      "bundleCards",
    ]);
    expect(savedConfigs).toEqual([storefront]);
  });

  it("marks generated storefront configs invalid when sections reference unknown products", async () => {
    const invalidStorefrontHarness: CodexHarness = {
      ...fixtureCodexHarness,
      async generateStorefrontConfig(campaign) {
        const config = await fixtureCodexHarness.generateStorefrontConfig(campaign);

        return {
          ...config,
          sections: [
            ...config.sections,
            {
              id: "bad-rail",
              type: "productRail",
              title: "Bad rail",
              productIds: ["missing-product"],
            },
          ],
        };
      },
    };

    const storefront = await generateStorefrontConfigFromProposal({
      id: "storefront-invalid",
      proposal: fatherDayProposal,
      harness: invalidStorefrontHarness,
      products,
      createdByUserId: "demo-operator",
      createdAt: new Date("2026-05-22T14:30:00.000Z"),
      storefrontStore: {
        saveStorefrontConfig() {},
      },
    });

    expect(storefront.validationStatus).toBe("invalid");
    expect(storefront.validationErrors).toEqual([
      'Storefront section references unknown product "missing-product".',
    ]);
  });

  it("marks Secret Santa storefront configs invalid when sections include products above £50", async () => {
    const overpricedStorefrontHarness: CodexHarness = {
      ...fixtureCodexHarness,
      async generateStorefrontConfig(campaign) {
        const config = await fixtureCodexHarness.generateStorefrontConfig(campaign);

        return {
          ...config,
          sections: [
            ...config.sections,
            {
              id: "bad-price-band",
              type: "productRail",
              title: "Too generous for Secret Santa",
              productIds: ["portable-charcoal-grill"],
            },
          ],
        };
      },
    };

    const storefront = await generateStorefrontConfigFromProposal({
      id: "storefront-overpriced",
      proposal: secretSantaProposal,
      harness: overpricedStorefrontHarness,
      products,
      createdByUserId: "demo-operator",
      createdAt: new Date("2026-05-22T14:45:00.000Z"),
      storefrontStore: {
        saveStorefrontConfig() {},
      },
    });

    expect(storefront.validationStatus).toBe("invalid");
    expect(storefront.validationErrors).toContain(
      'Secret Santa storefront product "Portable Charcoal Grill" exceeds the £50 limit.',
    );
  });

  it("rejects invalid campaign proposals before storefront generation", async () => {
    await expect(
      generateStorefrontConfigFromProposal({
        id: "storefront-invalid-proposal",
        proposal: {
          ...fatherDayProposal,
          validationStatus: "invalid",
          validationErrors: ["Campaign references unknown product."],
        },
        harness: fixtureCodexHarness,
        products,
        createdByUserId: "demo-operator",
        createdAt: new Date("2026-05-22T14:50:00.000Z"),
        storefrontStore: {
          saveStorefrontConfig() {},
        },
      }),
    ).rejects.toThrow("Only valid campaign proposals can generate storefront configs.");
  });

  it("marks generated storefront configs invalid when the visual asset belongs to another campaign", async () => {
    const storefront = await generateStorefrontConfigFromProposal({
      id: "storefront-visual-mismatch",
      proposal: fatherDayProposal,
      harness: fixtureCodexHarness,
      imageHarness: {
        mode: "fixture",
        async generateCampaignHero() {
          return {
            id: "secret-santa-2026-hero-asset",
            campaignId: "secret-santa-2026",
            prompt: "Wrong seasonal visual.",
            alt: "A mismatched Secret Santa visual.",
            source: "fixture",
            path: "/fixtures/secret-santa-hero.svg",
          };
        },
      },
      products,
      createdByUserId: "demo-operator",
      createdAt: new Date("2026-05-22T14:55:00.000Z"),
      storefrontStore: {
        saveStorefrontConfig() {},
      },
    });

    expect(storefront.validationStatus).toBe("invalid");
    expect(storefront.validationErrors).toContain(
      'Storefront visual asset campaign "secret-santa-2026" does not match storefront campaign "fathers-day-2026".',
    );
  });

  it("adds a fixture-backed Secret Santa hero asset from the campaign visual direction", async () => {
    const storefront = await generateStorefrontConfigFromProposal({
      id: "storefront-secret-santa",
      proposal: secretSantaProposal,
      harness: fixtureCodexHarness,
      imageHarness: secretSantaImageHarness,
      products,
      createdByUserId: "demo-operator",
      createdAt: new Date("2026-05-22T15:00:00.000Z"),
      storefrontStore: {
        saveStorefrontConfig() {},
      },
    });

    expect(storefront.validationStatus).toBe("valid");
    expect(storefront.config).toHaveProperty("visualAsset", {
      id: "secret-santa-2026-hero-asset",
      campaignId: "secret-santa-2026",
      prompt: "Playful office Secret Santa gifting.",
      alt: "Fixture holiday desk scene with wrapped Secret Santa gifts from Atlas & Co.",
      source: "fixture",
      path: "/fixtures/secret-santa-hero.svg",
    });
  });
});

const secretSantaImageHarness: ImageHarness = {
  mode: "fixture",
  async generateCampaignHero(input) {
    return {
      id: `${input.campaignId}-hero-asset`,
      campaignId: input.campaignId,
      prompt: input.visualDirection,
      alt: "Fixture holiday desk scene with wrapped Secret Santa gifts from Atlas & Co.",
      source: "fixture",
      path: "/fixtures/secret-santa-hero.svg",
    };
  },
};

const fatherDayProposal: CampaignProposal = {
  id: "proposal-1",
  sourceTraceId: "trace-1",
  campaign: {
    id: "fathers-day-2026",
    name: "Grill, Travel, and Everyday Carry",
    season: "fathers-day",
    summary: "A fixture campaign.",
    audience: "Father’s Day gift buyers.",
    productIds: [
      "portable-charcoal-grill",
      "cast-iron-grill-press",
      "leather-weekender-bag",
      "travel-grooming-kit",
      "wireless-charging-valet",
      "insulated-cooler-tote",
    ],
    expectedImpact: "Lift gift conversion.",
    storefrontAngle: "Confident Father’s Day gifting.",
  },
  validationStatus: "valid",
  validationErrors: [],
  createdByUserId: "demo-operator",
  createdAt: new Date("2026-05-22T12:00:00.000Z"),
};

const secretSantaProposal: CampaignProposal = {
  id: "proposal-2",
  sourceTraceId: "trace-2",
  campaign: {
    id: "secret-santa-2026",
    name: "Secret Santa Gifts That Look Effortless",
    season: "secret-santa",
    summary: "A fixture campaign.",
    audience: "Office gift buyers shopping under £50.",
    productIds: [
      "cast-iron-grill-press",
      "travel-grooming-kit",
      "wireless-charging-valet",
      "pour-over-coffee-set",
      "desk-organizer-tray",
    ],
    expectedImpact: "Lift holiday gift conversion.",
    storefrontAngle: "Playful office Secret Santa gifting.",
  },
  validationStatus: "valid",
  validationErrors: [],
  createdByUserId: "demo-operator",
  createdAt: new Date("2026-05-22T13:30:00.000Z"),
};
