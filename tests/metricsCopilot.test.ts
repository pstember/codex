import { describe, expect, it } from "vitest";
import { answerAndSaveMetricsQuestion, answerMetricsQuestion } from "@/domain/metricsCopilot";
import { products } from "@/fixtures/products";
import { fixtureCodexHarness } from "@/harness/codexHarness";

describe("metrics copilot", () => {
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
});
