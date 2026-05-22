import type { Campaign } from "@/domain/campaign";
import type { GeneratedQuery, InsightSummary } from "@/domain/insight";
import type { StorefrontConfig } from "@/domain/storefront";
import { fatherDayCampaign, secretSantaCampaign } from "@/fixtures/campaigns";
import { fatherDayStorefront, secretSantaStorefront } from "@/fixtures/storefront";

export type CodexHarnessMode = "fixture" | "cli" | "app-server";

export interface CodexHarness {
  readonly mode: CodexHarnessMode;
  generateGraphQLQuery(question: string): Promise<GeneratedQuery>;
  summarizeInsight(question: string): Promise<InsightSummary>;
  generateCampaignProposal(input: {
    insightTitle: string;
    season: "fathers-day" | "secret-santa";
  }): Promise<Campaign>;
  generateStorefrontConfig(campaign: Campaign): Promise<StorefrontConfig>;
}

const fatherDayQuery: GeneratedQuery = {
  question: "What should we promote for Father’s Day based on margin, inventory, and conversion?",
  operationName: "FatherDayPromotionCandidates",
  query: `query FatherDayPromotionCandidates {
  products(filter: { tags: ["fathers-day"] }) {
    id
    name
    marginPercent
    inventory
    conversionRate
    returnRate
  }
}`,
  rationale:
    "Rank Father’s Day-tagged products by healthy inventory, strong margin, conversion, and low return risk.",
  recommendedChart: "productTable",
};

const secretSantaQuery: GeneratedQuery = {
  question: "Turn the Father’s Day campaign into a Secret Santa campaign under £50.",
  operationName: "SecretSantaCandidates",
  query: `query SecretSantaCandidates {
  products(filter: { tags: ["secret-santa"], maxPrice: 50 }) {
    id
    name
    price
    marginPercent
    inventory
    returnRate
  }
}`,
  rationale:
    "Find giftable under-£50 products with enough stock, healthy margins, and low return-rate risk.",
  recommendedChart: "productTable",
};

export const fixtureCodexHarness: CodexHarness = {
  mode: "fixture",
  async generateGraphQLQuery(question) {
    if (question.toLowerCase().includes("secret santa")) {
      return { ...secretSantaQuery, question };
    }

    return { ...fatherDayQuery, question };
  },
  async summarizeInsight(question) {
    if (question.toLowerCase().includes("secret santa")) {
      return {
        title: "Under-£50 giftability is strongest in coffee, desk, grooming, and compact tech.",
        summary:
          "Secret Santa should avoid high-return electronics and focus on high-stock small gifts.",
        recommendedProductIds: secretSantaCampaign.productIds,
        risks: ["Avoid noise-canceling earbuds because return rate is elevated."],
      };
    }

    return {
      title: "Father’s Day opportunity favors grilling, travel, and everyday carry.",
      summary:
        "Outdoor and travel products combine high margin, healthy inventory, and strong conversion.",
      recommendedProductIds: fatherDayCampaign.productIds,
      risks: [
        "Do not lead with the espresso machine because stock is low and margin is weak.",
        "Avoid heavy promotion of earbuds because return rate is high.",
      ],
    };
  },
  async generateCampaignProposal(input) {
    return input.season === "secret-santa" ? secretSantaCampaign : fatherDayCampaign;
  },
  async generateStorefrontConfig(campaign) {
    return campaign.season === "secret-santa" ? secretSantaStorefront : fatherDayStorefront;
  },
};

export const cliCodexHarness: CodexHarness = {
  mode: "cli",
  async generateGraphQLQuery(question) {
    return fixtureCodexHarness.generateGraphQLQuery(question);
  },
  async summarizeInsight(question) {
    return fixtureCodexHarness.summarizeInsight(question);
  },
  async generateCampaignProposal(input) {
    return fixtureCodexHarness.generateCampaignProposal(input);
  },
  async generateStorefrontConfig(campaign) {
    return fixtureCodexHarness.generateStorefrontConfig(campaign);
  },
};

export const appServerCodexHarness: CodexHarness = {
  mode: "app-server",
  async generateGraphQLQuery() {
    throw new Error("Codex App Server is not configured yet.");
  },
  async summarizeInsight() {
    throw new Error("Codex App Server is not configured yet.");
  },
  async generateCampaignProposal() {
    throw new Error("Codex App Server is not configured yet.");
  },
  async generateStorefrontConfig() {
    throw new Error("Codex App Server is not configured yet.");
  },
};
