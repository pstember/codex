import { describe, expect, it } from "vitest";
import { campaignSchema } from "@/domain/campaign";
import { generatedQuerySchema, insightSummarySchema } from "@/domain/insight";
import { storefrontConfigSchema } from "@/domain/storefront";
import {
  type CodexAppServerJsonRunner,
  cliCodexHarness,
  createAppServerCodexHarness,
  getCodexHarness,
  staticCommerceHarness,
} from "@/harness/codexHarness";
import { fixtureCodexHarness } from "./support/fixtureCodexHarness";

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

  it("routes the CLI harness through static catalog derivation for now", async () => {
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

  it("derives runtime fallback outputs from static catalog data instead of generated fixtures", async () => {
    const underFiftyQuery = await staticCommerceHarness.generateGraphQLQuery(
      "Which under £50 products have enough inventory?",
    );
    const riskInsight = await staticCommerceHarness.summarizeInsight(
      "Which products should we avoid because of risk?",
    );
    const mobileInsight = await staticCommerceHarness.summarizeInsight(
      "Why did mobile conversion drop last week?",
    );
    const exposureInsight = await staticCommerceHarness.summarizeInsight(
      "Which products have high inventory but are underexposed?",
    );
    const campaign = await staticCommerceHarness.generateCampaignProposal({
      insightTitle: exposureInsight.title,
      season: "secret-santa",
    });
    const storefront = await staticCommerceHarness.generateStorefrontConfig(campaign);

    expect(staticCommerceHarness.mode).toBe("static");
    expect(underFiftyQuery.query).toContain("maxPrice: 50");
    expect(riskInsight.recommendedProductIds).toContain("espresso-machine");
    expect(mobileInsight.recommendedProductIds).toContain("espresso-machine");
    expect(exposureInsight.recommendedProductIds).toContain("desk-organizer-tray");
    expect(campaign.productIds.every((productId) => productId !== "espresso-machine")).toBe(true);
    expect(storefront.campaignId).toBe(campaign.id);
  });

  it("routes the App Server harness through a JSON prompt runner and validates outputs", async () => {
    const requestedSchemas: string[] = [];
    const fakeJsonRunner: CodexAppServerJsonRunner = async <T>(input: {
      prompt: string;
      schemaName: string;
      jsonSchema: Record<string, unknown>;
    }) => {
      const { schemaName } = input;
      requestedSchemas.push(schemaName);
      let result: unknown;

      if (schemaName === "GeneratedQuery") {
        result = await fixtureCodexHarness.generateGraphQLQuery("Father’s Day");
        return result as T;
      }

      if (schemaName === "InsightSummary") {
        result = await fixtureCodexHarness.summarizeInsight("Father’s Day");
        return result as T;
      }

      if (schemaName === "Campaign") {
        result = await fixtureCodexHarness.generateCampaignProposal({
          insightTitle: "Father’s Day",
          season: "fathers-day",
        });
        return result as T;
      }

      result = await fixtureCodexHarness.generateStorefrontConfig(fatherCampaignFixture());
      return result as T;
    };
    const appServerHarness = createAppServerCodexHarness(fakeJsonRunner);

    const query = await appServerHarness.generateGraphQLQuery("Father’s Day");
    const insight = await appServerHarness.summarizeInsight("Father’s Day");
    const campaign = await appServerHarness.generateCampaignProposal({
      insightTitle: "Father’s Day",
      season: "fathers-day",
    });
    const storefront = await appServerHarness.generateStorefrontConfig(campaign);

    expect(appServerHarness.mode).toBe("app-server");
    expect(generatedQuerySchema.parse(query).operationName).toBe("FatherDayPromotionCandidates");
    expect(insightSummarySchema.parse(insight).recommendedProductIds).toContain(
      "portable-charcoal-grill",
    );
    expect(campaignSchema.parse(campaign).season).toBe("fathers-day");
    expect(storefrontConfigSchema.parse(storefront).campaignId).toBe("fathers-day-2026");
    expect(requestedSchemas).toEqual([
      "GeneratedQuery",
      "InsightSummary",
      "Campaign",
      "StorefrontConfig",
    ]);
  });

  it("selects static data mode by default and App Server mode only when explicitly configured", () => {
    const originalMode = process.env.CODEX_HARNESS_MODE;

    delete process.env.CODEX_HARNESS_MODE;
    expect(getCodexHarness().mode).toBe("static");

    process.env.CODEX_HARNESS_MODE = "app-server";
    expect(getCodexHarness().mode).toBe("app-server");

    if (originalMode === undefined) {
      delete process.env.CODEX_HARNESS_MODE;
    } else {
      process.env.CODEX_HARNESS_MODE = originalMode;
    }
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
