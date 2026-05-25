import { describe, expect, it } from "vitest";
import {
  buildMetricDashboard,
  calculateMetricEvidence,
  commerceMetricCatalog,
} from "@/domain/commerceMetrics";
import { commerceData } from "@/fixtures/commerce";
import { products } from "@/fixtures/products";

describe("commerce metric catalog", () => {
  it("declares the 25 backend-owned metric ids available to Codex", () => {
    expect(commerceMetricCatalog.map((metric) => metric.id)).toEqual([
      "product_price",
      "product_margin_percent",
      "product_inventory",
      "product_conversion_rate",
      "product_return_rate",
      "product_views",
      "product_add_to_cart_rate",
      "product_purchase_count",
      "product_revenue",
      "product_gross_profit",
      "product_sell_through_pressure",
      "product_exposure_gap",
      "product_promotion_score",
      "product_risk_score",
      "product_giftability_score",
      "order_count",
      "gross_revenue",
      "average_order_value",
      "discount_rate",
      "channel_mix",
      "return_count",
      "return_reason_share",
      "refund_total",
      "customer_segment_count",
      "email_engagement_rate",
    ]);
  });

  it("builds dashboard KPIs from seeded raw data", () => {
    const dashboard = buildMetricDashboard({ commerceData, products });

    expect(dashboard.kpis.map((kpi) => kpi.id)).toEqual([
      "gross_revenue",
      "average_order_value",
      "product_count",
      "average_margin",
      "total_inventory",
      "return_rate",
      "email_engagement_rate",
      "active_promotions",
    ]);
    expect(dashboard.kpis.find((kpi) => kpi.id === "product_count")?.value).toBe(
      String(products.length),
    );
    expect(dashboard.kpis.find((kpi) => kpi.id === "active_promotions")?.value).toBe(
      String(commerceData.promotions.filter((promotion) => promotion.active).length),
    );
    expect(dashboard.channelMix.length).toBeGreaterThan(1);
    expect(dashboard.returnReasons.length).toBeGreaterThan(0);
    expect(dashboard.rankedProducts[0]).toMatchObject({
      id: "cast-iron-grill-press",
      name: "Cast Iron Grill Press",
      signal: "Promote",
    });
    expect(dashboard.productCategories).toEqual(
      [...new Set(products.map((product) => product.category))].sort(),
    );
    expect(dashboard.signalSummary).toEqual({
      Hold: dashboard.rankedProducts.filter((row) => row.signal === "Hold").length,
      Monitor: dashboard.rankedProducts.filter((row) => row.signal === "Monitor").length,
      Promote: dashboard.rankedProducts.filter((row) => row.signal === "Promote").length,
    });
  });

  it("calculates promotion evidence with ranked candidates and capped rows", () => {
    const evidence = calculateMetricEvidence({
      commerceData,
      limit: 5,
      products,
      requestedMetrics: [
        "product_promotion_score",
        "product_margin_percent",
        "product_inventory",
        "product_conversion_rate",
        "product_return_rate",
      ],
      sortBy: "product_promotion_score",
    });

    expect(evidence.status).toBe("sufficient");
    expect(evidence.requestedMetrics).toContain("product_promotion_score");
    expect(evidence.rows).toHaveLength(5);
    expect(evidence.rows[0]).toMatchObject({
      id: "cast-iron-grill-press",
      name: "Cast Iron Grill Press",
      signal: "Promote",
    });
    expect(evidence.rows[0].metrics.product_promotion_score).toBeGreaterThan(80);
    expect(evidence.riskRows.map((row) => row.id)).toContain("espresso-machine");
    expect(evidence.truncated).toBe(true);
    expect(evidence.evidencePack).toContain("Promotion candidate summary");
    expect(evidence.evidencePack).toContain("Cast Iron Grill Press");
    expect(evidence.evidencePack).toContain(`rows truncated: showing 5 of ${products.length}`);
  });

  it("rejects unsupported metric ids before evidence reaches Codex", () => {
    expect(() =>
      calculateMetricEvidence({
        commerceData,
        products,
        requestedMetrics: ["product_promotion_score", "made_up_metric"],
      }),
    ).toThrow("Unsupported metric ids: made_up_metric");
  });

  it("rejects unsupported sort metrics before evidence reaches Codex", () => {
    expect(() =>
      calculateMetricEvidence({
        commerceData,
        products,
        requestedMetrics: ["product_promotion_score"],
        sortBy: "made_up_metric",
      }),
    ).toThrow("Unsupported metric ids: made_up_metric");
  });

  it("defaults to promotion score and handles empty product evidence", () => {
    const evidence = calculateMetricEvidence({
      commerceData,
      limit: 50,
      products: [],
      requestedMetrics: [],
    });

    expect(evidence.status).toBe("insufficient");
    expect(evidence.limit).toBe(10);
    expect(evidence.requestedMetrics).toEqual(["product_promotion_score"]);
    expect(evidence.sortBy).toBe("product_promotion_score");
    expect(evidence.evidencePack).toContain("top candidates: none");
  });
});
