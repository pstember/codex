import { describe, expect, it } from "vitest";
import type { MetricsTrace } from "@/domain/metricsTrace";
import { proposeCampaignFromMetricsTrace } from "@/domain/operatorCampaign";
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
