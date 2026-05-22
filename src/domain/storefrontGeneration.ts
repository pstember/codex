import { z } from "zod";
import type { CampaignProposal } from "@/domain/operatorCampaign";
import type { Product } from "@/domain/product";
import {
  type StorefrontConfig,
  storefrontConfigSchema,
  validateStorefrontProductReferences,
} from "@/domain/storefront";
import type { CodexHarness } from "@/harness/codexHarness";

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
  products: Product[];
  createdByUserId: string;
  createdAt: Date;
  storefrontStore: StorefrontConfigStore;
}): Promise<GeneratedStorefrontConfig> {
  if (input.proposal.validationStatus !== "valid") {
    throw new Error("Only valid campaign proposals can generate storefront configs.");
  }

  const config = await input.harness.generateStorefrontConfig(input.proposal.campaign);
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

  const validProductIds = new Set(products.map((product) => product.id));
  const unknownProductIds = validateStorefrontProductReferences(parsed.data, validProductIds);

  for (const productId of unknownProductIds) {
    errors.push(`Storefront section references unknown product "${productId}".`);
  }

  return errors;
}
