import { type QueryValidationResult, validateCommerceQuery } from "@/domain/commerceGraphql";
import type { GeneratedQuery, InsightSummary } from "@/domain/insight";
import type { MetricsTrace } from "@/domain/metricsTrace";
import type { Product } from "@/domain/product";
import type { CodexHarness } from "@/harness/codexHarness";

export const fatherDayMetricsQuestion =
  "What should we promote for Father’s Day based on margin, inventory, and conversion?";

export const underexposedInventoryQuestion =
  "Which products have high inventory but are underexposed on the storefront?";
export const mobileConversionDropQuestion = "Why did mobile conversion drop last week?";
export const fatherDayBundleQuestion =
  "What bundle would increase average order value for Father’s Day shoppers?";
export const promotionRiskQuestion =
  "Which products should we avoid promoting because of low margin, low stock, or high returns?";

export const approvedMetricsQuestions = [
  fatherDayMetricsQuestion,
  underexposedInventoryQuestion,
  mobileConversionDropQuestion,
  fatherDayBundleQuestion,
  promotionRiskQuestion,
] as const;

export type MetricsCopilotChart = {
  type: GeneratedQuery["recommendedChart"];
  title: string;
  columns: string[];
  rows: Array<{
    label: string;
    productId?: string;
    values: string[];
  }>;
};

export type MetricsCopilotTrace = {
  generatedQuery: GeneratedQuery;
  validation: QueryValidationResult;
};

export type MetricsCopilotAnswer = {
  question: string;
  trace: MetricsCopilotTrace;
  insight: InsightSummary;
  chart: MetricsCopilotChart;
  recommendedProducts: Product[];
};

export interface MetricsTraceStore {
  saveMetricsTrace(trace: MetricsTrace): void;
}

export function isApprovedMetricsQuestion(question: string): boolean {
  return approvedMetricsQuestions.includes(question as (typeof approvedMetricsQuestions)[number]);
}

export async function answerMetricsQuestion(input: {
  question: string;
  harness: CodexHarness;
  products: Product[];
}): Promise<MetricsCopilotAnswer> {
  const generatedQuery = await input.harness.generateGraphQLQuery(input.question);
  const validation = validateCommerceQuery(generatedQuery);
  const insight = await input.harness.summarizeInsight(input.question);
  const productsById = new Map(input.products.map((product) => [product.id, product]));
  const recommendedProducts = insight.recommendedProductIds
    .map((productId) => productsById.get(productId))
    .filter((product): product is Product => Boolean(product));

  return {
    question: input.question,
    trace: {
      generatedQuery,
      validation,
    },
    insight,
    chart: mapChart(generatedQuery.recommendedChart, recommendedProducts),
    recommendedProducts,
  };
}

function mapChart(
  type: GeneratedQuery["recommendedChart"],
  recommendedProducts: Product[],
): MetricsCopilotChart {
  if (type === "funnel") {
    const totalViews = sumBy(recommendedProducts, (product) => product.views);
    const totalAddToCarts = Math.round(
      sumBy(recommendedProducts, (product) => product.views * product.addToCartRate),
    );
    const totalPurchases = sumBy(recommendedProducts, (product) => product.purchaseCount);

    return {
      type,
      title: "Conversion pressure",
      columns: ["Stage", "Count", "Rate"],
      rows: [
        {
          label: "Product views",
          values: [formatInteger(totalViews), "100%"],
        },
        {
          label: "Adds to cart",
          values: [formatInteger(totalAddToCarts), formatRate(totalAddToCarts, totalViews)],
        },
        {
          label: "Purchases",
          values: [formatInteger(totalPurchases), formatRate(totalPurchases, totalViews)],
        },
      ],
    };
  }

  return {
    type,
    title: type === "productTable" ? "Recommended products" : "Metric snapshot",
    columns: ["Product", "Margin", "Stock", "Conversion", "Return risk"],
    rows: recommendedProducts.map((product) => ({
      label: product.name,
      productId: product.id,
      values: [
        formatPercent(product.marginPercent / 100),
        formatInteger(product.inventory),
        formatPercent(product.conversionRate),
        formatPercent(product.returnRate),
      ],
    })),
  };
}

function sumBy(products: Product[], readValue: (product: Product) => number): number {
  return products.reduce((total, product) => total + readValue(product), 0);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function formatRate(numerator: number, denominator: number): string {
  return denominator > 0 ? formatPercent(numerator / denominator) : "0%";
}

export async function answerAndSaveMetricsQuestion(input: {
  id: string;
  question: string;
  harness: CodexHarness;
  products: Product[];
  createdByUserId: string;
  createdAt: Date;
  traceStore: MetricsTraceStore;
}): Promise<MetricsCopilotAnswer> {
  const answer = await answerMetricsQuestion(input);

  input.traceStore.saveMetricsTrace({
    id: input.id,
    question: answer.question,
    operationName: answer.trace.generatedQuery.operationName,
    validationStatus: answer.trace.validation.status,
    validationErrors:
      answer.trace.validation.status === "invalid" ? answer.trace.validation.errors : [],
    generatedGraphql: answer.trace.generatedQuery.query,
    rationale: answer.trace.generatedQuery.rationale,
    chartType: answer.chart.type,
    recommendedProductIds: answer.recommendedProducts.map((product) => product.id),
    createdByUserId: input.createdByUserId,
    createdAt: input.createdAt,
  });

  return answer;
}
