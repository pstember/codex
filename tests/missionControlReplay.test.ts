import { describe, expect, it } from "vitest";
import { buildMissionControlReplay } from "@/domain/missionControlReplay";
import { fatherDayCampaign, secretSantaCampaign } from "@/fixtures/campaigns";
import { fatherDayStorefront, secretSantaStorefront } from "@/fixtures/storefront";

describe("Mission Control replay", () => {
  it("starts on the Manager insight when no replay artifacts exist", () => {
    const replay = buildMissionControlReplay({
      traces: [],
      proposals: [],
      storefrontConfigs: [],
      publishedVersions: [],
      activeVersionId: null,
    });

    expect(replay).toMatchObject({
      completedCount: 0,
      totalCount: 6,
      nextAction: "Run Father’s Day metrics insight",
      activeVersionName: "Baseline Atlas & Co.",
    });
    expect(replay.steps.map((step) => step.status)).toEqual([
      "current",
      "pending",
      "pending",
      "pending",
      "pending",
      "pending",
    ]);
    expect(replay.steps[0]).toMatchObject({
      id: "manager-insight",
      href: "/manager",
    });
  });

  it("advances the current action after the Manager insight is saved", () => {
    const replay = buildMissionControlReplay({
      traces: [fatherDayTrace],
      proposals: [],
      storefrontConfigs: [],
      publishedVersions: [],
      activeVersionId: null,
    });

    expect(replay.nextAction).toBe("Generate Father’s Day proposal");
    expect(replay.selectedStep).toMatchObject({
      id: "operator-proposal",
      title: "Generate Father’s Day proposal",
      status: "current",
    });
    expect(replay.steps.map((step) => step.status)).toEqual([
      "complete",
      "current",
      "pending",
      "pending",
      "pending",
      "pending",
    ]);
    expect(replay.steps[0].href).toBe("/manager?run=trace-1");
    expect(replay.steps[1].href).toBe("/operator");
  });

  it("marks replay milestones complete and names the next action from workflow artifacts", () => {
    const replay = buildMissionControlReplay({
      traces: [fatherDayTrace],
      proposals: [
        {
          id: "proposal-fathers-day",
          sourceTraceId: "trace-1",
          campaign: fatherDayCampaign,
          validationStatus: "valid",
          validationErrors: [],
          createdByUserId: "demo-operator",
          createdAt: new Date("2026-05-22T11:00:00.000Z"),
        },
        {
          id: "proposal-secret-santa",
          sourceTraceId: "trace-1",
          campaign: secretSantaCampaign,
          validationStatus: "valid",
          validationErrors: [],
          createdByUserId: "demo-operator",
          createdAt: new Date("2026-05-22T12:00:00.000Z"),
        },
      ],
      storefrontConfigs: [
        {
          id: "storefront-fathers-day",
          sourceProposalId: "proposal-fathers-day",
          config: fatherDayStorefront,
          validationStatus: "valid",
          validationErrors: [],
          createdByUserId: "demo-operator",
          createdAt: new Date("2026-05-22T11:30:00.000Z"),
        },
        {
          id: "storefront-secret-santa",
          sourceProposalId: "proposal-secret-santa",
          config: secretSantaStorefront,
          validationStatus: "valid",
          validationErrors: [],
          createdByUserId: "demo-operator",
          createdAt: new Date("2026-05-22T12:30:00.000Z"),
        },
      ],
      publishedVersions: [
        {
          id: "version-fathers-day",
          sourceStorefrontConfigId: "storefront-fathers-day",
          config: fatherDayStorefront,
          status: "inactive",
          rollbackOfVersionId: null,
          publishedByUserId: "demo-operator",
          publishedAt: new Date("2026-05-22T11:45:00.000Z"),
        },
        {
          id: "version-secret-santa",
          sourceStorefrontConfigId: "storefront-secret-santa",
          config: secretSantaStorefront,
          status: "active",
          rollbackOfVersionId: null,
          publishedByUserId: "demo-operator",
          publishedAt: new Date("2026-05-22T12:45:00.000Z"),
        },
      ],
      activeVersionId: "version-secret-santa",
    });

    expect(replay).toMatchObject({
      completedCount: 6,
      totalCount: 6,
      nextAction: "Replay is ready for Loom capture.",
      activeVersionName: "Secret Santa",
      steps: [
        {
          id: "manager-insight",
          status: "complete",
          role: "Store Manager",
          title: "Run Father’s Day metrics insight",
          href: "/manager?run=trace-1",
        },
        {
          id: "operator-proposal",
          status: "complete",
          role: "Store Operator",
          title: "Generate Father’s Day proposal",
          href: "/operator?proposal=proposal-fathers-day",
        },
        {
          id: "fathers-day-publish",
          status: "complete",
          title: "Publish Father’s Day storefront",
          href: "/operator?version=version-fathers-day",
        },
        {
          id: "secret-santa-revamp",
          status: "complete",
          title: "Revamp into Secret Santa under £50",
          href: "/operator?proposal=proposal-secret-santa",
        },
        {
          id: "secret-santa-publish",
          status: "complete",
          title: "Publish Secret Santa storefront",
          href: "/operator?version=version-secret-santa",
        },
        {
          id: "guest-preview",
          status: "complete",
          role: "Guest",
          title: "Preview active Guest storefront",
          href: "/store?version=version-secret-santa",
        },
      ],
    });
  });

  it("selects a replay step and clamps previous and next controls at the ends", () => {
    const replay = buildMissionControlReplay({
      traces: [fatherDayTrace],
      proposals: [],
      storefrontConfigs: [],
      publishedVersions: [],
      activeVersionId: null,
      selectedStepId: "operator-proposal",
    });

    expect(replay.selectedStep).toMatchObject({
      id: "operator-proposal",
      position: 2,
      title: "Generate Father’s Day proposal",
      status: "current",
      action: "Open Store Operator",
      href: "/operator",
      previousHref: "/?step=manager-insight",
      nextHref: "/?step=fathers-day-publish",
    });

    expect(
      buildMissionControlReplay({
        traces: [],
        proposals: [],
        storefrontConfigs: [],
        publishedVersions: [],
        activeVersionId: null,
        selectedStepId: "manager-insight",
      }).selectedStep.previousHref,
    ).toBe("/?step=manager-insight");

    expect(
      buildMissionControlReplay({
        traces: [fatherDayTrace],
        proposals: [],
        storefrontConfigs: [],
        publishedVersions: [],
        activeVersionId: null,
        selectedStepId: "guest-preview",
      }).selectedStep.nextHref,
    ).toBe("/?step=guest-preview");
  });

  it("builds a capture frame from the selected replay step and active storefront", () => {
    const replay = buildMissionControlReplay({
      traces: [fatherDayTrace],
      proposals: [],
      storefrontConfigs: [],
      publishedVersions: [],
      activeVersionId: null,
      selectedStepId: "operator-proposal",
    });

    expect(replay.captureFrame).toEqual({
      eyebrow: "Capture frame",
      stepLabel: "Step 2 of 6",
      statusLabel: "Current",
      storefrontName: "Baseline Atlas & Co.",
      role: "Store Operator",
      title: "Generate Father’s Day proposal",
      body: "Turn the approved Manager insight into a fixture-backed campaign proposal.",
      primaryAction: {
        label: "Open Store Operator",
        href: "/operator",
      },
      roleLinks: [
        { label: "Manager", href: "/manager" },
        { label: "Operator", href: "/operator" },
        { label: "Guest", href: "/store" },
      ],
    });
  });

  it("builds stable Loom capture checklist links from replay state", () => {
    const replay = buildMissionControlReplay({
      traces: [fatherDayTrace],
      proposals: [],
      storefrontConfigs: [],
      publishedVersions: [],
      activeVersionId: null,
      selectedStepId: "operator-proposal",
    });

    expect(replay.captureChecklist).toEqual([
      {
        label: "Opening frame",
        href: "/?step=operator-proposal",
        detail: "Show Mission Control with the current replay step selected.",
      },
      {
        label: "Manager trace",
        href: "/manager?run=trace-1",
        detail: "Open the saved metrics run and validated GraphQL trace.",
      },
      {
        label: "Operator workspace",
        href: "/operator",
        detail: "Generate and approve the campaign proposal from the handoff.",
      },
      {
        label: "Time Machine",
        href: "/operator",
        detail: "Publish versions and compare baseline, Father’s Day, and Secret Santa.",
      },
      {
        label: "Guest close",
        href: "/store",
        detail: "End on the active storefront preview.",
      },
    ]);
  });
});

const fatherDayTrace = {
  id: "trace-1",
  question: "What should we promote for Father’s Day based on margin, inventory, and conversion?",
  operationName: "FatherDayPromotionCandidates",
  validationStatus: "valid" as const,
  validationErrors: [],
  generatedGraphql: "query FatherDayPromotionCandidates { products { id } }",
  rationale: "Rank Father’s Day products.",
  chartType: "productTable" as const,
  recommendedProductIds: ["portable-charcoal-grill"],
  createdByUserId: "demo-manager",
  createdAt: new Date("2026-05-22T10:00:00.000Z"),
};
