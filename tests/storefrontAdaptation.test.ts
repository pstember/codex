import { describe, expect, it } from "vitest";
import { adaptStorefrontForEvent } from "@/application/storefrontAdaptation";
import {
  type CampaignVisualAsset,
  defaultStorefrontHeroImageComposition,
  type StorefrontConfig,
} from "@/domain/storefront";
import { products } from "@/fixtures/products";
import { baselineStorefront } from "@/fixtures/storefront";
import type { CodexHarness } from "@/harness/codexHarness";
import type { ImageHarness } from "@/harness/imageHarness";
import { fixtureCodexHarness } from "./support/fixtureCodexHarness";

describe("storefront visual adaptation", () => {
  it("creates a valid generated storefront draft for an open event prompt", async () => {
    const savedDrafts: unknown[] = [];

    const draft = await adaptStorefrontForEvent({
      id: "halloween-draft-1",
      eventName: "Halloween",
      operatorPrompt: "Make the storefront feel cosy, eerie, and useful for office gifts.",
      sourceStorefront: baselineStorefront,
      harness: halloweenHarness,
      imageHarness: generatedHalloweenImageHarness,
      products,
      createdByUserId: "demo-operator",
      createdAt: new Date("2026-05-23T11:00:00.000Z"),
      storefrontStore: {
        saveStorefrontConfig(savedDraft) {
          savedDrafts.push(savedDraft);
        },
      },
    });

    expect(draft).toMatchObject({
      id: "halloween-draft-1",
      sourceDraftKey: "adaptation:halloween",
      validationStatus: "draft",
      validationErrors: [],
      config: {
        campaignId: "event-halloween",
        versionName: "Halloween",
        style: {
          theme: "halloween",
          accentColor: "#f97316",
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
        visualAsset: {
          id: "event-halloween-hero-asset",
          source: "generated",
          path: "/static-assets/generated-halloween-hero.svg",
          composition: defaultStorefrontHeroImageComposition,
        },
      },
    });
    expect(draft.config.sections[0]).toMatchObject({
      type: "hero",
      title: "Halloween gifts with a useful little shiver.",
    });
    expect(savedDrafts).toEqual([draft]);
  });

  it("marks a draft invalid when Codex returns unsafe palette values or unknown products", async () => {
    const invalidHarness: CodexHarness = {
      ...halloweenHarness,
      async generateStorefrontAdaptation() {
        return {
          ...halloweenStorefrontConfig,
          style: {
            ...halloweenStorefrontConfig.style,
            palette: {
              ...halloweenStorefrontConfig.style.palette,
              accent: "orange",
            },
          },
          sections: [
            ...halloweenStorefrontConfig.sections,
            {
              id: "bad-product",
              type: "productRail",
              title: "Unknown goods",
              productIds: ["not-a-real-product"],
            },
          ],
        } as StorefrontConfig;
      },
    };

    const draft = await adaptStorefrontForEvent({
      id: "bad-draft",
      eventName: "Halloween",
      operatorPrompt: "Use dramatic orange.",
      sourceStorefront: baselineStorefront,
      harness: invalidHarness,
      imageHarness: generatedHalloweenImageHarness,
      products,
      createdByUserId: "demo-operator",
      createdAt: new Date("2026-05-23T11:15:00.000Z"),
      storefrontStore: {
        saveStorefrontConfig() {},
      },
    });

    expect(draft.validationStatus).toBe("invalid");
    expect(draft.validationErrors).toEqual(
      expect.arrayContaining([expect.stringContaining("Invalid storefront config:")]),
    );
    expect(draft.validationErrors).toContain(
      'Storefront section references unknown product "not-a-real-product".',
    );
  });

  it("saves an invalid draft when generated image creation fails", async () => {
    const draft = await adaptStorefrontForEvent({
      id: "image-failure-draft",
      eventName: "Halloween",
      operatorPrompt: "Generate an eerie hero.",
      sourceStorefront: baselineStorefront,
      harness: halloweenHarness,
      imageHarness: {
        mode: "live",
        async generateCampaignHero() {
          throw new Error("Image service unavailable");
        },
      },
      products,
      createdByUserId: "demo-operator",
      createdAt: new Date("2026-05-23T11:20:00.000Z"),
      storefrontStore: {
        saveStorefrontConfig() {},
      },
    });

    expect(draft.validationStatus).toBe("invalid");
    expect(draft.validationErrors).toContain("Generated image failed: Image service unavailable");
    expect(draft.config.visualAsset.source).toBe("static");
  });
});

const halloweenStorefrontConfig: StorefrontConfig = {
  id: "event-halloween-storefront",
  campaignId: "event-halloween",
  versionName: "Halloween",
  style: {
    theme: "halloween",
    accentColor: "#f97316",
    density: "editorial",
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
  visualAsset: {
    id: "event-halloween-placeholder",
    campaignId: "event-halloween",
    prompt: "Cosy Halloween office gifting with useful products.",
    alt: "Halloween gift arrangement for Atlas & Co.",
    source: "static",
    path: "/static-assets/basic-hero.svg",
    composition: defaultStorefrontHeroImageComposition,
  },
  sections: [
    {
      id: "event-halloween-hero",
      type: "hero",
      sectionIntent: "heroProduct",
      title: "Halloween gifts with a useful little shiver.",
      body: "Cosy desk, coffee, and travel picks for the season of small surprises.",
      productIds: ["pour-over-coffee-set"],
    },
    {
      id: "event-halloween-offer",
      type: "productRail",
      sectionIntent: "currentOffer",
      title: "Treats that still work on Monday",
      body: "A current Halloween offer for practical office gifts with seasonal charm.",
      productIds: ["pour-over-coffee-set", "desk-organizer-tray", "travel-grooming-kit"],
    },
    {
      id: "event-halloween-spotlight",
      type: "featuredCollection",
      sectionIntent: "spotlight",
      title: "Spotlight: Pour-Over Coffee Set",
      body: "A useful gift gets the richer Halloween treatment without leaving the catalog reality.",
      productIds: ["pour-over-coffee-set"],
    },
  ],
};

const halloweenHarness: CodexHarness = {
  ...fixtureCodexHarness,
  async generateStorefrontAdaptation() {
    return halloweenStorefrontConfig;
  },
};

const generatedHalloweenImageHarness: ImageHarness = {
  mode: "live",
  async generateCampaignHero(input): Promise<CampaignVisualAsset> {
    return {
      id: `${input.campaignId}-hero-asset`,
      campaignId: input.campaignId,
      prompt: input.visualDirection,
      alt: "A generated Halloween hero scene for Atlas & Co. gifts.",
      source: "generated",
      path: "/static-assets/generated-halloween-hero.svg",
      composition: input.composition ?? defaultStorefrontHeroImageComposition,
    };
  },
};
