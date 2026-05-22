import { z } from "zod";

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

export const styleTokenSchema = z.object({
  theme: z.enum(["heritage", "summer", "holiday"]),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  density: z.enum(["compact", "comfortable", "editorial"]),
});

export const storefrontSectionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(sectionTypes),
  title: z.string().min(1),
  body: z.string().min(1).optional(),
  productIds: z.array(z.string()).default([]),
});

export const storefrontConfigSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  versionName: z.string().min(1),
  style: styleTokenSchema,
  sections: z.array(storefrontSectionSchema).min(1),
});

export type StorefrontConfig = z.infer<typeof storefrontConfigSchema>;

export function validateStorefrontProductReferences(
  config: StorefrontConfig,
  validProductIds: Set<string>,
): string[] {
  return config.sections.flatMap((section) =>
    section.productIds.filter((productId) => !validProductIds.has(productId)),
  );
}
