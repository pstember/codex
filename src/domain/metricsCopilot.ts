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

  return {
    question: input.question,
    trace: {
      generatedQuery,
      validation,
    },
    insight,
    chart: {
      type: generatedQuery.recommendedChart,
    },
    recommendedProducts: insight.recommendedProductIds
      .map((productId) => productsById.get(productId))
      .filter((product): product is Product => Boolean(product)),
  };
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
