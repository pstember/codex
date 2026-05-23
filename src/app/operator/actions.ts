"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/app/auth/session";
import { requirePermission } from "@/domain/auth";
import {
  proposeCampaignFromMetricsTrace,
  revampCampaignProposalForSeason,
} from "@/domain/operatorCampaign";
import { generateStorefrontConfigFromProposal } from "@/domain/storefrontGeneration";
import { publishStorefrontConfig, rollbackStorefrontVersion } from "@/domain/storefrontPublishing";
import { products } from "@/fixtures/products";
import { getCodexHarness } from "@/harness/codexHarness";
import { getAppDatabase } from "@/persistence/appDatabase";

export async function generateCampaignProposalAction(formData: FormData) {
  const user = await requireCurrentUser("approve_campaign");

  requirePermission(user, "approve_campaign");

  const traceId = String(formData.get("traceId") ?? "");
  const database = getAppDatabase();
  const sourceTrace = database.findMetricsTraceById(traceId);

  if (!sourceTrace) {
    throw new Error("Metrics Copilot trace was not found for this Operator handoff.");
  }

  const proposalId = randomUUID();

  await proposeCampaignFromMetricsTrace({
    id: proposalId,
    sourceTrace,
    harness: getCodexHarness(),
    products,
    createdByUserId: user.id,
    createdAt: new Date(),
    proposalStore: database,
  });

  revalidatePath("/operator");
  redirect(`/operator?proposal=${proposalId}`);
}

export async function generateStorefrontConfigAction(formData: FormData) {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const proposalId = String(formData.get("proposalId") ?? "");
  const database = getAppDatabase();
  const proposal = database.findCampaignProposalById(proposalId);

  if (!proposal) {
    throw new Error("Campaign proposal was not found for storefront config generation.");
  }

  const storefrontConfigId = randomUUID();

  await generateStorefrontConfigFromProposal({
    id: storefrontConfigId,
    proposal,
    harness: getCodexHarness(),
    products,
    createdByUserId: user.id,
    createdAt: new Date(),
    storefrontStore: database,
  });

  revalidatePath("/operator");
  redirect(`/operator?proposal=${proposalId}&storefront=${storefrontConfigId}`);
}

export async function revampSecretSantaProposalAction(formData: FormData) {
  const user = await requireCurrentUser("approve_campaign");

  requirePermission(user, "approve_campaign");

  const proposalId = String(formData.get("proposalId") ?? "");
  const database = getAppDatabase();
  const sourceProposal = database.findCampaignProposalById(proposalId);

  if (!sourceProposal) {
    throw new Error("Campaign proposal was not found for Secret Santa revamp.");
  }

  const revampedProposalId = randomUUID();

  await revampCampaignProposalForSeason({
    id: revampedProposalId,
    sourceProposal,
    season: "secret-santa",
    harness: getCodexHarness(),
    products,
    createdByUserId: user.id,
    createdAt: new Date(),
    proposalStore: database,
  });

  revalidatePath("/operator");
  redirect(`/operator?proposal=${revampedProposalId}`);
}

export async function publishStorefrontConfigAction(formData: FormData) {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const storefrontConfigId = String(formData.get("storefrontConfigId") ?? "");
  const database = getAppDatabase();
  const storefrontConfig = database.findStorefrontConfigById(storefrontConfigId);

  if (!storefrontConfig) {
    throw new Error("Storefront config was not found for publishing.");
  }

  const version = publishStorefrontConfig({
    id: randomUUID(),
    storefrontConfig,
    publishedByUserId: user.id,
    publishedAt: new Date(),
    publicationStore: database,
  });

  revalidatePath("/operator");
  revalidatePath("/");
  revalidatePath("/store");
  redirect(`/operator?storefront=${storefrontConfigId}&version=${version.id}`);
}

export async function rollbackStorefrontVersionAction(formData: FormData) {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const versionId = String(formData.get("versionId") ?? "");
  const database = getAppDatabase();
  const targetVersion = database.findPublishedStorefrontVersionById(versionId);

  if (!targetVersion) {
    throw new Error("Storefront version was not found for rollback.");
  }

  const rollbackVersion = rollbackStorefrontVersion({
    id: randomUUID(),
    targetVersion,
    rolledBackByUserId: user.id,
    rolledBackAt: new Date(),
    publicationStore: database,
  });

  revalidatePath("/operator");
  revalidatePath("/");
  revalidatePath("/store");
  redirect(`/operator?version=${rollbackVersion.id}`);
}
