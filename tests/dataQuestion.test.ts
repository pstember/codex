import { describe, expect, it } from "vitest";
import { askDataQuestion } from "@/domain/dataQuestion";
import { commerceData } from "@/fixtures/commerce";
import { products } from "@/fixtures/products";

describe("data question harness", () => {
  it("rejects blank messages before calling Codex", async () => {
    let codexWasCalled = false;

    await expect(
      askDataQuestion({
        message: "   ",
        products,
        commerceData,
        runJsonPrompt: async <T>() => {
          codexWasCalled = true;
          return {} as T;
        },
      }),
    ).rejects.toThrow("Enter a commerce data question before sending it to Codex.");
    expect(codexWasCalled).toBe(false);
  });

  it("asks Codex to classify unsupported general chat before refusing it", async () => {
    const schemas: string[] = [];

    const result = await askDataQuestion({
      message: "Write me a poem about my store",
      products,
      commerceData,
      runJsonPrompt: async <T>(input: CodexRunnerInput) => {
        schemas.push(input.schemaName);

        return {
          status: "unsupported",
          question: "Write me a poem about my store",
          operationName: null,
          query: null,
          rationale: null,
          answerPlan: null,
          requiredEvidence: [],
          requestedMetrics: [],
          sortBy: null,
          limit: null,
          recommendedChart: null,
          unsupportedReason: "The message asks for creative writing instead of Atlas data.",
        } as T;
      },
    });

    expect(schemas).toEqual(["DataQuestionQueryPlan"]);
    expect(result.status).toBe("unsupported");
    expect(result.reply).toBe(
      "I can help with open questions about Atlas commerce data, but this chat is not a general GPT replacement.",
    );
    expect(result.rawQueryPrompt).toContain("Classify the user's message as query or unsupported.");
    expect(result.rawQueryResponse).toContain("unsupported");
    expect(result.rawAnswerPrompt).toBe("");
  });

  it("returns a scoped refusal when Codex classifies a data-looking prompt as unsupported", async () => {
    const result = await askDataQuestion({
      message: "Can you inspect product strategy without using Atlas data?",
      products,
      commerceData,
      runJsonPrompt: async <T>() =>
        ({
          status: "unsupported",
          question: "Can you inspect product strategy without using Atlas data?",
          operationName: null,
          query: null,
          rationale: null,
          answerPlan: null,
          requiredEvidence: [],
          recommendedChart: null,
          unsupportedReason: "The question asks for strategy outside the supplied data.",
        }) as T,
    });

    expect(result.status).toBe("unsupported");
    expect(result.evidence).toEqual(["The question asks for strategy outside the supplied data."]);
    expect(result.rawQueryResponse).toContain("unsupported");
  });

  it("uses an App Server compatible required schema for campaign promotion questions", async () => {
    let queryJsonSchema: Record<string, unknown> | undefined;

    await askDataQuestion({
      message: "Which item should I promote in my next campaign?",
      products,
      commerceData,
      runJsonPrompt: async <T>(input: CodexRunnerInput) => {
        if (input.schemaName === "DataQuestionQueryPlan") {
          queryJsonSchema = input.jsonSchema;

          return {
            status: "query",
            question: "Which item should I promote in my next campaign?",
            operationName: "CampaignPromotionCandidates",
            query: `query CampaignPromotionCandidates {
  products {
    id
    name
    marginPercent
    inventory
    conversionRate
    returnRate
  }
}`,
            rationale: "Fetch commercial product signals for campaign selection.",
            answerPlan: "Rank products by margin, inventory, conversion, and return risk.",
            requiredEvidence: ["marginPercent", "inventory", "conversionRate", "returnRate"],
            requestedMetrics: ["product_promotion_score", "product_inventory"],
            sortBy: "product_promotion_score",
            limit: 5,
            recommendedChart: "productTable",
            unsupportedReason: null,
          } as T;
        }

        return {
          status: "answered",
          answer: "Portable Charcoal Grill has the strongest campaign signals.",
          evidence: ["Portable Charcoal Grill: 54% margin, 420 inventory, 8.7% conversion"],
          caveats: [],
          followUpQuestions: [],
        } as T;
      },
    });

    const properties = queryJsonSchema?.properties as Record<string, unknown>;

    expect(queryJsonSchema?.required).toEqual(Object.keys(properties));
    expect(properties.operationName).toEqual({ type: ["string", "null"] });
    expect(properties.unsupportedReason).toEqual({ type: ["string", "null"] });
    expect(properties.requestedMetrics).toEqual({ type: "array", items: { type: "string" } });
  });

  it("calculates requested promotion metrics before Codex writes the final answer", async () => {
    const events: string[] = [];
    const prompts: string[] = [];

    const result = await askDataQuestion({
      message: "Which item should I promote in my next campaign?",
      products,
      commerceData,
      onEvent: (event) => events.push(event.stage),
      runJsonPrompt: async <T>(input: CodexRunnerInput) => {
        prompts.push(input.prompt);

        if (input.schemaName === "DataQuestionQueryPlan") {
          return {
            status: "query",
            question: "Which item should I promote in my next campaign?",
            operationName: "CampaignPromotionCandidates",
            query: `query CampaignPromotionCandidates {
  products {
    id
    name
    marginPercent
    inventory
    conversionRate
    returnRate
    views
    addToCartRate
    purchaseCount
    tags
  }
}`,
            rationale: "Fetch product signals for backend campaign ranking.",
            answerPlan: "Use backend promotion metrics to rank products.",
            requiredEvidence: ["promotion score", "margin", "inventory", "conversion", "return"],
            requestedMetrics: ["product_promotion_score", "product_risk_score"],
            sortBy: "product_promotion_score",
            limit: 5,
            recommendedChart: "productTable",
            unsupportedReason: null,
          } as T;
        }

        expect(input.prompt).toContain("Promotion candidate summary");
        expect(input.prompt).toContain("Cast Iron Grill Press");
        expect(input.prompt).toContain("score:");
        expect(input.prompt).not.toContain("General query summary\nproducts: 10");
        return {
          status: "answered",
          answer: "Promote Cast Iron Grill Press based on the backend promotion score.",
          evidence: ["Cast Iron Grill Press has the strongest promotion score."],
          caveats: [],
          followUpQuestions: [],
        } as T;
      },
    });

    expect(result.metricEvidence?.status).toBe("sufficient");
    expect(result.metricEvidence?.requestedMetrics).toEqual([
      "product_promotion_score",
      "product_risk_score",
    ]);
    expect(result.metricEvidence?.rows[0].name).toBe("Cast Iron Grill Press");
    expect(result.metricEvidence?.truncated).toBe(true);
    expect(result.reply).not.toContain("Insufficient evidence");
    expect(events).toContain("metrics-calculated");
    expect(prompts[0]).toContain("Available backend metrics");
  });

  it("generates constrained GraphQL, executes it, and sends compact evidence for the final answer", async () => {
    const prompts: string[] = [];
    const events: string[] = [];

    const result = await askDataQuestion({
      message: "Which is my biggest return reason on items below £50?",
      products,
      commerceData,
      onEvent: (event) => events.push(event.stage),
      runJsonPrompt: async <T>(input: CodexRunnerInput) => {
        prompts.push(input.prompt);

        if (input.schemaName === "DataQuestionQueryPlan") {
          return {
            status: "query",
            question: "Which is my biggest return reason on items below £50?",
            operationName: "ReturnReasonsUnderFifty",
            query: `query ReturnReasonsUnderFifty {
  products(filter: { maxPrice: 50 }) {
    id
    name
    price
  }
  returns {
    id
    productId
    reason
    status
  }
}`,
            rationale: "Fetch affordable products and returns so the backend can group reasons.",
            answerPlan: "Group returned rows by reason for products priced below £50.",
            requiredEvidence: ["reason", "count", "share"],
            recommendedChart: "bar",
            unsupportedReason: null,
          } as T;
        }

        expect(input.schemaName).toBe("DataQuestionFinalAnswer");
        return {
          status: "answered",
          answer: "Changed mind is the biggest return reason under £50.",
          evidence: ["changed-mind: 2 returns, 50% of matching returns"],
          caveats: [],
          followUpQuestions: ["Which under £50 products have the highest return rate?"],
        } as T;
      },
    });

    expect(result.status).toBe("answered");
    expect(result.reply).toBe("Changed mind is the biggest return reason under £50.");
    expect(result.generatedGraphql).toContain("returns");
    expect(result.evidencePack).toContain("Return reason summary");
    expect(result.evidencePack).toContain("changed-mind");
    expect(result.evidencePack).toContain("filters: price <= £50");
    expect(prompts[0]).toContain("returns(filter: ReturnFilter)");
    expect(prompts[0]).not.toContain("Countertop Espresso Machine");
    expect(prompts[1]).toContain("Return reason summary");
    expect(prompts[1]).toContain("changed-mind");
    expect(prompts[1]).not.toContain("ord-0001");
    expect(events).toEqual([
      "intent-classified",
      "query-prompt-prepared",
      "query-response-received",
      "query-validated",
      "query-executed",
      "evidence-prepared",
      "answer-prompt-prepared",
      "answer-response-received",
      "completed",
    ]);
  });

  it("emits separate raw App Server request and response JSON for Insight observability", async () => {
    const events: Array<{ payload: string; payloadKind: string | undefined; stage: string }> = [];

    await askDataQuestion({
      message: "Which is my biggest return reason on items below £50?",
      products,
      commerceData,
      onEvent: (event) => {
        if (
          event.stage === "query-request-sent" ||
          event.stage === "query-response-received" ||
          event.stage === "answer-request-sent" ||
          event.stage === "answer-response-received"
        ) {
          events.push({
            payload: event.payload ?? "",
            payloadKind: event.payloadKind,
            stage: event.stage,
          });
        }
      },
      runJsonPrompt: async <T>(input: CodexRunnerInput) => {
        if (input.schemaName === "DataQuestionQueryPlan") {
          const value = {
            status: "query",
            question: "Which is my biggest return reason on items below £50?",
            operationName: "ReturnReasonsUnderFifty",
            query: `query ReturnReasonsUnderFifty {
  products(filter: { maxPrice: 50 }) {
    id
    name
    price
  }
  returns {
    id
    productId
    reason
    status
  }
}`,
            rationale: "Fetch affordable products and returns.",
            answerPlan: "Group returned rows by reason.",
            requiredEvidence: ["reason", "count", "share"],
            requestedMetrics: [],
            sortBy: null,
            limit: null,
            recommendedChart: "bar",
            unsupportedReason: null,
          };

          return {
            prompt: input.prompt,
            requestPayload: JSON.stringify({
              turnStart: {
                input: [{ type: "text", text: input.prompt }],
                outputSchema: input.jsonSchema,
              },
            }),
            rawResponse: JSON.stringify(value),
            schemaName: input.schemaName,
            value,
          } as T;
        }

        const value = {
          status: "answered",
          answer: "Changed mind is the biggest return reason under £50.",
          evidence: ["changed-mind: 2 returns, 50% of matching returns"],
          caveats: [],
          followUpQuestions: [],
        };

        return {
          prompt: input.prompt,
          requestPayload: JSON.stringify({
            turnStart: {
              input: [{ type: "text", text: input.prompt }],
              outputSchema: input.jsonSchema,
            },
          }),
          rawResponse: JSON.stringify(value),
          schemaName: input.schemaName,
          value,
        } as T;
      },
    });

    expect(events.map((event) => event.stage)).toEqual([
      "query-request-sent",
      "query-response-received",
      "answer-request-sent",
      "answer-response-received",
    ]);
    expect(events.map((event) => event.payloadKind)).toEqual([
      "app-server-request",
      "app-server-response",
      "app-server-request",
      "app-server-response",
    ]);
    expect(events[0].payload).toContain('"outputSchema"');
    expect(events[0].payload).toContain("Which is my biggest return reason");
    expect(events[1].payload).toContain('"receivedFromCodexAppServer"');
    expect(events[1].payload).toContain('"ReturnReasonsUnderFifty"');
    expect(events[2].payload).toContain('"DataQuestionFinalAnswer"');
    expect(events[3].payload).toContain('"Changed mind is the biggest return reason under £50."');
  });

  it("answers return-rate questions over requested return date ranges", async () => {
    const prompts: string[] = [];

    const result = await askDataQuestion({
      message: "What was my return rate from june 1 to june 3?",
      products,
      commerceData,
      runJsonPrompt: async <T>(input: CodexRunnerInput) => {
        prompts.push(input.prompt);

        if (input.schemaName === "DataQuestionQueryPlan") {
          return {
            status: "query",
            question: "What was my return rate from june 1 to june 3?",
            operationName: "ReturnRateByRequestedDate",
            query: `query ReturnRateByRequestedDate {
  returns(filter: { requestedFrom: "2026-06-01", requestedTo: "2026-06-03" }) {
    id
    requestedAt
    productId
  }
  orders {
    id
  }
}`,
            rationale: "Fetch returns requested in the date range and the order denominator.",
            answerPlan: "Calculate matching returns divided by orders.",
            requiredEvidence: ["matching returns", "orders denominator", "return rate"],
            requestedMetrics: ["return_count"],
            sortBy: null,
            limit: null,
            recommendedChart: "kpiCards",
            unsupportedReason: null,
          } as T;
        }

        expect(input.prompt).toContain("Return rate summary");
        expect(input.prompt).toContain("requested return window: 2026-06-01 to 2026-06-03");
        expect(input.prompt).toContain("matching returns: 6");
        expect(input.prompt).toContain("orders denominator: 260");
        expect(input.prompt).toContain("return rate: 2.3%");
        return {
          status: "answered",
          answer: "Return rate was 2.3% from June 1 to June 3.",
          evidence: ["6 requested returns divided by 260 seeded orders."],
          caveats: ["The date range is applied to return request dates."],
          followUpQuestions: [],
        } as T;
      },
    });

    expect(result.status).toBe("answered");
    expect(result.evidencePack).toContain("Return rate summary");
    expect(result.evidencePack).toContain("return rate: 2.3%");
    expect(prompts[0]).toContain(
      "input ReturnFilter { productId reason status requestedFrom requestedTo }",
    );
  });

  it("computes deterministic conversion outlier evidence before the final answer", async () => {
    const prompts: string[] = [];

    await askDataQuestion({
      message: "Is there any outlier in my conversion rate?",
      products,
      commerceData,
      runJsonPrompt: async <T>(input: CodexRunnerInput) => {
        prompts.push(input.prompt);

        if (input.schemaName === "DataQuestionQueryPlan") {
          return {
            status: "query",
            question: "Is there any outlier in my conversion rate?",
            operationName: "ConversionRateOutliers",
            query: `query ConversionRateOutliers {
  products {
    id
    name
    conversionRate
  }
}`,
            rationale: "Fetch product conversion rates for deterministic outlier detection.",
            answerPlan: "Compute mean, median, and high/low conversion outliers.",
            requiredEvidence: ["conversionRate", "mean", "median"],
            recommendedChart: "productTable",
            unsupportedReason: null,
          } as T;
        }

        return {
          status: "answered",
          answer: "The strongest conversion-rate outlier is Cast Iron Grill Press.",
          evidence: ["Cast Iron Grill Press: 10.4% conversion"],
          caveats: [],
          followUpQuestions: [],
        } as T;
      },
    });

    expect(prompts[1]).toContain("Conversion outlier summary");
    expect(prompts[1]).toContain("mean:");
    expect(prompts[1]).toContain("median:");
    expect(prompts[1]).toContain("Cast Iron Grill Press");
  });

  it("uses a general compact evidence pack for supported non-product-count questions", async () => {
    const prompts: string[] = [];

    const result = await askDataQuestion({
      message: "How many customers are in the coffee regulars segment?",
      products,
      commerceData,
      runJsonPrompt: async <T>(input: CodexRunnerInput) => {
        prompts.push(input.prompt);

        if (input.schemaName === "DataQuestionQueryPlan") {
          return {
            status: "query",
            question: "How many customers are in the coffee regulars segment?",
            operationName: "CoffeeRegularCustomers",
            query: `query CoffeeRegularCustomers {
  customers(filter: { segment: "coffee-regulars" }) {
    id
    segment
    borough
  }
}`,
            rationale: "Count customers in the selected segment.",
            answerPlan: "Summarize customer count.",
            requiredEvidence: ["customers"],
            recommendedChart: "kpiCards",
            unsupportedReason: null,
          } as T;
        }

        expect(input.prompt).toContain("General query summary");
        return {
          status: "unsupported",
          answer: "The evidence is not enough to answer beyond the row counts.",
          evidence: ["customers: 4"],
          caveats: ["Only compact row counts were supplied."],
          followUpQuestions: ["Which borough has the most coffee regulars?"],
        } as T;
      },
    });

    expect(result.status).toBe("unsupported");
    expect(result.evidencePack).toContain("General query summary");
    expect(result.evidencePack).toContain("customers: 12");
    expect(result.followUpQuestions).toEqual(["Which borough has the most coffee regulars?"]);
    expect(prompts[1]).not.toContain("amara.hughes@atlas-demo.test");
  });

  it("still produces conversion evidence when a query returns no product rows", async () => {
    const result = await askDataQuestion({
      message: "Is there any conversion outlier?",
      products: [],
      commerceData,
      runJsonPrompt: async <T>(input: CodexRunnerInput) => {
        if (input.schemaName === "DataQuestionQueryPlan") {
          return {
            status: "query",
            question: "Is there any conversion outlier?",
            operationName: "EmptyConversionOutliers",
            query: `query EmptyConversionOutliers {
  products {
    id
    name
    conversionRate
  }
}`,
            rationale: "Fetch conversion rates.",
            answerPlan: "Compute conversion outliers.",
            requiredEvidence: ["conversionRate"],
            recommendedChart: "productTable",
            unsupportedReason: null,
          } as T;
        }

        expect(input.prompt).toContain("products analysed: 0");
        expect(input.prompt).toContain("standard deviation: 0%");
        return {
          status: "answered",
          answer: "There are no product rows in the evidence.",
          evidence: ["products analysed: 0"],
          caveats: ["No product rows were returned."],
          followUpQuestions: [],
        } as T;
      },
    });

    expect(result.status).toBe("answered");
    expect(result.evidencePack).toContain("products analysed: 0");
  });

  it("uses query-defined return scope and product id fallback when no product catalog is supplied", async () => {
    const result = await askDataQuestion({
      message: "What is the biggest return reason?",
      products: [],
      commerceData,
      runJsonPrompt: async <T>(input: CodexRunnerInput) => {
        if (input.schemaName === "DataQuestionQueryPlan") {
          return {
            status: "query",
            question: "What is the biggest return reason?",
            operationName: "AllReturnReasons",
            query: `query AllReturnReasons {
  returns {
    id
    productId
    reason
  }
}`,
            rationale: "Fetch all return reasons.",
            answerPlan: "Group all returns by reason.",
            requiredEvidence: ["reason", "count"],
            recommendedChart: "bar",
            unsupportedReason: null,
          } as T;
        }

        return {
          status: "answered",
          answer: "Return reasons were grouped from all return rows.",
          evidence: ["matching returns: 10"],
          caveats: [],
          followUpQuestions: [],
        } as T;
      },
    });

    expect(result.evidencePack).toContain("filters: query-defined product scope");
    expect(result.evidencePack).toContain("pour-over-coffee-set");
  });

  it("states when return evidence has no matching rows", async () => {
    const result = await askDataQuestion({
      message: "What return reasons exist for a missing product?",
      products,
      commerceData,
      runJsonPrompt: async <T>(input: CodexRunnerInput) => {
        if (input.schemaName === "DataQuestionQueryPlan") {
          return {
            status: "query",
            question: "What return reasons exist for a missing product?",
            operationName: "MissingProductReturns",
            query: `query MissingProductReturns {
  returns(filter: { productId: "missing-product" }) {
    id
    productId
    reason
  }
}`,
            rationale: "Fetch returns for the requested product.",
            answerPlan: "Summarize matching return reasons.",
            requiredEvidence: ["reason", "count"],
            recommendedChart: "bar",
            unsupportedReason: null,
          } as T;
        }

        return {
          status: "answered",
          answer: "No matching returns were found.",
          evidence: ["matching returns: 0"],
          caveats: [],
          followUpQuestions: [],
        } as T;
      },
    });

    expect(result.evidencePack).toContain("matching returns: 0");
    expect(result.evidencePack).toContain("top reasons: none");
    expect(result.evidencePack).toContain("top affected products: none");
  });

  it("computes single-product conversion evidence without marking a deviation", async () => {
    const result = await askDataQuestion({
      message: "Is there any conversion outlier for this product?",
      products: products.slice(0, 1),
      commerceData,
      runJsonPrompt: async <T>(input: CodexRunnerInput) => {
        if (input.schemaName === "DataQuestionQueryPlan") {
          return {
            status: "query",
            question: "Is there any conversion outlier for this product?",
            operationName: "SingleProductConversion",
            query: `query SingleProductConversion {
  products {
    id
    name
    conversionRate
  }
}`,
            rationale: "Fetch one product conversion rate.",
            answerPlan: "Compute conversion outliers.",
            requiredEvidence: ["conversionRate"],
            recommendedChart: "productTable",
            unsupportedReason: null,
          } as T;
        }

        return {
          status: "answered",
          answer: "One product does not provide enough distribution to identify an outlier.",
          evidence: ["Portable Charcoal Grill: 8.7% conversion"],
          caveats: ["Only one product was analysed."],
          followUpQuestions: [],
        } as T;
      },
    });

    expect(result.evidencePack).toContain("products analysed: 1");
    expect(result.evidencePack).toContain("0.00 z-score");
  });

  it("surfaces generated GraphQL validation failures without asking for a final answer", async () => {
    const schemas: string[] = [];

    const result = await askDataQuestion({
      message: "Show my conversion outliers",
      products,
      commerceData,
      runJsonPrompt: async <T>(input: CodexRunnerInput) => {
        schemas.push(input.schemaName);

        return {
          status: "query",
          question: "Show my conversion outliers",
          operationName: "BrokenConversionQuery",
          query: "query BrokenConversionQuery { products { id missingField } }",
          rationale: "Broken on purpose.",
          answerPlan: "Fetch product conversion rates.",
          requiredEvidence: ["conversionRate"],
          recommendedChart: "productTable",
          unsupportedReason: null,
        } as T;
      },
    });

    expect(result.status).toBe("validation-error");
    expect(result.reply).toContain("generated query did not pass validation");
    expect(result.validationErrors.join(" ")).toContain("missingField");
    expect(schemas).toEqual(["DataQuestionQueryPlan"]);
  });
});

type CodexRunnerInput = {
  prompt: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
};
