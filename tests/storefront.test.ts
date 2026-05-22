import { describe, expect, it } from "vitest";
import { storefrontConfigSchema, validateStorefrontProductReferences } from "@/domain/storefront";
import { productIds } from "@/fixtures/products";
import {
  baselineStorefront,
  fatherDayStorefront,
  secretSantaStorefront,
} from "@/fixtures/storefront";

describe("storefront config validation", () => {
  it("validates baseline, Father’s Day, and Secret Santa storefront fixtures", () => {
    for (const config of [baselineStorefront, fatherDayStorefront, secretSantaStorefront]) {
      const parsed = storefrontConfigSchema.parse(config);
      expect(validateStorefrontProductReferences(parsed, productIds)).toEqual([]);
    }
  });

  it("rejects storefronts that reference unknown products", () => {
    const invalidConfig = storefrontConfigSchema.parse({
      ...secretSantaStorefront,
      sections: [
        {
          id: "bad-section",
          type: "productRail",
          title: "Bad products",
          productIds: ["missing-product"],
        },
      ],
    });

    expect(validateStorefrontProductReferences(invalidConfig, productIds)).toEqual([
      "missing-product",
    ]);
  });
});
