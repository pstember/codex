import type { Campaign } from "@/domain/campaign";
import { campaignSchema } from "@/domain/campaign";
import {
  type GeneratedQuery,
  generatedQuerySchema,
  type InsightSummary,
  insightSummarySchema,
} from "@/domain/insight";
import type { StorefrontConfig } from "@/domain/storefront";
import { storefrontConfigSchema } from "@/domain/storefront";
import { fatherDayCampaign, secretSantaCampaign } from "@/fixtures/campaigns";
import { fatherDayStorefront, secretSantaStorefront } from "@/fixtures/storefront";
import { runCodexAppServerJsonPrompt } from "@/harness/codexAppServerClient";

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

export type CodexAppServerJsonRunner = <T>(input: {
  prompt: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
}) => Promise<T>;

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

export function createAppServerCodexHarness(
  runJsonPrompt: CodexAppServerJsonRunner = runCodexAppServerJsonPrompt,
): CodexHarness {
  return {
    mode: "app-server",
    async generateGraphQLQuery(question) {
      const result = await runJsonPrompt<GeneratedQuery>({
        prompt: [
          "Generate a commerce analytics GraphQL query for Atlas & Co.",
          `Business question: ${question}`,
          "Return JSON only. The query must use the seeded commerce schema and include products fields.",
        ].join("\n"),
        schemaName: "GeneratedQuery",
        jsonSchema: generatedQueryJsonSchema,
      });

      return generatedQuerySchema.parse(result);
    },
    async summarizeInsight(question) {
      const result = await runJsonPrompt<InsightSummary>({
        prompt: [
          "Summarize an Atlas & Co. commerce insight for the Manager workflow.",
          `Business question: ${question}`,
          "Use only product ids from the seeded catalog when recommending products.",
          `Seeded product ids: ${seededProductIds.join(", ")}`,
          "Return JSON only.",
        ].join("\n"),
        schemaName: "InsightSummary",
        jsonSchema: insightSummaryJsonSchema,
      });

      return insightSummarySchema.parse(result);
    },
    async generateCampaignProposal(input) {
      const result = await runJsonPrompt<Campaign>({
        prompt: [
          "Generate an Atlas & Co. campaign proposal for the Store Operator workflow.",
          `Insight title: ${input.insightTitle}`,
          `Required season: ${input.season}`,
          "Use only product ids from the seeded catalog.",
          `Seeded product ids: ${seededProductIds.join(", ")}`,
          "Return JSON only.",
        ].join("\n"),
        schemaName: "Campaign",
        jsonSchema: campaignJsonSchema,
      });

      return campaignSchema.parse(result);
    },
    async generateStorefrontConfig(campaign) {
      const result = await runJsonPrompt<StorefrontConfig>({
        prompt: [
          "Generate a validated storefront config for Atlas & Co.",
          `Campaign JSON: ${JSON.stringify(campaign)}`,
          "Use only approved section types and product ids from the campaign.",
          "visualAsset.path must point at an existing /fixtures/ hero image path.",
          "Return JSON only.",
        ].join("\n"),
        schemaName: "StorefrontConfig",
        jsonSchema: storefrontConfigJsonSchema,
      });

      return storefrontConfigSchema.parse(result);
    },
  };
}

export const appServerCodexHarness: CodexHarness = createAppServerCodexHarness();

export function getCodexHarness(): CodexHarness {
  return process.env.CODEX_HARNESS_MODE === "app-server"
    ? appServerCodexHarness
    : fixtureCodexHarness;
}

const seededProductIds = [
  "portable-charcoal-grill",
  "cast-iron-grill-press",
  "insulated-cooler-tote",
  "leather-travel-wallet",
  "everyday-pocket-knife",
  "pour-over-coffee-set",
  "desk-organizer-tray",
  "noise-canceling-earbuds",
  "espresso-machine",
];

const generatedQueryJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["question", "operationName", "query", "rationale", "recommendedChart"],
  properties: {
    question: { type: "string" },
    operationName: { type: "string" },
    query: { type: "string" },
    rationale: { type: "string" },
    recommendedChart: {
      type: "string",
      enum: ["kpiCards", "line", "bar", "funnel", "productTable"],
    },
  },
};

const insightSummaryJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "recommendedProductIds", "risks"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    recommendedProductIds: {
      type: "array",
      items: { type: "string", enum: seededProductIds },
    },
    risks: { type: "array", items: { type: "string" } },
  },
};

const campaignJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "name",
    "season",
    "summary",
    "audience",
    "productIds",
    "expectedImpact",
    "storefrontAngle",
  ],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    season: { type: "string", enum: ["fathers-day", "secret-santa"] },
    summary: { type: "string" },
    audience: { type: "string" },
    productIds: {
      type: "array",
      minItems: 1,
      items: { type: "string", enum: seededProductIds },
    },
    expectedImpact: { type: "string" },
    storefrontAngle: { type: "string" },
  },
};

const storefrontConfigJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "campaignId", "versionName", "style", "visualAsset", "sections"],
  properties: {
    id: { type: "string" },
    campaignId: { type: "string" },
    versionName: { type: "string" },
    style: {
      type: "object",
      additionalProperties: false,
      required: ["theme", "accentColor", "density"],
      properties: {
        theme: { type: "string", enum: ["heritage", "summer", "holiday"] },
        accentColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
        density: { type: "string", enum: ["compact", "comfortable", "editorial"] },
      },
    },
    visualAsset: {
      type: "object",
      additionalProperties: false,
      required: ["id", "campaignId", "prompt", "alt", "source", "path"],
      properties: {
        id: { type: "string" },
        campaignId: { type: "string" },
        prompt: { type: "string" },
        alt: { type: "string" },
        source: { type: "string", enum: ["fixture", "generated"] },
        path: { type: "string", pattern: "^/fixtures/" },
      },
    },
    sections: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "type", "title", "productIds"],
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: [
              "hero",
              "promoStrip",
              "productRail",
              "bundleCards",
              "trustBlock",
              "faq",
              "countdown",
              "featuredCollection",
            ],
          },
          title: { type: "string" },
          body: { type: "string" },
          productIds: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
};
