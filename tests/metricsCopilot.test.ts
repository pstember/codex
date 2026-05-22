import { describe, expect, it } from "vitest";
import {
  answerAndSaveMetricsQuestion,
  answerMetricsQuestion,
  approvedMetricsQuestions,
  compareMetricsRuns,
  isApprovedMetricsQuestion,
} from "@/domain/metricsCopilot";
import { products } from "@/fixtures/products";
import { fixtureCodexHarness } from "@/harness/codexHarness";

describe("metrics copilot", () => {
  it("approves the Manager golden metric questions", () => {
    expect(approvedMetricsQuestions).toEqual([
      "What should we promote for Father’s Day based on margin, inventory, and conversion?",
      "Which products have high inventory but are underexposed on the storefront?",
      "Why did mobile conversion drop last week?",
      "What bundle would increase average order value for Father’s Day shoppers?",
      "Which products should we avoid promoting because of low margin, low stock, or high returns?",
    ]);
    expect(isApprovedMetricsQuestion(approvedMetricsQuestions[0])).toBe(true);
    expect(isApprovedMetricsQuestion("Invent a live SQL query")).toBe(false);
  });

  it("answers the Father’s Day golden question with a validated GraphQL trace and product recommendations", async () => {
    const result = await answerMetricsQuestion({
      question:
        "What should we promote for Father’s Day based on margin, inventory, and conversion?",
      harness: fixtureCodexHarness,
      products,
    });

    expect(result.trace.validation.status).toBe("valid");
    expect(result.trace.generatedQuery.operationName).toBe("FatherDayPromotionCandidates");
    expect(result.chart.type).toBe("productTable");
    expect(result.recommendedProducts.map((product) => product.id)).toEqual([
      "portable-charcoal-grill",
      "cast-iron-grill-press",
      "leather-weekender-bag",
      "travel-grooming-kit",
      "wireless-charging-valet",
      "insulated-cooler-tote",
    ]);
    expect(result.insight.risks.join(" ")).toContain("espresso machine");
  });

  it("maps answer data into chart-ready rows for the recommended visualization", async () => {
    const productTableResult = await answerMetricsQuestion({
      question:
        "What should we promote for Father’s Day based on margin, inventory, and conversion?",
      harness: fixtureCodexHarness,
      products,
    });

    expect(productTableResult.chart).toMatchObject({
      type: "productTable",
      title: "Recommended products",
      columns: ["Product", "Margin", "Stock", "Conversion", "Return risk"],
    });
    expect(productTableResult.chart.rows[0]).toEqual({
      label: "Portable Charcoal Grill",
      productId: "portable-charcoal-grill",
      values: ["54%", "420", "8.7%", "1.8%"],
    });

    const funnelResult = await answerMetricsQuestion({
      question: "Why did mobile conversion drop last week?",
      harness: fixtureCodexHarness,
      products,
    });

    expect(funnelResult.chart).toMatchObject({
      type: "funnel",
      title: "Conversion pressure",
      columns: ["Stage", "Count", "Rate"],
      rows: [
        { label: "Product views", values: ["39,800", "100%"] },
        { label: "Adds to cart", values: ["4,555", "11.4%"] },
        { label: "Purchases", values: ["810", "2%"] },
      ],
    });
  });

  it("prepares an Operator handoff and visual saved-run comparison from metric answers", async () => {
    const current = await answerMetricsQuestion({
      question:
        "What should we promote for Father’s Day based on margin, inventory, and conversion?",
      harness: fixtureCodexHarness,
      products,
    });
    const saved = await answerMetricsQuestion({
      question: "What bundle would increase average order value for Father’s Day shoppers?",
      harness: fixtureCodexHarness,
      products,
    });

    expect(current.operatorHandoff).toEqual({
      campaignSeason: "fathers-day",
      proposalPrompt: "Generate a Father’s Day campaign proposal from this metrics insight.",
      insightTitle: "Father’s Day opportunity favors grilling, travel, and everyday carry.",
      productIds: [
        "portable-charcoal-grill",
        "cast-iron-grill-press",
        "leather-weekender-bag",
        "travel-grooming-kit",
        "wireless-charging-valet",
        "insulated-cooler-tote",
      ],
      excludedProductIds: ["espresso-machine", "noise-canceling-earbuds"],
    });

    expect(compareMetricsRuns({ current, saved })).toEqual({
      currentLabel: "Current draft",
      savedLabel: "Selected saved run",
      sharedProductCount: 3,
      changedProductCount: 3,
      currentOnlyProductIds: [
        "leather-weekender-bag",
        "travel-grooming-kit",
        "wireless-charging-valet",
      ],
      savedOnlyProductIds: [],
      productRows: [
        {
          productId: "portable-charcoal-grill",
          label: "Portable Charcoal Grill",
          status: "shared",
          marginPercent: 54,
          inventory: 420,
        },
        {
          productId: "cast-iron-grill-press",
          label: "Cast Iron Grill Press",
          status: "shared",
          marginPercent: 62,
          inventory: 780,
        },
        {
          productId: "leather-weekender-bag",
          label: "Leather Weekender Bag",
          status: "current-only",
          marginPercent: 48,
          inventory: 185,
        },
        {
          productId: "travel-grooming-kit",
          label: "Travel Grooming Kit",
          status: "current-only",
          marginPercent: 58,
          inventory: 640,
        },
        {
          productId: "wireless-charging-valet",
          label: "Wireless Charging Valet",
          status: "current-only",
          marginPercent: 55,
          inventory: 560,
        },
        {
          productId: "insulated-cooler-tote",
          label: "Insulated Cooler Tote",
          status: "shared",
          marginPercent: 51,
          inventory: 510,
        },
      ],
    });
  });

  it("saves a Metrics Copilot trace when answering an approved question", async () => {
    const savedTraces: unknown[] = [];

    const result = await answerAndSaveMetricsQuestion({
      id: "trace-1",
      question:
        "What should we promote for Father’s Day based on margin, inventory, and conversion?",
      harness: fixtureCodexHarness,
      products,
      createdByUserId: "demo-manager",
      createdAt: new Date("2026-05-22T11:00:00.000Z"),
      traceStore: {
        saveMetricsTrace(trace) {
          savedTraces.push(trace);
        },
      },
    });

    expect(savedTraces).toEqual([
      {
        id: "trace-1",
        question: result.question,
        operationName: "FatherDayPromotionCandidates",
        validationStatus: "valid",
        validationErrors: [],
        generatedGraphql: result.trace.generatedQuery.query,
        rationale: result.trace.generatedQuery.rationale,
        chartType: "productTable",
        recommendedProductIds: [
          "portable-charcoal-grill",
          "cast-iron-grill-press",
          "leather-weekender-bag",
          "travel-grooming-kit",
          "wireless-charging-valet",
          "insulated-cooler-tote",
        ],
        createdByUserId: "demo-manager",
        createdAt: new Date("2026-05-22T11:00:00.000Z"),
      },
    ]);
  });

  it("saves GraphQL validation errors when generated query validation fails", async () => {
    const savedTraces: unknown[] = [];

    await answerAndSaveMetricsQuestion({
      id: "trace-invalid",
      question: "Which products have high inventory but are underexposed on the storefront?",
      harness: {
        mode: "fixture",
        async generateGraphQLQuery(question) {
          return {
            question,
            operationName: "BrokenMetricsQuery",
            query: "query BrokenMetricsQuery { products { missingField } }",
            rationale: "Broken on purpose for validation coverage.",
            recommendedChart: "productTable",
          };
        },
        async summarizeInsight() {
          return {
            title: "Broken query",
            summary: "Validation catches bad generated GraphQL.",
            recommendedProductIds: [],
            risks: [],
          };
        },
        async generateCampaignProposal() {
          throw new Error("unused");
        },
        async generateStorefrontConfig() {
          throw new Error("unused");
        },
      },
      products,
      createdByUserId: "demo-manager",
      createdAt: new Date("2026-05-22T12:00:00.000Z"),
      traceStore: {
        saveMetricsTrace(trace) {
          savedTraces.push(trace);
        },
      },
    });

    expect(savedTraces).toMatchObject([
      {
        id: "trace-invalid",
        validationStatus: "invalid",
        validationErrors: [expect.stringContaining("missingField")],
      },
    ]);
  });
});
