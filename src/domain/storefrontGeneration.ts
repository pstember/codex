import { z } from "zod";
import type { CampaignProposal } from "@/domain/operatorCampaign";
import { findProductsOverPriceLimit, type Product } from "@/domain/product";
import {
  type StorefrontConfig,
  storefrontConfigSchema,
  validateStorefrontProductReferences,
} from "@/domain/storefront";
import type { CodexHarness } from "@/harness/codexHarness";
import { fixtureImageHarness, type ImageHarness } from "@/harness/imageHarness";

export const generatedStorefrontConfigSchema = z.object({
  id: z.string().min(1),
  sourceProposalId: z.string().min(1),
  config: storefrontConfigSchema,
  validationStatus: z.enum(["valid", "invalid"]),
  validationErrors: z.array(z.string()),
  createdByUserId: z.string().min(1),
  createdAt: z.date(),
});

export type GeneratedStorefrontConfig = z.infer<typeof generatedStorefrontConfigSchema>;

export interface StorefrontConfigStore {
  saveStorefrontConfig(storefrontConfig: GeneratedStorefrontConfig): void;
}

export async function generateStorefrontConfigFromProposal(input: {
  id: string;
  proposal: CampaignProposal;
  harness: CodexHarness;
  imageHarness?: ImageHarness;
  products: Product[];
  createdByUserId: string;
  createdAt: Date;
  storefrontStore: StorefrontConfigStore;
}): Promise<GeneratedStorefrontConfig> {
  if (input.proposal.validationStatus !== "valid") {
    throw new Error("Only valid campaign proposals can generate storefront configs.");
  }

  const generatedConfig = await input.harness.generateStorefrontConfig(input.proposal.campaign);
  const shouldGenerateVisualAsset = input.imageHarness || !generatedConfig.visualAsset;
  const visualAsset = shouldGenerateVisualAsset
    ? await (input.imageHarness ?? fixtureImageHarness).generateCampaignHero({
        campaignId: input.proposal.campaign.id,
        season: input.proposal.campaign.season,
        visualDirection: input.proposal.campaign.storefrontAngle,
      })
    : generatedConfig.visualAsset;
  const config = {
    ...generatedConfig,
    visualAsset,
  };
  const validationErrors = validateGeneratedStorefrontConfig(
    config,
    input.proposal,
    input.products,
  );
  const storefrontConfig: GeneratedStorefrontConfig = {
    id: input.id,
    sourceProposalId: input.proposal.id,
    config,
    validationStatus: validationErrors.length > 0 ? "invalid" : "valid",
    validationErrors,
    createdByUserId: input.createdByUserId,
    createdAt: input.createdAt,
  };

  input.storefrontStore.saveStorefrontConfig(storefrontConfig);

  return storefrontConfig;
}

function validateGeneratedStorefrontConfig(
  config: StorefrontConfig,
  proposal: CampaignProposal,
  products: Product[],
): string[] {
  const parsed = storefrontConfigSchema.safeParse(config);

  if (!parsed.success) {
    return parsed.error.issues.map((issue) => issue.message);
  }

  const errors: string[] = [];

  if (parsed.data.campaignId !== proposal.campaign.id) {
    errors.push(
      `Storefront campaign "${parsed.data.campaignId}" does not match proposal campaign "${proposal.campaign.id}".`,
    );
  }

  if (parsed.data.visualAsset.campaignId !== parsed.data.campaignId) {
    errors.push(
      `Storefront visual asset campaign "${parsed.data.visualAsset.campaignId}" does not match storefront campaign "${parsed.data.campaignId}".`,
    );
  }

  const validProductIds = new Set(products.map((product) => product.id));
  const unknownProductIds = validateStorefrontProductReferences(parsed.data, validProductIds);

  for (const productId of unknownProductIds) {
    errors.push(`Storefront section references unknown product "${productId}".`);
  }

  if (proposal.campaign.season === "secret-santa") {
    const storefrontProductIds = parsed.data.sections.flatMap((section) => section.productIds);

    for (const product of findProductsOverPriceLimit(storefrontProductIds, products, 50)) {
      errors.push(`Secret Santa storefront product "${product.name}" exceeds the £50 limit.`);
    }
  }

  return errors;
}
