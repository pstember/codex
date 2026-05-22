import { describe, expect, it } from "vitest";
import type { GeneratedStorefrontConfig } from "@/domain/storefrontGeneration";
import {
  compareStorefrontVersions,
  publishStorefrontConfig,
  rollbackStorefrontVersion,
} from "@/domain/storefrontPublishing";
import {
  baselineStorefront,
  fatherDayStorefront,
  secretSantaStorefront,
} from "@/fixtures/storefront";

describe("storefront publishing", () => {
  it("publishes a valid generated config as the active Guest storefront version", () => {
    const savedVersions: unknown[] = [];

    const version = publishStorefrontConfig({
      id: "version-1",
      storefrontConfig: fatherDayGeneratedConfig,
      publishedByUserId: "demo-operator",
      publishedAt: new Date("2026-05-22T15:00:00.000Z"),
      publicationStore: {
        savePublishedStorefrontVersion(savedVersion) {
          savedVersions.push(savedVersion);
        },
      },
    });

    expect(version).toEqual({
      id: "version-1",
      sourceStorefrontConfigId: "storefront-draft-1",
      config: fatherDayStorefront,
      status: "active",
      rollbackOfVersionId: null,
      publishedByUserId: "demo-operator",
      publishedAt: new Date("2026-05-22T15:00:00.000Z"),
    });
    expect(savedVersions).toEqual([version]);
  });

  it("rejects invalid generated configs before they can be published", () => {
    expect(() =>
      publishStorefrontConfig({
        id: "version-invalid",
        storefrontConfig: {
          ...fatherDayGeneratedConfig,
          validationStatus: "invalid",
          validationErrors: ["Storefront section references unknown product."],
        },
        publishedByUserId: "demo-operator",
        publishedAt: new Date("2026-05-22T15:00:00.000Z"),
        publicationStore: {
          savePublishedStorefrontVersion() {},
        },
      }),
    ).toThrow("Only valid storefront configs can be published.");
  });

  it("rolls back by creating a new active version from a prior published version", () => {
    const savedVersions: unknown[] = [];

    const version = rollbackStorefrontVersion({
      id: "version-rollback-1",
      targetVersion: {
        id: "version-1",
        sourceStorefrontConfigId: "storefront-draft-1",
        config: fatherDayStorefront,
        status: "inactive",
        rollbackOfVersionId: null,
        publishedByUserId: "demo-operator",
        publishedAt: new Date("2026-05-22T15:00:00.000Z"),
      },
      rolledBackByUserId: "demo-operator",
      rolledBackAt: new Date("2026-05-22T16:00:00.000Z"),
      publicationStore: {
        savePublishedStorefrontVersion(savedVersion) {
          savedVersions.push(savedVersion);
        },
      },
    });

    expect(version).toMatchObject({
      id: "version-rollback-1",
      sourceStorefrontConfigId: "storefront-draft-1",
      config: fatherDayStorefront,
      status: "active",
      rollbackOfVersionId: "version-1",
      publishedByUserId: "demo-operator",
      publishedAt: new Date("2026-05-22T16:00:00.000Z"),
    });
    expect(savedVersions).toEqual([version]);
  });

  it("compares a selected storefront version with another version for Time Machine review", () => {
    expect(
      compareStorefrontVersions({
        base: baselineStorefront,
        selected: secretSantaStorefront,
      }),
    ).toEqual({
      baseVersionName: "Baseline Atlas & Co.",
      selectedVersionName: "Secret Santa",
      campaignChanged: true,
      styleChanges: [
        {
          label: "Theme",
          before: "heritage",
          after: "holiday",
        },
        {
          label: "Accent color",
          before: "#0f766e",
          after: "#be123c",
        },
        {
          label: "Density",
          before: "comfortable",
          after: "compact",
        },
      ],
      sectionChanges: {
        added: [
          "Secret Santa gifts under £50 that do not feel last-minute.",
          "Safe bets under £50",
        ],
        removed: ["Curated goods for useful everyday rituals.", "Popular this week"],
        unchanged: [],
      },
      productChanges: {
        added: ["cast-iron-grill-press", "travel-grooming-kit"],
        removed: [],
        unchanged: ["desk-organizer-tray", "pour-over-coffee-set", "wireless-charging-valet"],
      },
    });
  });
});

const fatherDayGeneratedConfig: GeneratedStorefrontConfig = {
  id: "storefront-draft-1",
  sourceProposalId: "proposal-1",
  config: fatherDayStorefront,
  validationStatus: "valid",
  validationErrors: [],
  createdByUserId: "demo-operator",
  createdAt: new Date("2026-05-22T14:00:00.000Z"),
};
