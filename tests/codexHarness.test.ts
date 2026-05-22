import { describe, expect, it } from "vitest";
import { campaignSchema } from "@/domain/campaign";
import { generatedQuerySchema, insightSummarySchema } from "@/domain/insight";
import { storefrontConfigSchema } from "@/domain/storefront";
import {
  appServerCodexHarness,
  cliCodexHarness,
  fixtureCodexHarness,
} from "@/harness/codexHarness";

describe("fixture Codex harness", () => {
  it("generates a valid Father’s Day GraphQL query fixture", async () => {
    const result = await fixtureCodexHarness.generateGraphQLQuery(
      "What should we promote for Father’s Day based on margin, inventory, and conversion?",
    );

    expect(generatedQuerySchema.parse(result).operationName).toBe("FatherDayPromotionCandidates");
    expect(result.query).toContain("products");
    expect(result.recommendedChart).toBe("productTable");
  });

  it("summarizes Father’s Day insight with expected risk exclusions", async () => {
    const result = await fixtureCodexHarness.summarizeInsight("Father’s Day");

    expect(insightSummarySchema.parse(result).recommendedProductIds).toContain(
      "portable-charcoal-grill",
    );
    expect(result.risks.join(" ")).toContain("espresso machine");
  });

  it("generates a valid Secret Santa campaign and storefront config", async () => {
    const campaign = await fixtureCodexHarness.generateCampaignProposal({
      insightTitle: "Revamp Father’s Day",
      season: "secret-santa",
    });
    const storefront = await fixtureCodexHarness.generateStorefrontConfig(campaign);

    expect(campaignSchema.parse(campaign).season).toBe("secret-santa");
    expect(campaign.productIds.every((productId) => productId !== "espresso-machine")).toBe(true);
    expect(storefrontConfigSchema.parse(storefront).style.theme).toBe("holiday");
  });

  it("generates query and insight fixtures for the approved Manager metric questions", async () => {
    const query = await fixtureCodexHarness.generateGraphQLQuery(
      "Which products have high inventory but are underexposed on the storefront?",
    );
    const insight = await fixtureCodexHarness.summarizeInsight(
      "Which products have high inventory but are underexposed on the storefront?",
    );

    expect(generatedQuerySchema.parse(query).operationName).toBe(
      "UnderexposedHighInventoryProducts",
    );
    expect(insightSummarySchema.parse(insight).recommendedProductIds).toContain(
      "desk-organizer-tray",
    );
  });

  it("summarizes Secret Santa insight when asked directly", async () => {
    const insight = await fixtureCodexHarness.summarizeInsight(
      "Turn the Father’s Day campaign into a Secret Santa campaign under £50.",
    );

    expect(insightSummarySchema.parse(insight).recommendedProductIds).toContain(
      "pour-over-coffee-set",
    );
  });

  it("generates a Secret Santa query fixture when the question asks for the seasonal revamp", async () => {
    const result = await fixtureCodexHarness.generateGraphQLQuery(
      "Turn the Father’s Day campaign into a Secret Santa campaign under £50.",
    );

    expect(generatedQuerySchema.parse(result).operationName).toBe("SecretSantaCandidates");
    expect(result.query).toContain("maxPrice: 50");
  });

  it("routes the CLI harness through the deterministic fixture implementation for now", async () => {
    const campaign = await cliCodexHarness.generateCampaignProposal({
      insightTitle: "Father’s Day",
      season: "fathers-day",
    });
    const storefront = await cliCodexHarness.generateStorefrontConfig(campaign);
    const query = await cliCodexHarness.generateGraphQLQuery("Father’s Day");
    const insight = await cliCodexHarness.summarizeInsight("Father’s Day");

    expect(cliCodexHarness.mode).toBe("cli");
    expect(campaignSchema.parse(campaign).season).toBe("fathers-day");
    expect(storefrontConfigSchema.parse(storefront).style.theme).toBe("summer");
    expect(generatedQuerySchema.parse(query).operationName).toBe("FatherDayPromotionCandidates");
    expect(insightSummarySchema.parse(insight).recommendedProductIds.length).toBeGreaterThan(0);
  });

  it("keeps the App Server harness explicitly blocked until configured", async () => {
    await expect(appServerCodexHarness.generateGraphQLQuery("Father’s Day")).rejects.toThrow(
      "Codex App Server is not configured yet.",
    );
    await expect(appServerCodexHarness.summarizeInsight("Father’s Day")).rejects.toThrow(
      "Codex App Server is not configured yet.",
    );
    await expect(
      appServerCodexHarness.generateCampaignProposal({
        insightTitle: "Father’s Day",
        season: "fathers-day",
      }),
    ).rejects.toThrow("Codex App Server is not configured yet.");
    await expect(
      appServerCodexHarness.generateStorefrontConfig(fatherCampaignFixture()),
    ).rejects.toThrow("Codex App Server is not configured yet.");
  });
});

function fatherCampaignFixture() {
  return {
    id: "fathers-day-2026",
    name: "Grill, Travel, and Everyday Carry",
    season: "fathers-day" as const,
    summary: "A fixture campaign.",
    audience: "Father’s Day shoppers.",
    productIds: ["portable-charcoal-grill"],
    expectedImpact: "Expected lift.",
    storefrontAngle: "Useful gifts.",
  };
}
