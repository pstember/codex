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
});
