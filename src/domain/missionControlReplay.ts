import type { MetricsTrace } from "@/domain/metricsTrace";
import type { CampaignProposal } from "@/domain/operatorCampaign";
import type { GeneratedStorefrontConfig } from "@/domain/storefrontGeneration";
import type { PublishedStorefrontVersion } from "@/domain/storefrontPublishing";

export type MissionControlReplayStatus = "complete" | "current" | "pending";

export type MissionControlReplayStep = {
  id:
    | "manager-insight"
    | "operator-proposal"
    | "fathers-day-publish"
    | "secret-santa-revamp"
    | "secret-santa-publish"
    | "guest-preview";
  role: "Store Manager" | "Store Operator" | "Guest";
  title: string;
  status: MissionControlReplayStatus;
  href: string;
};

export type MissionControlReplay = {
  completedCount: number;
  totalCount: number;
  nextAction: string;
  activeVersionName: string;
  steps: MissionControlReplayStep[];
};

export function buildMissionControlReplay(input: {
  traces: MetricsTrace[];
  proposals: CampaignProposal[];
  storefrontConfigs: GeneratedStorefrontConfig[];
  publishedVersions: PublishedStorefrontVersion[];
  activeVersionId: string | null;
}): MissionControlReplay {
  const fatherDayTrace = input.traces.find((trace) =>
    trace.question.toLowerCase().includes("father"),
  );
  const fatherDayProposal = input.proposals.find(
    (proposal) =>
      proposal.validationStatus === "valid" && proposal.campaign.season === "fathers-day",
  );
  const secretSantaProposal = input.proposals.find(
    (proposal) =>
      proposal.validationStatus === "valid" && proposal.campaign.season === "secret-santa",
  );
  const fatherDayVersion = findPublishedVersionForCampaign(input, "fathers-day-2026");
  const secretSantaVersion = findPublishedVersionForCampaign(input, "secret-santa-2026");
  const activeVersion =
    input.publishedVersions.find((version) => version.id === input.activeVersionId) ?? null;

  const steps = [
    replayStep({
      id: "manager-insight",
      role: "Store Manager",
      title: "Run Father’s Day metrics insight",
      isComplete: Boolean(fatherDayTrace),
      href: fatherDayTrace ? `/manager?run=${fatherDayTrace.id}` : "/manager",
    }),
    replayStep({
      id: "operator-proposal",
      role: "Store Operator",
      title: "Generate Father’s Day proposal",
      isComplete: Boolean(fatherDayProposal),
      href: fatherDayProposal ? `/operator?proposal=${fatherDayProposal.id}` : "/operator",
    }),
    replayStep({
      id: "fathers-day-publish",
      role: "Store Operator",
      title: "Publish Father’s Day storefront",
      isComplete: Boolean(fatherDayVersion),
      href: fatherDayVersion ? `/operator?version=${fatherDayVersion.id}` : "/operator",
    }),
    replayStep({
      id: "secret-santa-revamp",
      role: "Store Operator",
      title: "Revamp into Secret Santa under £50",
      isComplete: Boolean(secretSantaProposal),
      href: secretSantaProposal ? `/operator?proposal=${secretSantaProposal.id}` : "/operator",
    }),
    replayStep({
      id: "secret-santa-publish",
      role: "Store Operator",
      title: "Publish Secret Santa storefront",
      isComplete: Boolean(secretSantaVersion),
      href: secretSantaVersion ? `/operator?version=${secretSantaVersion.id}` : "/operator",
    }),
    replayStep({
      id: "guest-preview",
      role: "Guest",
      title: "Preview active Guest storefront",
      isComplete: activeVersion?.config.campaignId === "secret-santa-2026",
      href: activeVersion ? `/store?version=${activeVersion.id}` : "/store",
    }),
  ];
  const firstPendingIndex = steps.findIndex((step) => step.status === "pending");
  const replaySteps =
    firstPendingIndex === -1
      ? steps
      : steps.map((step, index) =>
          index === firstPendingIndex ? { ...step, status: "current" as const } : step,
        );
  const completedCount = replaySteps.filter((step) => step.status === "complete").length;

  return {
    completedCount,
    totalCount: replaySteps.length,
    nextAction:
      completedCount === replaySteps.length
        ? "Replay is ready for Loom capture."
        : replaySteps.find((step) => step.status === "current")?.title || "Start the demo replay.",
    activeVersionName: activeVersion?.config.versionName ?? "Baseline Atlas & Co.",
    steps: replaySteps,
  };
}

function replayStep(input: {
  id: MissionControlReplayStep["id"];
  role: MissionControlReplayStep["role"];
  title: string;
  isComplete: boolean;
  href: string;
}): MissionControlReplayStep {
  return {
    id: input.id,
    role: input.role,
    title: input.title,
    status: input.isComplete ? "complete" : "pending",
    href: input.href,
  };
}

function findPublishedVersionForCampaign(
  input: {
    storefrontConfigs: GeneratedStorefrontConfig[];
    publishedVersions: PublishedStorefrontVersion[];
  },
  campaignId: string,
): PublishedStorefrontVersion | null {
  const configIds = new Set(
    input.storefrontConfigs
      .filter(
        (config) => config.validationStatus === "valid" && config.config.campaignId === campaignId,
      )
      .map((config) => config.id),
  );

  return (
    input.publishedVersions.find((version) => configIds.has(version.sourceStorefrontConfigId)) ??
    null
  );
}
