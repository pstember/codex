import { z } from "zod";
import type { CommerceData } from "@/domain/commerce";
import {
  type CommerceQueryData,
  executeCommerceQuery,
  validateCommerceQuery,
} from "@/domain/commerceGraphql";
import {
  calculateMetricEvidence,
  type MetricEvidence,
  metricCatalogPrompt,
} from "@/domain/commerceMetrics";
import type { GeneratedQuery } from "@/domain/insight";
import type { Product } from "@/domain/product";

type CodexJsonRunner = <T>(input: {
  prompt: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
}) => Promise<CodexJsonRunnerResult<T>>;

type CodexJsonRunnerResult<T> =
  | T
  | {
      prompt: string;
      requestPayload: string;
      rawResponse: string;
      schemaName: string;
      value: T;
    };

export type DataQuestionStage =
  | "intent-classified"
  | "query-prompt-prepared"
  | "query-request-sent"
  | "query-response-received"
  | "query-validated"
  | "query-executed"
  | "metrics-calculated"
  | "evidence-prepared"
  | "answer-prompt-prepared"
  | "answer-request-sent"
  | "answer-response-received"
  | "completed"
  | "unsupported"
  | "validation-error";

export type DataQuestionEvent = {
  stage: DataQuestionStage;
  title: string;
  body: string;
  payload?: string;
  payloadKind?:
    | "app-server-request"
    | "app-server-response"
    | "evidence"
    | "graphql"
    | "prompt"
    | "summary";
};

export type DataQuestionResult = {
  status: "answered" | "unsupported" | "validation-error";
  message: string;
  reply: string;
  evidence: string[];
  caveats: string[];
  followUpQuestions: string[];
  generatedGraphql: string;
  evidencePack: string;
  rawQueryPrompt: string;
  rawQueryResponse: string;
  rawQueryRequestPayload: string;
  rawAnswerPrompt: string;
  rawAnswerResponse: string;
  rawAnswerRequestPayload: string;
  rawPrompt: string;
  rawCodexResponse: string;
  validationErrors: string[];
  metricEvidence?: MetricEvidence;
};

const queryPlanSchema = z.object({
  status: z.enum(["query", "unsupported"]),
  question: z.string().min(1),
  operationName: z
    .string()
    .min(1)
    .nullable()
    .transform((value) => value ?? undefined),
  query: z
    .string()
    .min(1)
    .nullable()
    .transform((value) => value ?? undefined),
  rationale: z
    .string()
    .min(1)
    .nullable()
    .transform((value) => value ?? undefined),
  answerPlan: z
    .string()
    .min(1)
    .nullable()
    .transform((value) => value ?? undefined),
  requiredEvidence: z.array(z.string()).default([]),
  requestedMetrics: z.array(z.string()).default([]),
  sortBy: z
    .string()
    .nullable()
    .default(null)
    .transform((value) => value ?? undefined),
  limit: z
    .number()
    .int()
    .positive()
    .nullable()
    .default(null)
    .transform((value) => value ?? undefined),
  recommendedChart: z
    .enum(["kpiCards", "line", "bar", "funnel", "productTable"])
    .nullable()
    .transform((value) => value ?? undefined),
  unsupportedReason: z
    .string()
    .min(1)
    .nullable()
    .transform((value) => value ?? undefined),
});

const finalAnswerSchema = z.object({
  status: z.enum(["answered", "unsupported"]),
  answer: z.string().min(1),
  evidence: z.array(z.string()).default([]),
  caveats: z.array(z.string()).default([]),
  followUpQuestions: z.array(z.string()).max(3).default([]),
});

type QueryPlan = z.infer<typeof queryPlanSchema>;

export async function askDataQuestion(input: {
  message: string;
  products: Product[];
  commerceData: CommerceData;
  runJsonPrompt: CodexJsonRunner;
  onEvent?: (event: DataQuestionEvent) => void;
}): Promise<DataQuestionResult> {
  const message = input.message.trim();

  if (!message) {
    throw new Error("Enter a commerce data question before sending it to Codex.");
  }

  emit(input.onEvent, {
    stage: "intent-classified",
    title: "Intent classification started",
    body: "Codex will decide whether the message is answerable from Atlas commerce data.",
  });

  const rawQueryPrompt = buildQueryPrompt(message);
  emit(input.onEvent, {
    stage: "query-prompt-prepared",
    title: "Query prompt prepared",
    body: "Codex is being asked for one validated GraphQL query.",
    payload: rawQueryPrompt,
    payloadKind: "prompt",
  });

  const queryPlanRun = unwrapCodexJsonRunnerResult(
    await input.runJsonPrompt<unknown>({
      prompt: rawQueryPrompt,
      schemaName: "DataQuestionQueryPlan",
      jsonSchema: queryPlanJsonSchema,
    }),
  );
  const queryPlanResult = queryPlanRun.value;
  const rawQueryResponse = queryPlanRun.rawResponse ?? JSON.stringify(queryPlanResult, null, 2);
  const rawQueryRequestPayload = queryPlanRun.requestPayload ?? "";
  if (rawQueryRequestPayload) {
    emit(input.onEvent, {
      stage: "query-request-sent",
      title: "Query request sent",
      body: "The backend sent this JSON envelope to Codex App Server for query planning.",
      payload: formatAppServerRequestPayload(rawQueryRequestPayload, "DataQuestionQueryPlan"),
      payloadKind: "app-server-request",
    });
  }
  emit(input.onEvent, {
    stage: "query-response-received",
    title: "Query response received",
    body: "Codex returned the query plan JSON.",
    payload: formatAppServerResponsePayload(rawQueryResponse, queryPlanResult),
    payloadKind: rawQueryRequestPayload ? "app-server-response" : "summary",
  });

  const queryPlan = queryPlanSchema.parse(queryPlanResult);

  if (queryPlan.status === "unsupported") {
    const result = unsupportedResult(
      message,
      rawQueryPrompt,
      rawQueryResponse,
      queryPlan.unsupportedReason,
      rawQueryRequestPayload,
    );
    emit(input.onEvent, {
      stage: "unsupported",
      title: "Request outside data scope",
      body: result.evidence[0] ?? result.reply,
    });
    return result;
  }

  const generatedQuery = generatedQueryFromPlan(queryPlan, message);
  const validation = validateCommerceQuery(generatedQuery);
  emit(input.onEvent, {
    stage: validation.status === "valid" ? "query-validated" : "validation-error",
    title: validation.status === "valid" ? "GraphQL validated" : "GraphQL validation failed",
    body:
      validation.status === "valid"
        ? "The generated query passed the fixed commerce schema."
        : validation.errors.join("\n"),
    payload: generatedQuery.query,
    payloadKind: "graphql",
  });

  if (validation.status === "invalid") {
    return {
      ...emptyResult(message),
      status: "validation-error",
      reply:
        "I could not answer because the generated query did not pass validation against the Atlas commerce schema.",
      generatedGraphql: generatedQuery.query,
      rawQueryPrompt,
      rawQueryResponse,
      rawQueryRequestPayload,
      rawPrompt: rawQueryPrompt,
      rawCodexResponse: rawQueryResponse,
      validationErrors: validation.errors,
    };
  }

  const queryResult = await executeCommerceQuery({
    generatedQuery,
    products: input.products,
    commerceData: input.commerceData,
  });
  emit(input.onEvent, {
    stage: "query-executed",
    title: "GraphQL executed",
    body: "The backend executed the validated query against seeded Atlas data.",
    payload: summarizeRawResult(queryResult.data),
    payloadKind: "summary",
  });

  const metricEvidence = shouldCalculateProductMetricEvidence(queryPlan.requestedMetrics)
    ? calculateMetricEvidence({
        commerceData: input.commerceData,
        limit: queryPlan.limit,
        products: queryResult.length > 0 ? [...queryResult] : input.products,
        requestedMetrics: queryPlan.requestedMetrics,
        sortBy: queryPlan.sortBy,
      })
    : undefined;

  if (metricEvidence) {
    emit(input.onEvent, {
      stage: "metrics-calculated",
      title: "Metrics calculated",
      body: "The backend calculated requested commerce metrics before the final Codex answer.",
      payload: metricEvidence.evidencePack,
      payloadKind: "evidence",
    });
  }

  const evidencePack = buildEvidencePack({
    question: message,
    data: queryResult.data,
    metricEvidence,
    products: input.products,
  });
  emit(input.onEvent, {
    stage: "evidence-prepared",
    title: "Evidence prepared",
    body: "Raw query rows were reduced to compact factual evidence.",
    payload: evidencePack,
    payloadKind: "evidence",
  });

  const rawAnswerPrompt = buildAnswerPrompt({
    question: message,
    generatedQuery,
    evidencePack,
  });
  emit(input.onEvent, {
    stage: "answer-prompt-prepared",
    title: "Final-answer prompt prepared",
    body: "Codex will receive only the query, compact evidence, and factuality rules.",
    payload: rawAnswerPrompt,
    payloadKind: "prompt",
  });

  const finalAnswerRun = unwrapCodexJsonRunnerResult(
    await input.runJsonPrompt<unknown>({
      prompt: rawAnswerPrompt,
      schemaName: "DataQuestionFinalAnswer",
      jsonSchema: finalAnswerJsonSchema,
    }),
  );
  const finalAnswerResult = finalAnswerRun.value;
  const rawAnswerResponse =
    finalAnswerRun.rawResponse ?? JSON.stringify(finalAnswerResult, null, 2);
  const rawAnswerRequestPayload = finalAnswerRun.requestPayload ?? "";
  if (rawAnswerRequestPayload) {
    emit(input.onEvent, {
      stage: "answer-request-sent",
      title: "Final-answer request sent",
      body: "The backend sent this JSON envelope to Codex App Server for the final answer.",
      payload: formatAppServerRequestPayload(rawAnswerRequestPayload, "DataQuestionFinalAnswer"),
      payloadKind: "app-server-request",
    });
  }
  emit(input.onEvent, {
    stage: "answer-response-received",
    title: "Final answer received",
    body: "Codex returned the final answer JSON.",
    payload: formatAppServerResponsePayload(rawAnswerResponse, finalAnswerResult),
    payloadKind: rawAnswerRequestPayload ? "app-server-response" : "summary",
  });

  const finalAnswer = finalAnswerSchema.parse(finalAnswerResult);
  const result: DataQuestionResult = {
    status: finalAnswer.status,
    message,
    reply: finalAnswer.answer,
    evidence: finalAnswer.evidence,
    caveats: finalAnswer.caveats,
    followUpQuestions: finalAnswer.followUpQuestions,
    generatedGraphql: generatedQuery.query,
    evidencePack,
    rawQueryPrompt,
    rawQueryResponse,
    rawQueryRequestPayload,
    rawAnswerPrompt,
    rawAnswerResponse,
    rawAnswerRequestPayload,
    rawPrompt: [rawQueryPrompt, rawAnswerPrompt].join("\n\n--- FINAL ANSWER PROMPT ---\n\n"),
    rawCodexResponse: [rawQueryResponse, rawAnswerResponse].join(
      "\n\n--- FINAL ANSWER RESPONSE ---\n\n",
    ),
    validationErrors: [],
    metricEvidence,
  };

  emit(input.onEvent, {
    stage: "completed",
    title: "Answer completed",
    body: finalAnswer.answer,
  });

  return result;
}

function unwrapCodexJsonRunnerResult<T>(result: CodexJsonRunnerResult<T>): {
  requestPayload?: string;
  rawResponse?: string;
  value: T;
} {
  if (
    result &&
    typeof result === "object" &&
    "value" in result &&
    "rawResponse" in result &&
    "requestPayload" in result
  ) {
    const tracedResult = result as {
      requestPayload: string;
      rawResponse: string;
      value: T;
    };

    return {
      requestPayload: tracedResult.requestPayload,
      rawResponse: tracedResult.rawResponse,
      value: tracedResult.value,
    };
  }

  return { value: result as T };
}

function formatAppServerRequestPayload(requestPayload: string, schemaName: string): string {
  return JSON.stringify(
    {
      schemaName,
      sentToCodexAppServer: parseJsonOrText(requestPayload),
    },
    null,
    2,
  );
}

function formatAppServerResponsePayload(rawResponse: string, parsedResponse: unknown): string {
  return JSON.stringify(
    {
      receivedFromCodexAppServer: rawResponse,
      parsedResponse,
    },
    null,
    2,
  );
}

function parseJsonOrText(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function unsupportedResult(
  message: string,
  rawQueryPrompt = "",
  rawQueryResponse = "",
  reason = "The request is outside the Atlas commerce-data question workflow.",
  rawQueryRequestPayload = "",
): DataQuestionResult {
  return {
    ...emptyResult(message),
    status: "unsupported",
    reply:
      "I can help with open questions about Atlas commerce data, but this chat is not a general GPT replacement.",
    evidence: [reason],
    rawQueryPrompt,
    rawQueryResponse,
    rawQueryRequestPayload,
    rawPrompt: rawQueryPrompt,
    rawCodexResponse: rawQueryResponse,
  };
}

function emptyResult(message: string): DataQuestionResult {
  return {
    status: "answered",
    message,
    reply: "",
    evidence: [],
    caveats: [],
    followUpQuestions: [],
    generatedGraphql: "",
    evidencePack: "",
    rawQueryPrompt: "",
    rawQueryResponse: "",
    rawQueryRequestPayload: "",
    rawAnswerPrompt: "",
    rawAnswerResponse: "",
    rawAnswerRequestPayload: "",
    rawPrompt: "",
    rawCodexResponse: "",
    validationErrors: [],
  };
}

function generatedQueryFromPlan(queryPlan: QueryPlan, message: string): GeneratedQuery {
  return {
    question: queryPlan.question || message,
    operationName: queryPlan.operationName ?? "DataQuestion",
    query: queryPlan.query ?? "",
    rationale: queryPlan.rationale ?? "Generated for the Atlas commerce-data question.",
    recommendedChart: queryPlan.recommendedChart ?? "productTable",
  };
}

function shouldCalculateProductMetricEvidence(requestedMetrics: string[]): boolean {
  return requestedMetrics.some((metricId) => metricId.startsWith("product_"));
}

function buildQueryPrompt(message: string): string {
  return [
    "You are the query planner for Atlas & Co. commerce analytics.",
    "Classify the user's message as query or unsupported.",
    "If unsupported, return status unsupported and unsupportedReason.",
    "If query, return exactly one read-only GraphQL query operation.",
    "Choose requestedMetrics only from the Available backend metrics list. Use null sortBy and limit when not needed.",
    "Use only these schema fields. Do not invent fields.",
    compactCommerceSchemaPrompt,
    "Available backend metrics:",
    metricCatalogPrompt(),
    `User question: ${message}`,
    "Return JSON only.",
  ].join("\n");
}

function buildAnswerPrompt(input: {
  question: string;
  generatedQuery: GeneratedQuery;
  evidencePack: string;
}): string {
  return [
    "You are the final answer writer for Atlas & Co. commerce analytics.",
    "Answer only from the supplied evidence pack.",
    "Be concise, factual, and explicit about numbers used.",
    "If evidence is insufficient, say so plainly.",
    "Do not infer external market facts.",
    "Do not mention hidden implementation details.",
    "Do not recommend action unless the evidence supports it.",
    `User question: ${input.question}`,
    `Validated GraphQL query:\n${input.generatedQuery.query}`,
    `Evidence pack:\n${input.evidencePack}`,
    "Return JSON only.",
  ].join("\n");
}

function buildEvidencePack(input: {
  question: string;
  data: CommerceQueryData;
  metricEvidence?: MetricEvidence;
  products: Product[];
}): string {
  const lowerQuestion = input.question.toLowerCase();

  if (input.metricEvidence) {
    return input.metricEvidence.evidencePack;
  }

  if (
    lowerQuestion.includes("return rate") ||
    (lowerQuestion.includes("return") && lowerQuestion.includes("rate"))
  ) {
    return buildReturnRateEvidence(input.data);
  }

  if (lowerQuestion.includes("return") || input.data.returns.length > 0) {
    return buildReturnEvidence(input);
  }

  if (lowerQuestion.includes("conversion") || lowerQuestion.includes("outlier")) {
    return buildConversionEvidence(input.data.products);
  }

  return buildGeneralEvidence(input.data);
}

function buildReturnEvidence(input: {
  question: string;
  data: CommerceQueryData;
  products: Product[];
}): string {
  const queriedProductIds = new Set(
    input.data.products.map((product) => product.id).filter((id): id is string => Boolean(id)),
  );
  const productLookup = new Map(input.products.map((product) => [product.id, product]));
  const relevantReturns =
    queriedProductIds.size > 0
      ? input.data.returns.filter(
          (commerceReturn) =>
            commerceReturn.productId !== undefined &&
            queriedProductIds.has(commerceReturn.productId),
        )
      : input.data.returns;
  const totalReturns = relevantReturns.length;
  const reasonCounts = new Map<string, number>();

  for (const commerceReturn of relevantReturns) {
    reasonCounts.set(
      commerceReturn.reason ?? "unknown",
      (reasonCounts.get(commerceReturn.reason ?? "unknown") ?? 0) + 1,
    );
  }

  const topReasons = [...reasonCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(
      ([reason, count]) =>
        `${reason}: ${count} returns (${formatPercent(count / Math.max(totalReturns, 1))})`,
    );
  const productCounts = new Map<string, number>();

  for (const commerceReturn of relevantReturns) {
    if (commerceReturn.productId) {
      productCounts.set(
        commerceReturn.productId,
        (productCounts.get(commerceReturn.productId) ?? 0) + 1,
      );
    }
  }

  const topProducts = [...productCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([productId, count]) => `${productLookup.get(productId)?.name ?? productId}: ${count}`);

  return [
    "Return reason summary",
    input.question.toLowerCase().includes("£50") ||
    input.question.toLowerCase().includes("below 50")
      ? "filters: price <= £50"
      : "filters: query-defined product scope",
    `matching returns: ${totalReturns}`,
    `top reasons: ${topReasons.join("; ") || "none"}`,
    `top affected products: ${topProducts.join("; ") || "none"}`,
  ].join("\n");
}

function buildReturnRateEvidence(data: CommerceQueryData): string {
  const totalReturns = data.returns.length;
  const orderDenominator = data.orders.length;
  const requestedDates = data.returns
    .map((commerceReturn) => commerceReturn.requestedAt)
    .filter((requestedAt): requestedAt is string => typeof requestedAt === "string")
    .map((requestedAt) => requestedAt.slice(0, 10))
    .sort();
  const firstRequestedDate = requestedDates[0] ?? "not supplied";
  const lastRequestedDate = requestedDates[requestedDates.length - 1] ?? "not supplied";

  return [
    "Return rate summary",
    `requested return window: ${firstRequestedDate} to ${lastRequestedDate}`,
    `matching returns: ${totalReturns}`,
    `orders denominator: ${orderDenominator}`,
    `return rate: ${formatPercent(totalReturns / Math.max(orderDenominator, 1))}`,
    "rate definition: matching requested returns divided by order rows supplied in evidence",
  ].join("\n");
}

function buildConversionEvidence(products: CommerceQueryData["products"]): string {
  const rows = products
    .filter((product) => typeof product.conversionRate === "number")
    .map((product) => ({
      id: product.id ?? "unknown",
      name: product.name ?? product.id ?? "Unknown product",
      conversionRate: product.conversionRate as number,
    }))
    .sort((left, right) => right.conversionRate - left.conversionRate);
  const rates = rows.map((row) => row.conversionRate);
  const mean = rates.length ? rates.reduce((total, rate) => total + rate, 0) / rates.length : 0;
  const median = medianOf(rates);
  const standardDeviation = standardDeviationOf(rates, mean);
  const outliers = rows
    .map((row) => ({
      ...row,
      zScore: standardDeviation > 0 ? (row.conversionRate - mean) / standardDeviation : 0,
    }))
    .sort((left, right) => Math.abs(right.zScore) - Math.abs(left.zScore))
    .slice(0, 5);

  return [
    "Conversion outlier summary",
    `products analysed: ${rows.length}`,
    `mean: ${formatPercent(mean)}`,
    `median: ${formatPercent(median)}`,
    `standard deviation: ${formatPercent(standardDeviation)}`,
    `top deviations: ${outliers
      .map(
        (row) =>
          `${row.name}: ${formatPercent(row.conversionRate)} (${row.zScore.toFixed(2)} z-score)`,
      )
      .join("; ")}`,
  ].join("\n");
}

function buildGeneralEvidence(data: CommerceQueryData): string {
  return [
    "General query summary",
    `products: ${data.products.length}`,
    `customers: ${data.customers.length}`,
    `orders: ${data.orders.length}`,
    `promotions: ${data.promotions.length}`,
    `returns: ${data.returns.length}`,
    `email events: ${data.emailEvents.length}`,
    `stock positions: ${data.stockPositions.length}`,
  ].join("\n");
}

function summarizeRawResult(data: CommerceQueryData): string {
  return JSON.stringify(
    {
      products: data.products.length,
      customers: data.customers.length,
      orders: data.orders.length,
      promotions: data.promotions.length,
      returns: data.returns.length,
      emailEvents: data.emailEvents.length,
      stockPositions: data.stockPositions.length,
    },
    null,
    2,
  );
}

function medianOf(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sortedValues.length / 2);

  return sortedValues.length % 2 === 0
    ? (sortedValues[midpoint - 1] + sortedValues[midpoint]) / 2
    : sortedValues[midpoint];
}

function standardDeviationOf(values: number[], mean: number): number {
  if (values.length === 0) {
    return 0;
  }

  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function emit(onEvent: ((event: DataQuestionEvent) => void) | undefined, event: DataQuestionEvent) {
  onEvent?.(event);
}

const compactCommerceSchemaPrompt = `type Product { id name category price marginPercent inventory conversionRate returnRate views addToCartRate purchaseCount tags }
type Customer { id email name segment borough lifetimeValue ordersCount }
type OrderItem { id productId quantity unitPrice lineTotal }
type Order { id customerId channel status orderedAt subtotal discountTotal shippingTotal grandTotal items }
type Promotion { id title segmentIds productIds discountPercent startsAt endsAt active }
type Return { id orderId productId reason status requestedAt refundAmount }
type EmailEvent { id customerId campaignId eventType occurredAt }
type StockPosition { productId locationId onHand reserved reorderPoint }
input ProductFilter { tags maxPrice }
input CustomerFilter { segment borough }
input OrderFilter { channel minTotal customerId orderedFrom orderedTo }
input PromotionFilter { segment productId active }
input ReturnFilter { productId reason status requestedFrom requestedTo }
input EmailEventFilter { customerId campaignId eventType }
input StockPositionFilter { productId locationId }
type Query { products(filter: ProductFilter) customers(filter: CustomerFilter) orders(filter: OrderFilter) promotions(filter: PromotionFilter) returns(filter: ReturnFilter) emailEvents(filter: EmailEventFilter) stockPositions(filter: StockPositionFilter) }`;

const queryPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "question",
    "operationName",
    "query",
    "rationale",
    "answerPlan",
    "requiredEvidence",
    "requestedMetrics",
    "sortBy",
    "limit",
    "recommendedChart",
    "unsupportedReason",
  ],
  properties: {
    status: { type: "string", enum: ["query", "unsupported"] },
    question: { type: "string", minLength: 1 },
    operationName: { type: ["string", "null"] },
    query: { type: ["string", "null"] },
    rationale: { type: ["string", "null"] },
    answerPlan: { type: ["string", "null"] },
    requiredEvidence: { type: "array", items: { type: "string" } },
    requestedMetrics: { type: "array", items: { type: "string" } },
    sortBy: { type: ["string", "null"] },
    limit: { type: ["number", "null"] },
    recommendedChart: {
      type: ["string", "null"],
      enum: ["kpiCards", "line", "bar", "funnel", "productTable", null],
    },
    unsupportedReason: { type: ["string", "null"] },
  },
};

const finalAnswerJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "answer", "evidence", "caveats", "followUpQuestions"],
  properties: {
    status: { type: "string", enum: ["answered", "unsupported"] },
    answer: { type: "string", minLength: 1 },
    evidence: { type: "array", items: { type: "string" } },
    caveats: { type: "array", items: { type: "string" } },
    followUpQuestions: {
      type: "array",
      maxItems: 3,
      items: { type: "string" },
    },
  },
};
