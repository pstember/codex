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

const managerMetricQueries: Record<string, GeneratedQuery> = {
  "Which products have high inventory but are underexposed on the storefront?": {
    question: "Which products have high inventory but are underexposed on the storefront?",
    operationName: "UnderexposedHighInventoryProducts",
    query: `query UnderexposedHighInventoryProducts {
  products {
    id
    name
    inventory
    conversionRate
    marginPercent
  }
}`,
    rationale:
      "Find high-stock products with enough commercial strength to deserve more storefront exposure.",
    recommendedChart: "productTable",
  },
  "Why did mobile conversion drop last week?": {
    question: "Why did mobile conversion drop last week?",
    operationName: "MobileConversionDropSignals",
    query: `query MobileConversionDropSignals {
  products {
    id
    name
    conversionRate
    returnRate
  }
}`,
    rationale:
      "Compare conversion and return-risk signals to isolate likely mobile drop contributors.",
    recommendedChart: "funnel",
  },
  "What bundle would increase average order value for Father’s Day shoppers?": {
    question: "What bundle would increase average order value for Father’s Day shoppers?",
    operationName: "FatherDayBundleCandidates",
    query: `query FatherDayBundleCandidates {
  products(filter: { tags: ["fathers-day"] }) {
    id
    name
    price
    marginPercent
    inventory
    conversionRate
  }
}`,
    rationale:
      "Pair complementary Father’s Day products with healthy margin, inventory, and conversion.",
    recommendedChart: "productTable",
  },
  "Which products should we avoid promoting because of low margin, low stock, or high returns?": {
    question:
      "Which products should we avoid promoting because of low margin, low stock, or high returns?",
    operationName: "PromotionRiskExclusions",
    query: `query PromotionRiskExclusions {
  products {
    id
    name
    marginPercent
    inventory
    returnRate
  }
}`,
    rationale:
      "Surface products with margin, stock, or return-rate risks before campaign promotion.",
    recommendedChart: "productTable",
  },
};

const managerMetricInsights: Record<string, InsightSummary> = {
  "Which products have high inventory but are underexposed on the storefront?": {
    title: "High-stock underexposed products are ready for more storefront weight.",
    summary:
      "Desk Organizer Tray, Pour-Over Coffee Set, and Cast Iron Grill Press carry deep stock with strong margins.",
    recommendedProductIds: ["desk-organizer-tray", "pour-over-coffee-set", "cast-iron-grill-press"],
    risks: ["Keep earbuds off this list because return rate is elevated."],
  },
  "Why did mobile conversion drop last week?": {
    title: "Mobile conversion pressure is concentrated around high-consideration tech.",
    summary:
      "High-return tech and premium coffee products likely drag mobile conversion because shoppers need more confidence before checkout.",
    recommendedProductIds: ["noise-canceling-earbuds", "espresso-machine"],
    risks: ["Treat this as a diagnostic run before changing campaign placement."],
  },
  "What bundle would increase average order value for Father’s Day shoppers?": {
    title: "A grilling-and-travel bundle can lift Father’s Day order value.",
    summary:
      "Bundle the Portable Charcoal Grill with Cast Iron Grill Press and Insulated Cooler Tote for strong margin and stock coverage.",
    recommendedProductIds: [
      "portable-charcoal-grill",
      "cast-iron-grill-press",
      "insulated-cooler-tote",
    ],
    risks: ["Avoid adding the espresso machine because low stock could create fulfillment risk."],
  },
  "Which products should we avoid promoting because of low margin, low stock, or high returns?": {
    title: "Promotion risk is highest for low stock, weak margin, and high returns.",
    summary:
      "Countertop Espresso Machine and Noise-Canceling Earbuds should stay out of hero slots until risk improves.",
    recommendedProductIds: ["espresso-machine", "noise-canceling-earbuds"],
    risks: [
      "Espresso Machine has low stock and weak margin.",
      "Noise-Canceling Earbuds have a high return rate.",
    ],
  },
};

export const fixtureCodexHarness: CodexHarness = {
  mode: "fixture",
  async generateGraphQLQuery(question) {
    if (managerMetricQueries[question]) {
      return { ...managerMetricQueries[question] };
    }

    if (question.toLowerCase().includes("secret santa")) {
      return { ...secretSantaQuery, question };
    }

    return { ...fatherDayQuery, question };
  },
  async summarizeInsight(question) {
    if (managerMetricInsights[question]) {
      return { ...managerMetricInsights[question] };
    }

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
