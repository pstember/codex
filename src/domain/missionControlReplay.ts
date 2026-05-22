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
  isSelected: boolean;
};

export type MissionControlReplay = {
  completedCount: number;
  totalCount: number;
  nextAction: string;
  activeVersionName: string;
  selectedStep: MissionControlReplaySelectedStep;
  steps: MissionControlReplayStep[];
};

export type MissionControlReplaySelectedStep = {
  id: MissionControlReplayStep["id"];
  position: number;
  title: string;
  status: MissionControlReplayStatus;
  action: string;
  href: string;
  previousHref: string;
  nextHref: string;
};

export function buildMissionControlReplay(input: {
  traces: MetricsTrace[];
  proposals: CampaignProposal[];
  storefrontConfigs: GeneratedStorefrontConfig[];
  publishedVersions: PublishedStorefrontVersion[];
  activeVersionId: string | null;
  selectedStepId?: string | null;
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
  const selectedStepIndex = findSelectedStepIndex(replaySteps, input.selectedStepId);
  const selectedStep = replaySteps[selectedStepIndex];
  const previousStep = replaySteps[Math.max(selectedStepIndex - 1, 0)];
  const nextStep = replaySteps[Math.min(selectedStepIndex + 1, replaySteps.length - 1)];
  const stepsWithSelection = replaySteps.map((step) => ({
    ...step,
    isSelected: step.id === selectedStep.id,
  }));
  const completedCount = replaySteps.filter((step) => step.status === "complete").length;

  return {
    completedCount,
    totalCount: replaySteps.length,
    nextAction:
      completedCount === replaySteps.length
        ? "Replay is ready for Loom capture."
        : replaySteps.find((step) => step.status === "current")?.title || "Start the demo replay.",
    activeVersionName: activeVersion?.config.versionName ?? "Baseline Atlas & Co.",
    selectedStep: {
      id: selectedStep.id,
      position: selectedStepIndex + 1,
      title: selectedStep.title,
      status: selectedStep.status,
      action: `Open ${selectedStep.role}`,
      href: selectedStep.href,
      previousHref: homeReplayStepHref(previousStep.id),
      nextHref: homeReplayStepHref(nextStep.id),
    },
    steps: stepsWithSelection,
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
    isSelected: false,
  };
}

function homeReplayStepHref(stepId: MissionControlReplayStep["id"]): string {
  return `/?step=${stepId}`;
}

function findSelectedStepIndex(steps: MissionControlReplayStep[], selectedStepId?: string | null) {
  const requestedIndex = steps.findIndex((step) => step.id === selectedStepId);

  if (requestedIndex !== -1) {
    return requestedIndex;
  }

  const currentIndex = steps.findIndex((step) => step.status === "current");

  return Math.max(currentIndex, 0);
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
