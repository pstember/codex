import { z } from "zod";
import { type Campaign, campaignSchema } from "@/domain/campaign";
import type { MetricsTrace } from "@/domain/metricsTrace";
import { findProductsOverPriceLimit, type Product } from "@/domain/product";
import type { CodexHarness } from "@/harness/codexHarness";

export const campaignProposalSchema = z.object({
  id: z.string().min(1),
  sourceTraceId: z.string().min(1),
  campaign: campaignSchema,
  validationStatus: z.enum(["valid", "invalid"]),
  validationErrors: z.array(z.string()),
  createdByUserId: z.string().min(1),
  createdAt: z.date(),
});

export type CampaignProposal = z.infer<typeof campaignProposalSchema>;

export interface CampaignProposalStore {
  saveCampaignProposal(proposal: CampaignProposal): void;
}

export async function proposeCampaignFromMetricsTrace(input: {
  id: string;
  sourceTrace: MetricsTrace;
  harness: CodexHarness;
  products: Product[];
  createdByUserId: string;
  createdAt: Date;
  proposalStore: CampaignProposalStore;
}): Promise<CampaignProposal> {
  const insight = await input.harness.summarizeInsight(input.sourceTrace.question);
  const campaign = await input.harness.generateCampaignProposal({
    insightTitle: insight.title,
    season: inferCampaignSeason(input.sourceTrace),
  });
  const validationErrors = validateCampaignProposal(campaign, input.products);
  const proposal: CampaignProposal = {
    id: input.id,
    sourceTraceId: input.sourceTrace.id,
    campaign,
    validationStatus: validationErrors.length > 0 ? "invalid" : "valid",
    validationErrors,
    createdByUserId: input.createdByUserId,
    createdAt: input.createdAt,
  };

  input.proposalStore.saveCampaignProposal(proposal);

  return proposal;
}

export async function revampCampaignProposalForSeason(input: {
  id: string;
  sourceProposal: CampaignProposal;
  season: Campaign["season"];
  harness: CodexHarness;
  products: Product[];
  createdByUserId: string;
  createdAt: Date;
  proposalStore: CampaignProposalStore;
}): Promise<CampaignProposal> {
  if (input.sourceProposal.validationStatus !== "valid") {
    throw new Error("Only valid campaign proposals can be revamped.");
  }

  const campaign = await input.harness.generateCampaignProposal({
    insightTitle: input.sourceProposal.campaign.name,
    season: input.season,
  });
  const validationErrors = validateCampaignProposal(campaign, input.products);
  const proposal: CampaignProposal = {
    id: input.id,
    sourceTraceId: input.sourceProposal.sourceTraceId,
    campaign,
    validationStatus: validationErrors.length > 0 ? "invalid" : "valid",
    validationErrors,
    createdByUserId: input.createdByUserId,
    createdAt: input.createdAt,
  };

  input.proposalStore.saveCampaignProposal(proposal);

  return proposal;
}

function inferCampaignSeason(trace: MetricsTrace): Campaign["season"] {
  return trace.question.toLowerCase().includes("secret santa") ? "secret-santa" : "fathers-day";
}

function validateCampaignProposal(campaign: Campaign, products: Product[]): string[] {
  const parsed = campaignSchema.safeParse(campaign);

  if (!parsed.success) {
    return parsed.error.issues.map((issue) => issue.message);
  }

  const validProductIds = new Set(products.map((product) => product.id));
  const errors = parsed.data.productIds
    .filter((productId) => !validProductIds.has(productId))
    .map((productId) => `Campaign references unknown product "${productId}".`);

  if (parsed.data.season === "secret-santa") {
    for (const product of findProductsOverPriceLimit(parsed.data.productIds, products, 50)) {
      errors.push(`Secret Santa campaign product "${product.name}" exceeds the £50 limit.`);
    }
  }

  return errors;
}
