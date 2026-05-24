import {
  type GeneratedQuery,
  generatedQuerySchema,
  type InsightSummary,
  insightSummarySchema,
} from "@/domain/insight";
import type { StorefrontConfig } from "@/domain/storefront";
import {
  defaultStorefrontHeroImageComposition,
  maxProductsPerFeatureDrop,
  storefrontConfigSchema,
} from "@/domain/storefront";
import { products as seededProducts } from "@/fixtures/products";
import {
  runCodexAppServerJsonPrompt,
  runCodexAppServerJsonPromptWithTrace,
} from "@/harness/codexAppServerClient";

export type CodexHarnessMode = "static" | "fixture" | "cli" | "app-server";

export interface CodexHarness {
  readonly mode: CodexHarnessMode;
  generateGraphQLQuery(question: string): Promise<GeneratedQuery>;
  summarizeInsight(question: string): Promise<InsightSummary>;
  generateStorefrontAdaptation(input: {
    eventName: string;
    operatorPrompt: string;
    sourceStorefront: StorefrontConfig;
  }): Promise<StorefrontConfig>;
  generateStorefrontAdaptationTrace(input: {
    eventName: string;
    operatorPrompt: string;
    sourceStorefront: StorefrontConfig;
  }): Promise<CodexGenerationTrace<StorefrontConfig>>;
}

export type CodexAppServerJsonRunner = <T>(input: {
  prompt: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
}) => Promise<T>;

export type CodexGenerationTrace<T> = {
  harnessMode: CodexHarnessMode;
  prompt: string;
  requestPayload?: string;
  rawResponse: string;
  schemaName: string;
  value: T;
};

export type CodexAppServerJsonTraceRunner = <T>(input: {
  prompt: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
}) => Promise<CodexGenerationTrace<T>>;

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
  async generateStorefrontAdaptation(input) {
    const eventSlug = slugify(input.eventName);
    const isHalloween = eventSlug.includes("halloween");
    const isValentine = eventSlug.includes("valentine");
    const palette = isHalloween
      ? {
          background: "#12091f",
          surface: "#fff7ed",
          text: "#f8fafc",
          muted: "#fde7c8",
          border: "#f97316",
          accent: "#f97316",
          secondaryAccent: "#a3e635",
          button: "#f97316",
          buttonText: "#12091f",
        }
      : isValentine
        ? {
            background: "#fff1f2",
            surface: "#ffffff",
            text: "#3b0712",
            muted: "#7f1d1d",
            border: "#fb7185",
            accent: "#e11d48",
            secondaryAccent: "#f59e0b",
            button: "#e11d48",
            buttonText: "#ffffff",
          }
        : {
            background: "#eef5ff",
            surface: "#ffffff",
            text: "#0b1020",
            muted: "#42526e",
            border: "#93c5fd",
            accent: "#2563eb",
            secondaryAccent: "#22d3ee",
            button: "#2563eb",
            buttonText: "#ffffff",
          };
    const productIds = selectSecretSantaProducts()
      .slice(0, maxProductsPerFeatureDrop)
      .map((product) => product.id);
    const heroTitle = isHalloween
      ? "Halloween gifts with a useful little shiver."
      : isValentine
        ? "Valentine’s Day gifts with real everyday charm."
        : `${input.eventName} gifts, styled for the moment.`;

    return {
      id: `event-${eventSlug}-storefront`,
      campaignId: `event-${eventSlug}`,
      versionName: input.eventName,
      style: {
        theme: eventSlug,
        accentColor: palette.accent,
        density: "editorial",
        palette,
      },
      visualAsset: {
        id: `event-${eventSlug}-placeholder`,
        campaignId: `event-${eventSlug}`,
        prompt: input.operatorPrompt,
        alt: `${input.eventName} hero visual for Atlas & Co.`,
        source: "static",
        path: "/static-assets/generated-event-hero.svg",
        composition: defaultStorefrontHeroImageComposition,
      },
      sections: [
        {
          id: `event-${eventSlug}-hero`,
          type: "hero",
          sectionIntent: "heroProduct",
          title: heroTitle,
          body: `A timely Atlas & Co. edit with useful gifts, strong stock, and copy adapted for ${input.eventName}.`,
          productIds: productIds.slice(0, 1),
        },
        {
          id: `event-${eventSlug}-offer`,
          type: "productRail",
          sectionIntent: "currentOffer",
          title: "Current offer: event-ready picks",
          body: "Selected from products with practical gift appeal and healthy inventory.",
          productIds,
        },
        {
          id: `event-${eventSlug}-spotlight`,
          type: "featuredCollection",
          sectionIntent: "spotlight",
          title: "Spotlight: useful gift of the moment",
          body: "A lead product is singled out for richer presentation while the offer stays active.",
          productIds: productIds.slice(0, 1),
        },
      ],
    };
  },
  async generateStorefrontAdaptationTrace(input) {
    const value = await this.generateStorefrontAdaptation(input);

    return {
      harnessMode: this.mode,
      prompt: input.operatorPrompt,
      requestPayload: JSON.stringify({
        harnessMode: this.mode,
        prompt: input.operatorPrompt,
        schemaName: "StorefrontConfig",
      }),
      rawResponse: JSON.stringify(value),
      schemaName: "StorefrontConfig",
      value,
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
  async generateStorefrontAdaptation(input) {
    return staticCommerceHarness.generateStorefrontAdaptation(input);
  },
  async generateStorefrontAdaptationTrace(input) {
    const value = await this.generateStorefrontAdaptation(input);

    return {
      harnessMode: this.mode,
      prompt: input.operatorPrompt,
      requestPayload: JSON.stringify({
        harnessMode: this.mode,
        prompt: input.operatorPrompt,
        schemaName: "StorefrontConfig",
      }),
      rawResponse: JSON.stringify(value),
      schemaName: "StorefrontConfig",
      value,
    };
  },
};

export function createAppServerCodexHarness(
  runJsonPrompt: CodexAppServerJsonRunner = runCodexAppServerJsonPrompt,
  runJsonPromptWithTrace: CodexAppServerJsonTraceRunner = async <T>(input: {
    prompt: string;
    schemaName: string;
    jsonSchema: Record<string, unknown>;
  }) => {
    const result = await runCodexAppServerJsonPromptWithTrace<T>(input);

    return {
      harnessMode: "app-server",
      ...result,
      requestPayload: result.requestPayload ?? formatCodexRequestPayload(input),
    };
  },
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
          "Use only the approved Query fields and schema fields. Do not invent fields.",
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
    async generateStorefrontAdaptation(input) {
      const trace = await this.generateStorefrontAdaptationTrace(input);

      return trace.value;
    },
    async generateStorefrontAdaptationTrace(input) {
      const trace = await runJsonPromptWithTrace<StorefrontConfig>({
        prompt: buildStorefrontAdaptationPrompt(input),
        schemaName: "StorefrontConfig",
        jsonSchema: storefrontConfigJsonSchema,
      });

      return {
        ...trace,
        requestPayload:
          trace.requestPayload ||
          formatCodexRequestPayload({
            prompt: buildStorefrontAdaptationPrompt(input),
            schemaName: "StorefrontConfig",
            jsonSchema: storefrontConfigJsonSchema,
          }),
        value: storefrontConfigSchema.parse(trace.value),
      };
    },
  };
}

function formatCodexRequestPayload(input: {
  prompt: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
}): string {
  return JSON.stringify(
    {
      schemaName: input.schemaName,
      prompt: input.prompt,
      outputSchema: input.jsonSchema,
    },
    null,
    2,
  );
}

function buildStorefrontAdaptationPrompt(input: {
  eventName: string;
  operatorPrompt: string;
  sourceStorefront: StorefrontConfig;
}) {
  return [
    "Generate an Atlas & Co. storefront visual adaptation.",
    `Event: ${input.eventName}`,
    `Operator request: ${input.operatorPrompt}`,
    `Source storefront JSON: ${JSON.stringify(input.sourceStorefront)}`,
    "Rewrite visitor-facing copy for the event, choose a complete color palette, and keep product ids valid.",
    "Generate exact sections in order: Hero product, Current offer, Spotlight.",
    "Set sectionIntent values to heroProduct, currentOffer, and spotlight in that order.",
    "Hero product leads with the main promise and one primary product.",
    "Current offer explains the active campaign or promotion.",
    "Spotlight gives one selected product richer emphasis.",
    `No more than ${maxProductsPerFeatureDrop} products per storefront section.`,
    `Allowed product ids: ${seededProductIds.join(", ")}`,
    "visualAsset.path must point at an existing /static-assets/ path; image generation will replace it after validation.",
    "visualAsset.composition must target the storefrontHeroWide slot with a 14 / 9 crop, a protected left copy zone, and a right-weighted product focal point.",
    "Return JSON only.",
  ].join("\n");
}

export const appServerCodexHarness: CodexHarness = createAppServerCodexHarness();

export function getCodexHarness(): CodexHarness {
  return appServerCodexHarness;
}

export function isCodexAppServerMode(): boolean {
  return true;
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

type Customer {
  id: ID!
  email: String!
  name: String!
  segment: String!
  borough: String!
  defaultAddressId: ID!
  lifetimeValue: Float!
  ordersCount: Int!
}

type OrderItem {
  id: ID!
  productId: ID!
  quantity: Int!
  unitPrice: Float!
  lineTotal: Float!
}

type Order {
  id: ID!
  customerId: ID!
  shippingAddressId: ID!
  channel: String!
  status: String!
  currency: String!
  orderedAt: String!
  subtotal: Float!
  discountTotal: Float!
  shippingTotal: Float!
  grandTotal: Float!
  items: [OrderItem!]!
}

type Promotion {
  id: ID!
  title: String!
  segmentIds: [String!]!
  productIds: [ID!]!
  discountPercent: Float!
  startsAt: String!
  endsAt: String!
  active: Boolean!
}

input ProductFilter {
  tags: [String!]
  maxPrice: Float
}

input CustomerFilter {
  segment: String
  borough: String
}

input OrderFilter {
  channel: String
  minTotal: Float
  customerId: ID
}

input PromotionFilter {
  segment: String
  productId: ID
  active: Boolean
}

type Query {
  products(filter: ProductFilter): [Product!]!
  customers(filter: CustomerFilter): [Customer!]!
  orders(filter: OrderFilter): [Order!]!
  promotions(filter: PromotionFilter): [Promotion!]!
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
      required: ["theme", "accentColor", "density", "palette"],
      properties: {
        theme: { type: "string" },
        accentColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
        density: { type: "string", enum: ["compact", "comfortable", "editorial"] },
        palette: {
          type: "object",
          additionalProperties: false,
          required: [
            "background",
            "surface",
            "text",
            "muted",
            "border",
            "accent",
            "secondaryAccent",
            "button",
            "buttonText",
          ],
          properties: {
            background: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            surface: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            text: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            muted: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            border: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            accent: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            secondaryAccent: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            button: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            buttonText: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
          },
        },
      },
    },
    visualAsset: {
      type: "object",
      additionalProperties: false,
      required: ["id", "campaignId", "prompt", "alt", "source", "path", "composition"],
      properties: {
        id: { type: "string" },
        campaignId: { type: "string" },
        prompt: { type: "string" },
        alt: { type: "string" },
        source: { type: "string", enum: ["static", "generated"] },
        path: { type: "string", pattern: "^/(static-assets|generated-assets)/" },
        composition: {
          type: "object",
          additionalProperties: false,
          required: ["slot", "aspectRatio", "focalPoint", "safeArea", "objectPosition"],
          properties: {
            slot: { type: "string", enum: ["storefrontHeroWide"] },
            aspectRatio: { type: "string", enum: ["14 / 9"] },
            focalPoint: {
              type: "string",
              enum: ["center", "right-center", "lower-right"],
            },
            safeArea: {
              type: "string",
              enum: ["copy-left-third", "copy-left-half"],
            },
            objectPosition: { type: "string" },
          },
        },
      },
    },
    sections: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "type", "sectionIntent", "title", "body", "productIds"],
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
          sectionIntent: {
            type: "string",
            enum: ["heroProduct", "currentOffer", "spotlight"],
          },
          title: { type: "string" },
          body: { type: ["string", "null"] },
          productIds: {
            type: "array",
            maxItems: maxProductsPerFeatureDrop,
            items: { type: "string" },
          },
        },
      },
    },
  },
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
