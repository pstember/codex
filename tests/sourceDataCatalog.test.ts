import { describe, expect, it } from "vitest";
import { buildSourceDataCatalog } from "@/domain/sourceDataCatalog";
import { commerceData } from "@/fixtures/commerce";
import { products } from "@/fixtures/products";
import {
  baselineStorefront,
  fatherDayStorefront,
  secretSantaStorefront,
} from "@/fixtures/storefront";

describe("source data catalog", () => {
  it("groups every seeded data collection for the Insight source-data browser", () => {
    const catalog = buildSourceDataCatalog({
      commerceData,
      products,
      storefronts: [baselineStorefront, fatherDayStorefront, secretSantaStorefront],
    });

    expect(catalog.summary).toEqual([
      { label: "Products", value: products.length },
      { label: "Customers", value: commerceData.customers.length },
      { label: "Orders", value: commerceData.orders.length },
      {
        label: "Order items",
        value: commerceData.orders.reduce((total, order) => total + order.items.length, 0),
      },
      { label: "Stock rows", value: commerceData.stockPositions.length },
      { label: "Returns", value: commerceData.returns.length },
      { label: "Email events", value: commerceData.emailEvents.length },
      { label: "Promotions", value: commerceData.promotions.length },
      { label: "Storefronts", value: 3 },
    ]);
    expect(catalog.tables.map((table) => table.id)).toEqual([
      "products",
      "customers",
      "addresses",
      "orders",
      "order-items",
      "inventory-locations",
      "stock-positions",
      "returns",
      "email-events",
      "promotions",
      "storefronts",
      "storefront-sections",
    ]);
    expect(catalog.tables.find((table) => table.id === "orders")?.rows).toHaveLength(
      commerceData.orders.length,
    );
    expect(catalog.tables.find((table) => table.id === "order-items")?.rows).toHaveLength(
      commerceData.orders.reduce((total, order) => total + order.items.length, 0),
    );
    expect(catalog.dashboard.kpis.map((kpi) => kpi.id)).toContain("gross_revenue");
    expect(catalog.dashboard.rankedProducts[0]).toMatchObject({
      name: expect.any(String),
      signal: expect.stringMatching(/Promote|Monitor|Hold/),
    });
    expect(catalog.dashboard.returnReasons.length).toBeGreaterThan(0);
  });
});
