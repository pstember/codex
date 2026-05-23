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
import { products as seededProducts } from "@/fixtures/products";
import { runCodexAppServerJsonPrompt } from "@/harness/codexAppServerClient";

export type CodexHarnessMode = "static" | "fixture" | "cli" | "app-server";

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

export const staticCommerceHarness: CodexHarness = {
  mode: "static",
  async generateGraphQLQuery(question) {
    if (
      question.toLowerCase().includes("under £50") ||
      question.toLowerCase().includes("under 50")
    ) {
      return {
        question,
        operationName: "UnderFiftyProductCandidates",
        query: `query UnderFiftyProductCandidates {
  products(filter: { maxPrice: 50 }) {
    id
    name
    category
    price
    marginPercent
    inventory
    conversionRate
    returnRate
  }
}`,
        rationale:
          "Fetch under-£50 products with commercial health metrics so the app can rank the live catalog data.",
        recommendedChart: "productTable",
      };
    }

    if (managerMetricQueries[question]) {
      return { ...managerMetricQueries[question] };
    }

    return { ...fatherDayQuery, question };
  },
  async summarizeInsight(question) {
    const candidates = selectProductsForQuestion(question);
    const leadingNames = candidates
      .slice(0, 3)
      .map((product) => product.name)
      .join(", ");

    return {
      title: `${leadingNames} lead this run on margin, stock, and conversion.`,
      summary: `The current Atlas catalog returns ${candidates.length} products for this question, ranked from raw product metrics rather than a canned answer.`,
      recommendedProductIds: candidates.map((product) => product.id),
      risks: seededProducts
        .filter(
          (product) =>
            !candidates.some((candidate) => candidate.id === product.id) &&
            (product.marginPercent < 40 || product.inventory < 100 || product.returnRate > 0.05),
        )
        .map((product) => `${product.name} is excluded by margin, stock, or return-rate risk.`),
    };
  },
  async generateCampaignProposal(input) {
    const selectedProducts =
      input.season === "secret-santa" ? selectSecretSantaProducts() : selectFatherDayProducts();

    return {
      id: input.season === "secret-santa" ? "secret-santa-2026" : "fathers-day-2026",
      name:
        input.season === "secret-santa"
          ? "Secret Santa Gifts That Work Hard"
          : "Father’s Day Picks From Live Catalog Signals",
      season: input.season,
      summary: `${selectedProducts.length} products selected from current catalog metrics for ${input.insightTitle}.`,
      audience:
        input.season === "secret-santa"
          ? "Gift buyers shopping useful under-£50 products."
          : "Gift buyers shopping practical Father’s Day products.",
      productIds: selectedProducts.map((product) => product.id),
      expectedImpact:
        "Improve campaign quality by ranking live margin, inventory, conversion, and risk data.",
      storefrontAngle:
        input.season === "secret-santa"
          ? "Lead with affordable, giftable products that are healthy in stock."
          : "Lead with practical gifts that have enough stock and commercial strength.",
    };
  },
  async generateStorefrontConfig(campaign) {
    const isSecretSanta = campaign.season === "secret-santa";
    const heroProducts = campaign.productIds.slice(0, 2);

    return {
      id: `${campaign.id}-storefront`,
      campaignId: campaign.id,
      versionName: isSecretSanta ? "Secret Santa" : "Father’s Day",
      style: {
        theme: isSecretSanta ? "holiday" : "summer",
        accentColor: isSecretSanta ? "#be123c" : "#b45309",
        density: isSecretSanta ? "compact" : "editorial",
      },
      visualAsset: {
        id: `${campaign.id}-hero-asset`,
        campaignId: campaign.id,
        prompt: `${campaign.name} hero visual generated from approved product data.`,
        alt: `${campaign.name} hero visual for Atlas & Co.`,
        source: "static",
        path: isSecretSanta
          ? "/static-assets/secret-santa-hero.svg"
          : "/static-assets/fathers-day-hero.svg",
      },
      sections: [
        {
          id: `${campaign.id}-hero`,
          type: "hero",
          title: campaign.storefrontAngle,
          body: campaign.summary,
          productIds: heroProducts,
        },
        {
          id: `${campaign.id}-rail`,
          type: "productRail",
          title: isSecretSanta ? "Live picks under £50" : "Live Father’s Day picks",
          productIds: campaign.productIds,
        },
      ],
    };
  },
};

export const cliCodexHarness: CodexHarness = {
  mode: "cli",
  async generateGraphQLQuery(question) {
    return staticCommerceHarness.generateGraphQLQuery(question);
  },
  async summarizeInsight(question) {
    return staticCommerceHarness.summarizeInsight(question);
  },
  async generateCampaignProposal(input) {
    return staticCommerceHarness.generateCampaignProposal(input);
  },
  async generateStorefrontConfig(campaign) {
    return staticCommerceHarness.generateStorefrontConfig(campaign);
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
          "Return JSON only. The query must use this schema:",
          commerceGraphqlSchemaPrompt,
          "Use only the products query. Do not invent fields.",
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
          "visualAsset.path must point at an existing /static-assets/ hero image path.",
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
  return isCodexAppServerMode() ? appServerCodexHarness : staticCommerceHarness;
}

export function isCodexAppServerMode(): boolean {
  return process.env.CODEX_HARNESS_MODE === "app-server";
}

function selectProductsForQuestion(question: string) {
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes("under £50") || lowerQuestion.includes("under 50")) {
    return rankProducts(
      seededProducts.filter((product) => product.price <= 50 && product.inventory >= 100),
    ).slice(0, 5);
  }

  if (lowerQuestion.includes("avoid") || lowerQuestion.includes("risk")) {
    return seededProducts.filter(
      (product) =>
        product.marginPercent < 40 || product.inventory < 100 || product.returnRate > 0.05,
    );
  }

  if (lowerQuestion.includes("mobile")) {
    return seededProducts
      .filter((product) => product.returnRate > 0.05 || product.conversionRate < 0.075)
      .sort((left, right) => right.views - left.views)
      .slice(0, 3);
  }

  if (lowerQuestion.includes("underexposed")) {
    return rankProducts(seededProducts.filter((product) => product.inventory >= 500)).slice(0, 4);
  }

  return selectFatherDayProducts();
}

function selectFatherDayProducts() {
  return rankProducts(
    seededProducts.filter(
      (product) => product.tags.includes("fathers-day") && product.inventory >= 100,
    ),
  ).slice(0, 6);
}

function selectSecretSantaProducts() {
  return rankProducts(
    seededProducts.filter((product) => product.price <= 50 && product.inventory >= 100),
  ).slice(0, 5);
}

function rankProducts(productList: typeof seededProducts) {
  return [...productList].sort((left, right) => productScore(right) - productScore(left));
}

function productScore(product: (typeof seededProducts)[number]) {
  return (
    product.marginPercent * 0.4 +
    product.inventory * 0.02 +
    product.conversionRate * 100 +
    product.addToCartRate * 50 -
    product.returnRate * 100
  );
}

const seededProductIds = seededProducts.map((product) => product.id);

const commerceGraphqlSchemaPrompt = `type Product {
  id: ID!
  name: String!
  category: String!
  price: Float!
  marginPercent: Float!
  inventory: Int!
  conversionRate: Float!
  returnRate: Float!
}

input ProductFilter {
  tags: [String!]
  maxPrice: Float
}

type Query {
  products(filter: ProductFilter): [Product!]!
}`;

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
        source: { type: "string", enum: ["static", "generated"] },
        path: { type: "string", pattern: "^/static-assets/" },
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
