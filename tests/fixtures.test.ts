import { access } from "node:fs/promises";
import { join } from "node:path";
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

  it("keeps reusable static product presentation images for the full catalog", async () => {
    for (const product of products) {
      expect(product.image.path).toBe(`/static-assets/products/${product.id}.jpg`);
      expect(product.image.alt).toContain(product.name);
      await expect(access(join(process.cwd(), "public", product.image.path))).resolves.toBe(
        undefined,
      );
    }
  });
});
