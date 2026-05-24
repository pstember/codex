import { describe, expect, it } from "vitest";
import { storefrontFooterLinks } from "@/app/components/storefrontFooterLinks";
import {
  defaultStorefrontHeroImageComposition,
  getStorefrontSectionLabel,
  hydrateCampaignVisualAsset,
  resolveStorefrontHeroImageObjectPosition,
  resolveStorefrontPalette,
  resolveStorefrontSectionIntent,
  storefrontConfigSchema,
  storefrontSectionIntents,
  validateStorefrontProductReferences,
} from "@/domain/storefront";
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
      expect(parsed.sections.map((section) => section.sectionIntent)).toEqual(
        storefrontSectionIntents,
      );
    }
  });

  it("requires hero product, current offer, and spotlight sections in order", () => {
    expect(() =>
      storefrontConfigSchema.parse({
        ...baselineStorefront,
        sections: [
          {
            ...baselineStorefront.sections[0],
            sectionIntent: "currentOffer",
          },
          {
            ...baselineStorefront.sections[1],
            sectionIntent: "heroProduct",
          },
          baselineStorefront.sections[2],
        ],
      }),
    ).toThrow("Storefront sections must be Hero product, Current offer, then Spotlight.");

    expect(() =>
      storefrontConfigSchema.parse({
        ...baselineStorefront,
        sections: baselineStorefront.sections.map(
          ({ sectionIntent: _sectionIntent, ...section }) => section,
        ),
      }),
    ).toThrow("Storefront sections must be Hero product, Current offer, then Spotlight.");
  });

  it("rejects storefronts that reference unknown products", () => {
    const invalidConfig = storefrontConfigSchema.parse({
      ...secretSantaStorefront,
      sections: [
        secretSantaStorefront.sections[0],
        secretSantaStorefront.sections[1],
        {
          id: "bad-section",
          type: "productRail",
          sectionIntent: "spotlight",
          title: "Bad products",
          productIds: ["missing-product"],
        },
      ],
    });

    expect(validateStorefrontProductReferences(invalidConfig, productIds)).toEqual([
      "missing-product",
    ]);
  });

  it("rejects storefront sections with more than three products", () => {
    expect(() =>
      storefrontConfigSchema.parse({
        ...secretSantaStorefront,
        sections: [
          secretSantaStorefront.sections[0],
          secretSantaStorefront.sections[1],
          {
            id: "crowded-drop",
            type: "productRail",
            sectionIntent: "spotlight",
            title: "Too many products",
            productIds: [
              "pour-over-coffee-set",
              "desk-organizer-tray",
              "meeting-survival-card-deck",
              "brain-teaser-puzzle-cube",
            ],
          },
        ],
      }),
    ).toThrow("No more than 3 products per storefront section.");
  });

  it("resolves explicit event palettes and legacy accent-only palettes", () => {
    expect(
      resolveStorefrontPalette({
        ...secretSantaStorefront,
        style: {
          ...secretSantaStorefront.style,
          palette: {
            background: "#12091f",
            surface: "#fff7ed",
            text: "#f8fafc",
            muted: "#fde7c8",
            border: "#f97316",
            accent: "#f97316",
            secondaryAccent: "#a3e635",
            button: "#f97316",
            buttonText: "#12091f",
          },
        },
      }),
    ).toEqual({
      background: "#12091f",
      surface: "#fff7ed",
      text: "#f8fafc",
      muted: "#fde7c8",
      border: "#f97316",
      accent: "#f97316",
      secondaryAccent: "#a3e635",
      button: "#f97316",
      buttonText: "#12091f",
    });
    expect(resolveStorefrontPalette(fatherDayStorefront)).toEqual({
      background: "#f9fbff",
      surface: "#ffffff",
      text: "#0b1020",
      muted: "#42526e",
      border: "#b45309",
      accent: "#b45309",
      secondaryAccent: "#22d3ee",
      button: "#b45309",
      buttonText: "#ffffff",
    });
  });

  it("labels section intents and falls back by fixed order for legacy sections", () => {
    expect(getStorefrontSectionLabel({ sectionIntent: "spotlight" })).toBe("Spotlight");
    expect(getStorefrontSectionLabel({}, 1)).toBe("Current offer");
    expect(resolveStorefrontSectionIntent({}, 99)).toBe("spotlight");
  });

  it("hydrates legacy hero assets with the shared wide-banner composition defaults", () => {
    const asset = hydrateCampaignVisualAsset({
      id: "legacy-hero",
      campaignId: "evergreen",
      prompt: "Legacy prompt",
      alt: "Legacy alt",
      source: "static",
      path: "/static-assets/basic-hero.svg",
    });

    expect(asset.composition).toEqual(defaultStorefrontHeroImageComposition);
    expect(resolveStorefrontHeroImageObjectPosition(asset)).toBe("72% center");
  });

  it("normalizes the removed baseline hero path to the basic hero asset", () => {
    const asset = hydrateCampaignVisualAsset({
      id: "legacy-baseline-hero",
      campaignId: "evergreen",
      prompt: "Legacy prompt",
      alt: "Legacy alt",
      source: "static",
      path: "/static-assets/baseline-hero.svg",
    });

    expect(asset.path).toBe("/static-assets/basic-hero.svg");
  });

  it("rejects malformed hero composition metadata", () => {
    expect(() =>
      storefrontConfigSchema.parse({
        ...baselineStorefront,
        visualAsset: {
          ...baselineStorefront.visualAsset,
          composition: {
            ...baselineStorefront.visualAsset.composition,
            aspectRatio: "4 / 5",
          },
        },
      }),
    ).toThrow();
  });

  it("defines stable shopper footer links for the public storefront", () => {
    expect(storefrontFooterLinks).toEqual([
      { href: "/about", label: "About Atlas & Co." },
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/privacy", label: "Privacy" },
      { href: "/shipping-returns", label: "Shipping & Returns" },
    ]);
  });
});
