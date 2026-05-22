import { describe, expect, it } from "vitest";
import type { MetricsTrace } from "@/domain/metricsTrace";
import {
  proposeCampaignFromMetricsTrace,
  revampCampaignProposalForSeason,
} from "@/domain/operatorCampaign";
import { products } from "@/fixtures/products";
import type { CodexHarness } from "@/harness/codexHarness";
import { fixtureCodexHarness } from "@/harness/codexHarness";

describe("Operator campaign proposal flow", () => {
  it("creates and saves a validated Father’s Day campaign proposal from a Metrics Copilot trace", async () => {
    const savedProposals: unknown[] = [];

    const proposal = await proposeCampaignFromMetricsTrace({
      id: "proposal-1",
      sourceTrace: {
        id: "trace-1",
        question:
          "What should we promote for Father’s Day based on margin, inventory, and conversion?",
        operationName: "FatherDayPromotionCandidates",
        validationStatus: "valid",
        validationErrors: [],
        generatedGraphql: "query FatherDayPromotionCandidates { products { id } }",
        rationale: "Rank Father’s Day products.",
        chartType: "productTable",
        recommendedProductIds: [
          "portable-charcoal-grill",
          "cast-iron-grill-press",
          "leather-weekender-bag",
          "travel-grooming-kit",
          "wireless-charging-valet",
          "insulated-cooler-tote",
        ],
        createdByUserId: "demo-manager",
        createdAt: new Date("2026-05-22T10:00:00.000Z"),
      },
      harness: fixtureCodexHarness,
      products,
      createdByUserId: "demo-operator",
      createdAt: new Date("2026-05-22T12:00:00.000Z"),
      proposalStore: {
        saveCampaignProposal(savedProposal) {
          savedProposals.push(savedProposal);
        },
      },
    });

    expect(proposal).toMatchObject({
      id: "proposal-1",
      sourceTraceId: "trace-1",
      validationStatus: "valid",
      validationErrors: [],
      createdByUserId: "demo-operator",
      createdAt: new Date("2026-05-22T12:00:00.000Z"),
      campaign: {
        id: "fathers-day-2026",
        season: "fathers-day",
        name: "Grill, Travel, and Everyday Carry",
      },
    });
    expect(proposal.campaign.productIds).toEqual([
      "portable-charcoal-grill",
      "cast-iron-grill-press",
      "leather-weekender-bag",
      "travel-grooming-kit",
      "wireless-charging-valet",
      "insulated-cooler-tote",
    ]);
    expect(savedProposals).toEqual([proposal]);
  });

  it("marks generated proposals invalid when campaign products are outside the fixture catalog", async () => {
    const invalidProductHarness: CodexHarness = {
      ...fixtureCodexHarness,
      async generateCampaignProposal(input) {
        const campaign = await fixtureCodexHarness.generateCampaignProposal(input);

        return {
          ...campaign,
          productIds: [...campaign.productIds, "missing-product"],
        };
      },
    };

    const proposal = await proposeCampaignFromMetricsTrace({
      id: "proposal-invalid",
      sourceTrace: {
        ...fatherDayTrace,
        question: "Turn the Father’s Day campaign into a Secret Santa campaign under £50.",
      },
      harness: invalidProductHarness,
      products,
      createdByUserId: "demo-operator",
      createdAt: new Date("2026-05-22T13:00:00.000Z"),
      proposalStore: {
        saveCampaignProposal() {},
      },
    });

    expect(proposal.campaign.season).toBe("secret-santa");
    expect(proposal.validationStatus).toBe("invalid");
    expect(proposal.validationErrors).toEqual([
      'Campaign references unknown product "missing-product".',
    ]);
  });

  it("marks Secret Santa proposals invalid when selected products exceed £50", async () => {
    const overpricedGiftHarness: CodexHarness = {
      ...fixtureCodexHarness,
      async generateCampaignProposal(input) {
        const campaign = await fixtureCodexHarness.generateCampaignProposal(input);

        return {
          ...campaign,
          productIds: [...campaign.productIds, "portable-charcoal-grill"],
        };
      },
    };

    const proposal = await proposeCampaignFromMetricsTrace({
      id: "proposal-overpriced",
      sourceTrace: {
        ...fatherDayTrace,
        question: "Turn the Father’s Day campaign into a Secret Santa campaign under £50.",
      },
      harness: overpricedGiftHarness,
      products,
      createdByUserId: "demo-operator",
      createdAt: new Date("2026-05-22T13:30:00.000Z"),
      proposalStore: {
        saveCampaignProposal() {},
      },
    });

    expect(proposal.campaign.season).toBe("secret-santa");
    expect(proposal.validationStatus).toBe("invalid");
    expect(proposal.validationErrors).toContain(
      'Secret Santa campaign product "Portable Charcoal Grill" exceeds the £50 limit.',
    );
  });

  it("rewrites a Father’s Day proposal into a saved Secret Santa proposal under £50", async () => {
    const savedProposals: unknown[] = [];

    const proposal = await revampCampaignProposalForSeason({
      id: "proposal-secret-santa",
      sourceProposal: fatherDayProposal,
      season: "secret-santa",
      harness: fixtureCodexHarness,
      products,
      createdByUserId: "demo-operator",
      createdAt: new Date("2026-05-22T15:00:00.000Z"),
      proposalStore: {
        saveCampaignProposal(savedProposal) {
          savedProposals.push(savedProposal);
        },
      },
    });

    const selectedProducts = products.filter((product) =>
      proposal.campaign.productIds.includes(product.id),
    );

    expect(proposal).toMatchObject({
      id: "proposal-secret-santa",
      sourceTraceId: "trace-1",
      validationStatus: "valid",
      validationErrors: [],
      campaign: {
        id: "secret-santa-2026",
        season: "secret-santa",
        name: "Secret Santa Gifts That Look Effortless",
        audience: "Office gift buyers, last-minute shoppers, and friends shopping under £50.",
      },
    });
    expect(proposal.campaign.summary).not.toContain("Father’s Day");
    expect(proposal.campaign.storefrontAngle).toContain("price band");
    expect(selectedProducts.every((product) => product.price <= 50)).toBe(true);
    expect(savedProposals).toEqual([proposal]);
  });
});

const fatherDayTrace: MetricsTrace = {
  id: "trace-1",
  question: "What should we promote for Father’s Day based on margin, inventory, and conversion?",
  operationName: "FatherDayPromotionCandidates",
  validationStatus: "valid",
  validationErrors: [],
  generatedGraphql: "query FatherDayPromotionCandidates { products { id } }",
  rationale: "Rank Father’s Day products.",
  chartType: "productTable",
  recommendedProductIds: [
    "portable-charcoal-grill",
    "cast-iron-grill-press",
    "leather-weekender-bag",
    "travel-grooming-kit",
    "wireless-charging-valet",
    "insulated-cooler-tote",
  ],
  createdByUserId: "demo-manager",
  createdAt: new Date("2026-05-22T10:00:00.000Z"),
};

const fatherDayProposal = {
  id: "proposal-1",
  sourceTraceId: "trace-1",
  campaign: {
    id: "fathers-day-2026",
    name: "Grill, Travel, and Everyday Carry",
    season: "fathers-day" as const,
    summary: "A margin-friendly Father’s Day campaign built around outdoor hosting and travel.",
    audience: "Gift buyers shopping for practical premium Father’s Day products.",
    productIds: [
      "portable-charcoal-grill",
      "cast-iron-grill-press",
      "leather-weekender-bag",
      "travel-grooming-kit",
      "wireless-charging-valet",
      "insulated-cooler-tote",
    ],
    expectedImpact:
      "Lift gift collection conversion by focusing on high-stock, high-margin products.",
    storefrontAngle:
      "Lead with confident gifting, outdoor hosting, and polished travel essentials.",
  },
  validationStatus: "valid" as const,
  validationErrors: [],
  createdByUserId: "demo-operator",
  createdAt: new Date("2026-05-22T12:00:00.000Z"),
};
