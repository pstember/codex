import { describe, expect, it } from "vitest";
import {
  getCurrentOfferSection,
  getHeroSection,
  getSpotlightSection,
  hydrateLegacyStorefrontSectionIntents,
  resolveHeroProduct,
  resolveSectionProducts,
  resolveSpotlightProduct,
} from "@/domain/storefront";
import {
  filterStorefrontCatalog,
  getStorefrontCategories,
  paginateStorefrontCatalog,
  storefrontCatalogPageSize,
} from "@/domain/storefrontCatalog";
import { products } from "@/fixtures/products";
import { baselineStorefront, fatherDayStorefront } from "@/fixtures/storefront";

describe("public storefront catalog", () => {
  it("filters products by name, category, and tags", () => {
    expect(
      filterStorefrontCatalog(products, { search: "coffee" }).map((product) => product.id),
    ).toEqual(expect.arrayContaining(["pour-over-coffee-set", "coffee-sampler-flight"]));

    expect(
      filterStorefrontCatalog(products, { category: "Desk gadgets" }).map((product) => product.id),
    ).toEqual(["mug-warmer-coaster", "mini-desktop-vacuum", "usb-hand-warmer"]);

    expect(
      filterStorefrontCatalog(products, { search: "office-gift" }).map((product) => product.id),
    ).toEqual(expect.arrayContaining(["mug-warmer-coaster", "meeting-survival-card-deck"]));
  });

  it("paginates the complete fixture catalog with a stable page size", () => {
    const firstPage = paginateStorefrontCatalog(products, 1);
    const lastPage = paginateStorefrontCatalog(products, 999);

    expect(firstPage.products).toHaveLength(storefrontCatalogPageSize);
    expect(firstPage.pageCount).toBe(Math.ceil(products.length / storefrontCatalogPageSize));
    expect(lastPage.currentPage).toBe(firstPage.pageCount);
    expect(firstPage.totalProducts).toBe(products.length);
  });

  it("normalizes invalid pagination inputs before slicing products", () => {
    const invalidPage = paginateStorefrontCatalog(products, Number.NaN);
    const invalidPageSize = paginateStorefrontCatalog(products, 1, 0);

    expect(invalidPage.currentPage).toBe(1);
    expect(invalidPage.products).toEqual(products.slice(0, storefrontCatalogPageSize));
    expect(invalidPageSize.pageCount).toBe(Math.ceil(products.length / storefrontCatalogPageSize));
    expect(invalidPageSize.products).toHaveLength(storefrontCatalogPageSize);
  });

  it("exposes sorted seeded categories for the storefront filters", () => {
    const categories = getStorefrontCategories(products);

    expect(categories).toHaveLength(15);
    expect(categories).toEqual([...categories].sort());
    expect(categories).toContain("Coffee & kitchen");
  });

  it("resolves hero and section products from the active StorefrontConfig", () => {
    const hero = getHeroSection(fatherDayStorefront);
    const sectionProducts = resolveSectionProducts(hero, products);

    expect(hero.id).toBe("fd-hero");
    expect(resolveHeroProduct(fatherDayStorefront, products)?.id).toBe("portable-charcoal-grill");
    expect(sectionProducts.map((product) => product.id)).toEqual(["portable-charcoal-grill"]);
  });

  it("resolves the baseline hero product", () => {
    expect(resolveHeroProduct(baselineStorefront, products)?.id).toBe("pour-over-coffee-set");
  });

  it("resolves current offer and spotlight products from storefront section intents", () => {
    expect(getCurrentOfferSection(fatherDayStorefront).id).toBe("fd-offer");
    expect(getSpotlightSection(fatherDayStorefront).id).toBe("fd-spotlight");
    expect(resolveSpotlightProduct(fatherDayStorefront, products)?.id).toBe(
      "portable-charcoal-grill",
    );
  });

  it("hydrates legacy storefront sections by their fixed order", () => {
    const legacyStorefront = {
      ...baselineStorefront,
      sections: baselineStorefront.sections.map(
        ({ sectionIntent: _sectionIntent, ...section }) => ({
          ...section,
        }),
      ),
    };
    const hydratedStorefront = hydrateLegacyStorefrontSectionIntents(legacyStorefront);

    expect(hydratedStorefront.sections.map((section) => section.sectionIntent)).toEqual([
      "heroProduct",
      "currentOffer",
      "spotlight",
    ]);
    expect(getSpotlightSection(hydratedStorefront).id).toBe("baseline-spotlight");
  });

  it("falls back to other configured products when hero or spotlight placements are empty", () => {
    const fallbackStorefront = {
      ...baselineStorefront,
      sections: baselineStorefront.sections.map((section) =>
        section.sectionIntent === "heroProduct"
          ? { ...section, productIds: [] }
          : section.sectionIntent === "spotlight"
            ? { ...section, productIds: ["not-a-real-product"] }
            : section,
      ),
    };

    expect(resolveHeroProduct(fallbackStorefront, products)?.id).toBe("pour-over-coffee-set");
    expect(resolveSpotlightProduct(fallbackStorefront, products)?.id).toBe("pour-over-coffee-set");
    expect(resolveHeroProduct(fallbackStorefront, [])).toBeNull();
  });

  it("uses type and positional fallbacks for malformed legacy lookups", () => {
    const malformedStorefront = {
      ...baselineStorefront,
      sections: [
        {
          ...baselineStorefront.sections[1],
          sectionIntent: "currentOffer" as const,
          type: "productRail" as const,
        },
        {
          ...baselineStorefront.sections[0],
          sectionIntent: undefined,
          type: "hero" as const,
        },
      ],
    };

    expect(getHeroSection(malformedStorefront).id).toBe("baseline-hero");
    expect(getSpotlightSection(malformedStorefront).id).toBe("baseline-offer");
  });
});
