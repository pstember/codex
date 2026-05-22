import { describe, expect, it } from "vitest";
import type { GeneratedStorefrontConfig } from "@/domain/storefrontGeneration";
import { publishStorefrontConfig, rollbackStorefrontVersion } from "@/domain/storefrontPublishing";
import { fatherDayStorefront } from "@/fixtures/storefront";

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
