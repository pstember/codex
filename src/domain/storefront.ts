import { z } from "zod";
import type { Product } from "@/domain/product";

export const sectionTypes = [
  "hero",
  "promoStrip",
  "productRail",
  "bundleCards",
  "trustBlock",
  "faq",
  "countdown",
  "featuredCollection",
] as const;

export const maxProductsPerFeatureDrop = 3;

export const storefrontSectionIntents = ["heroProduct", "currentOffer", "spotlight"] as const;

export type StorefrontSectionIntent = (typeof storefrontSectionIntents)[number];

export const storefrontSectionIntentLabels: Record<
  StorefrontSectionIntent | "allProducts",
  string
> = {
  heroProduct: "Hero product",
  currentOffer: "Current offer",
  spotlight: "Spotlight",
  allProducts: "All products",
};

export function resolveStorefrontSectionIntent(
  section: { sectionIntent?: StorefrontSectionIntent },
  index = 0,
): StorefrontSectionIntent {
  return section.sectionIntent ?? storefrontSectionIntents[index] ?? "spotlight";
}

export function getStorefrontSectionLabel(
  section: { sectionIntent?: StorefrontSectionIntent },
  index = 0,
): string {
  return storefrontSectionIntentLabels[resolveStorefrontSectionIntent(section, index)];
}

export const styleTokenSchema = z.object({
  theme: z.string().min(1),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  density: z.enum(["compact", "comfortable", "editorial"]),
  palette: z
    .object({
      background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      surface: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      muted: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      border: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      secondaryAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      button: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      buttonText: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    })
    .optional(),
});

export const storefrontHeroImageSlotSchema = z.enum(["storefrontHeroWide"]);
export const storefrontHeroImageAspectRatioSchema = z.enum(["14 / 9"]);
export const storefrontHeroImageFocalPointSchema = z.enum([
  "center",
  "right-center",
  "lower-right",
]);
export const storefrontHeroImageSafeAreaSchema = z.enum(["copy-left-third", "copy-left-half"]);

export const storefrontHeroImageCompositionSchema = z.object({
  slot: storefrontHeroImageSlotSchema,
  aspectRatio: storefrontHeroImageAspectRatioSchema,
  focalPoint: storefrontHeroImageFocalPointSchema,
  safeArea: storefrontHeroImageSafeAreaSchema,
  objectPosition: z.string().min(1).optional(),
});

export const campaignVisualAssetSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  prompt: z.string().min(1),
  alt: z.string().min(1),
  source: z.enum(["static", "generated"]),
  path: z.string().regex(/^\/(?:static-assets|generated-assets)\//),
  composition: storefrontHeroImageCompositionSchema,
});

export const storefrontSectionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(sectionTypes),
  sectionIntent: z.enum(storefrontSectionIntents).optional(),
  title: z.string().min(1),
  body: z.preprocess((value) => (value === null ? undefined : value), z.string().min(1).optional()),
  productIds: z
    .array(z.string())
    .max(maxProductsPerFeatureDrop, "No more than 3 products per storefront section.")
    .default([]),
});

export const storefrontConfigSchema = z
  .object({
    id: z.string().min(1),
    campaignId: z.string().min(1),
    versionName: z.string().min(1),
    style: styleTokenSchema,
    visualAsset: campaignVisualAssetSchema,
    sections: z.array(storefrontSectionSchema).length(storefrontSectionIntents.length),
  })
  .superRefine((config, context) => {
    for (const [index, expectedIntent] of storefrontSectionIntents.entries()) {
      if (config.sections[index]?.sectionIntent !== expectedIntent) {
        context.addIssue({
          code: "custom",
          message: "Storefront sections must be Hero product, Current offer, then Spotlight.",
          path: ["sections", index, "sectionIntent"],
        });
      }
    }
  });

export type StorefrontConfig = z.infer<typeof storefrontConfigSchema>;
export type CampaignVisualAsset = z.infer<typeof campaignVisualAssetSchema>;
export type StorefrontPalette = NonNullable<StorefrontConfig["style"]["palette"]>;
export type StorefrontSection = StorefrontConfig["sections"][number];
export type StorefrontHeroImageComposition = z.infer<typeof storefrontHeroImageCompositionSchema>;

export const defaultStorefrontHeroImageComposition: StorefrontHeroImageComposition = {
  slot: "storefrontHeroWide",
  aspectRatio: "14 / 9",
  focalPoint: "right-center",
  safeArea: "copy-left-half",
  objectPosition: "72% center",
};

export function hydrateCampaignVisualAsset(
  asset: Omit<CampaignVisualAsset, "composition"> & {
    composition?: Partial<StorefrontHeroImageComposition>;
  },
): CampaignVisualAsset {
  return {
    ...asset,
    path:
      asset.path === "/static-assets/baseline-hero.svg"
        ? "/static-assets/basic-hero.svg"
        : asset.path,
    composition: {
      ...defaultStorefrontHeroImageComposition,
      ...asset.composition,
    },
  };
}

export function resolveStorefrontHeroImageComposition(
  asset: Pick<CampaignVisualAsset, "composition"> | Omit<CampaignVisualAsset, "composition">,
): StorefrontHeroImageComposition {
  return {
    ...defaultStorefrontHeroImageComposition,
    ...("composition" in asset ? asset.composition : undefined),
  };
}

export function resolveStorefrontHeroImageObjectPosition(
  asset: Pick<CampaignVisualAsset, "composition"> | Omit<CampaignVisualAsset, "composition">,
): string {
  const composition = resolveStorefrontHeroImageComposition(asset);

  return (
    composition.objectPosition ??
    {
      center: "center",
      "right-center": "72% center",
      "lower-right": "76% 62%",
    }[composition.focalPoint]
  );
}

export function describeStorefrontHeroImageComposition(
  asset: Pick<CampaignVisualAsset, "composition"> | Omit<CampaignVisualAsset, "composition">,
): string {
  const composition = resolveStorefrontHeroImageComposition(asset);

  return `${composition.slot} · ${composition.aspectRatio} · focus ${composition.focalPoint} · safe ${composition.safeArea}`;
}

export function validateStorefrontProductReferences(
  config: StorefrontConfig,
  validProductIds: Set<string>,
): string[] {
  return config.sections.flatMap((section) =>
    section.productIds.filter((productId) => !validProductIds.has(productId)),
  );
}

export function resolveStorefrontPalette(config: StorefrontConfig): StorefrontPalette {
  const fallback = {
    background: "#f9fbff",
    surface: "#ffffff",
    text: "#0b1020",
    muted: "#42526e",
    border: `${config.style.accentColor}`,
    accent: config.style.accentColor,
    secondaryAccent: "#22d3ee",
    button: config.style.accentColor,
    buttonText: "#ffffff",
  };

  return { ...fallback, ...config.style.palette };
}

export function getHeroSection(config: StorefrontConfig): StorefrontSection {
  return (
    config.sections.find(
      (section, index) => resolveStorefrontSectionIntent(section, index) === "heroProduct",
    ) ??
    config.sections.find((section) => section.type === "hero") ??
    config.sections[0]
  );
}

export function getCurrentOfferSection(config: StorefrontConfig): StorefrontSection {
  return (
    config.sections.find(
      (section, index) => resolveStorefrontSectionIntent(section, index) === "currentOffer",
    ) ??
    config.sections[1] ??
    getHeroSection(config)
  );
}

export function getSpotlightSection(config: StorefrontConfig): StorefrontSection {
  return (
    config.sections.find(
      (section, index) => resolveStorefrontSectionIntent(section, index) === "spotlight",
    ) ??
    config.sections[2] ??
    getCurrentOfferSection(config)
  );
}

export function getProductsById(products: Product[]): Map<string, Product> {
  return new Map(products.map((product) => [product.id, product]));
}

export function resolveSectionProducts(section: StorefrontSection, products: Product[]): Product[] {
  const productsById = getProductsById(products);

  return section.productIds.flatMap((productId) => {
    const product = productsById.get(productId);

    return product ? [product] : [];
  });
}

export function resolveHeroProduct(config: StorefrontConfig, products: Product[]): Product | null {
  const productsById = getProductsById(products);
  const hero = getHeroSection(config);
  const heroProduct = hero.productIds
    .map((productId) => productsById.get(productId))
    .find((product): product is Product => product !== undefined);

  if (heroProduct) {
    return heroProduct;
  }

  const firstPlacedProduct = config.sections
    .flatMap((section) => section.productIds)
    .map((productId) => productsById.get(productId))
    .find((product): product is Product => product !== undefined);

  return firstPlacedProduct ?? products[0] ?? null;
}

export function resolveSpotlightProduct(
  config: StorefrontConfig,
  products: Product[],
): Product | null {
  const productsById = getProductsById(products);
  const spotlight = getSpotlightSection(config);
  const spotlightProduct = spotlight.productIds
    .map((productId) => productsById.get(productId))
    .find((product): product is Product => product !== undefined);

  return spotlightProduct ?? resolveHeroProduct(config, products);
}

export function hydrateLegacyStorefrontSectionIntents(config: StorefrontConfig): StorefrontConfig {
  return {
    ...config,
    visualAsset: hydrateCampaignVisualAsset(config.visualAsset),
    sections: config.sections.map((section, index) => ({
      ...section,
      sectionIntent: section.sectionIntent ?? storefrontSectionIntents[index] ?? "spotlight",
    })),
  };
}
