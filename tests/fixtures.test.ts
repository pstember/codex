import { describe, expect, it } from "vitest";
import { productSchema } from "@/domain/product";
import { products } from "@/fixtures/products";

describe("Atlas & Co. product fixtures", () => {
  it("keeps all seeded products valid and uniquely identified", () => {
    const ids = new Set<string>();

    for (const product of products) {
      const parsed = productSchema.parse(product);
      expect(ids.has(parsed.id)).toBe(false);
      ids.add(parsed.id);
    }

    expect(ids.size).toBe(products.length);
  });

  it("keeps the seeded catalog shaped for both demo acts", () => {
    expect(products.some((product) => product.tags.includes("fathers-day"))).toBe(true);
    expect(products.some((product) => product.tags.includes("secret-santa"))).toBe(true);
    expect(products.some((product) => product.tags.includes("low-stock"))).toBe(true);
    expect(products.some((product) => product.tags.includes("high-return"))).toBe(true);
  });
});
