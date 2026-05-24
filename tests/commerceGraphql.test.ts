import { describe, expect, it } from "vitest";
import { executeCommerceQuery, validateCommerceQuery } from "@/domain/commerceGraphql";
import { commerceData } from "@/fixtures/commerce";
import { products } from "@/fixtures/products";

describe("commerce GraphQL analytics", () => {
  it("validates and executes customer/order/promotion queries against seeded commerce data", async () => {
    const generatedQuery = {
      question: "Which London coffee customers and orders are useful for a promotion?",
      operationName: "CoffeeCustomerOrders",
      query: `query CoffeeCustomerOrders {
  customers(filter: { segment: "coffee-regulars", borough: "Hackney" }) {
    id
    email
    borough
    segment
  }
  orders(filter: { channel: "online", minTotal: 40 }) {
    id
    customerId
    grandTotal
    items {
      productId
      quantity
    }
  }
  promotions(filter: { segment: "coffee-regulars" }) {
    id
    title
    discountPercent
  }
}`,
      rationale: "Use customer segment, order value, and active promotions.",
      recommendedChart: "productTable" as const,
    };

    expect(validateCommerceQuery(generatedQuery)).toEqual({ status: "valid" });

    const result = await executeCommerceQuery({
      generatedQuery,
      products,
      commerceData,
    });

    expect(result.data.customers.length).toBeGreaterThan(0);
    expect(result.data.orders.length).toBeGreaterThan(0);
    expect(result.data.promotions[0].id).toBe("coffee-regulars-fathers-day");
    expect(result.recommendedProductIds).toContain("pour-over-coffee-set");
  });

  it("validates and executes return, email event, and stock position queries", async () => {
    const generatedQuery = {
      question: "Which returns and stock rows explain product risk?",
      operationName: "ReturnStockSignals",
      query: `query ReturnStockSignals {
  returns(filter: { reason: "changed-mind" }) {
    id
    productId
    reason
    status
  }
  emailEvents(filter: { eventType: "conversion" }) {
    id
    customerId
    eventType
  }
  stockPositions(filter: { productId: "cast-iron-grill-press" }) {
    productId
    locationId
    onHand
    reserved
  }
}`,
      rationale: "Use return, email, and stock signals.",
      recommendedChart: "bar" as const,
    };

    expect(validateCommerceQuery(generatedQuery)).toEqual({ status: "valid" });

    const result = await executeCommerceQuery({
      generatedQuery,
      products,
      commerceData,
    });

    expect(result.data.returns.length).toBeGreaterThan(0);
    expect(
      result.data.returns.every((commerceReturn) => commerceReturn.reason === "changed-mind"),
    ).toBe(true);
    expect(result.data.emailEvents.length).toBeGreaterThan(0);
    expect(result.data.stockPositions).toHaveLength(3);
    expect(result.recommendedProductIds).toContain("cast-iron-grill-press");
  });

  it("filters returns by requested date range", async () => {
    const generatedQuery = {
      question: "What was my return rate from June 1 to June 3?",
      operationName: "ReturnRateByRequestedDate",
      query: `query ReturnRateByRequestedDate {
  returns(filter: { requestedFrom: "2026-06-01", requestedTo: "2026-06-03" }) {
    id
    requestedAt
  }
  orders {
    id
  }
}`,
      rationale: "Use requested return dates and order count for a date-scoped return rate.",
      recommendedChart: "kpiCards" as const,
    };

    expect(validateCommerceQuery(generatedQuery)).toEqual({ status: "valid" });

    const result = await executeCommerceQuery({
      generatedQuery,
      products,
      commerceData,
    });

    expect(result.data.returns).toHaveLength(6);
    expect(
      result.data.returns.every((commerceReturn) =>
        commerceReturn.requestedAt?.match(/^2026-06-0[1-3]T10:30:00.000Z$/),
      ),
    ).toBe(true);
    expect(result.data.orders).toHaveLength(260);
  });

  it("filters orders by placed date range for period questions", async () => {
    const generatedQuery = {
      question: "How many orders did I get from November 20 to November 26?",
      operationName: "SecretSantaLaunchOrders",
      query: `query SecretSantaLaunchOrders {
  orders(filter: { orderedFrom: "2026-11-20", orderedTo: "2026-11-26" }) {
    id
    orderedAt
    channel
    grandTotal
  }
}`,
      rationale: "Use placed order dates for a period-scoped order question.",
      recommendedChart: "kpiCards" as const,
    };

    expect(validateCommerceQuery(generatedQuery)).toEqual({ status: "valid" });

    const result = await executeCommerceQuery({
      generatedQuery,
      products,
      commerceData,
    });

    expect(result.data.orders.length).toBeGreaterThanOrEqual(40);
    expect(result.data.orders.every((order) => order.orderedAt?.startsWith("2026-11-"))).toBe(true);
  });

  it("exposes raw product inputs needed for backend metric calculations", async () => {
    const generatedQuery = {
      question: "Which item should I promote in my next campaign?",
      operationName: "PromotionMetricInputs",
      query: `query PromotionMetricInputs {
  products {
    id
    name
    views
    addToCartRate
    purchaseCount
    tags
  }
}`,
      rationale: "Fetch raw product inputs used by backend metrics.",
      recommendedChart: "productTable" as const,
    };

    expect(validateCommerceQuery(generatedQuery)).toEqual({ status: "valid" });

    const result = await executeCommerceQuery({
      generatedQuery,
      products,
      commerceData,
    });

    expect(result.data.products[0]).toMatchObject({
      views: expect.any(Number),
      addToCartRate: expect.any(Number),
      purchaseCount: expect.any(Number),
      tags: expect.any(Array),
    });
  });
});
