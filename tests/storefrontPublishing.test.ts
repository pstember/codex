import { describe, expect, it } from "vitest";
import type { StorefrontConfig } from "@/domain/storefront";
import type { GeneratedStorefrontConfig } from "@/domain/storefrontDraft";
import {
  buildStaffStorefrontVersionSelection,
  buildStorefrontGalleryEntries,
  compareStorefrontVersions,
  publishBaselineStorefront,
  publishStorefrontConfig,
  resolveGuestStorefrontSelection,
  resolveStaffStorefrontPreview,
  rollbackStorefrontVersion,
} from "@/domain/storefrontPublishing";
import {
  baselineStorefront,
  fatherDayStorefront,
  secretSantaStorefront,
} from "@/fixtures/storefront";

describe("storefront publishing", () => {
  it("publishes a ready generated config as the active Guest storefront version", () => {
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

  it("rejects drafts that are not ready before they can be published", () => {
    expect(() =>
      publishStorefrontConfig({
        id: "version-invalid",
        storefrontConfig: {
          ...fatherDayGeneratedConfig,
          validationStatus: "draft",
        },
        publishedByUserId: "demo-operator",
        publishedAt: new Date("2026-05-22T15:00:00.000Z"),
        publicationStore: {
          savePublishedStorefrontVersion() {},
        },
      }),
    ).toThrow("Only ready storefront configs can be published.");
  });

  it("blocks invalid drafts from being marked publishable in gallery entries", () => {
    expect(
      buildStorefrontGalleryEntries({
        drafts: [
          {
            ...fatherDayGeneratedConfig,
            validationStatus: "invalid",
            validationErrors: ["Broken palette."],
          },
        ],
        activeVersion: null,
        baseline: baselineStorefront,
      }),
    ).toMatchObject([
      {
        id: "basic",
        canPublish: true,
      },
      {
        id: "storefront-draft-1",
        validationStatus: "invalid",
        canPublish: false,
      },
    ]);
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
      heroChange: {
        beforeTitle: "Curated goods for useful everyday rituals.",
        afterTitle: "Secret Santa gifts under £50 that do not feel last-minute.",
        beforeBody: "Home, travel, coffee, grooming, and giftable essentials from Atlas & Co.",
        afterBody: "Playful, useful, and easy-to-ship picks for office gift exchanges.",
      },
      visualAssetChange: {
        beforePrompt:
          "Bright Atlas & Co. tabletop hero with coffee, desk, and travel essentials in a clean everyday retail style.",
        afterPrompt: "Playful office Secret Santa gifting.",
        beforePath: "/static-assets/basic-hero.svg",
        afterPath: "/static-assets/secret-santa-hero.svg",
      },
      textChanges: [
        {
          label: "Selection name",
          before: "Baseline Atlas & Co.",
          after: "Secret Santa",
        },
        {
          label: "Hero title",
          before: "Curated goods for useful everyday rituals.",
          after: "Secret Santa gifts under £50 that do not feel last-minute.",
        },
        {
          label: "Hero copy",
          before: "Home, travel, coffee, grooming, and giftable essentials from Atlas & Co.",
          after: "Playful, useful, and easy-to-ship picks for office gift exchanges.",
        },
        {
          label: "Hero visual prompt",
          before:
            "Bright Atlas & Co. tabletop hero with coffee, desk, and travel essentials in a clean everyday retail style.",
          after: "Playful office Secret Santa gifting.",
        },
        {
          label: "Image alt text",
          before:
            "A bright Atlas & Co. tabletop scene with coffee gear, a desk lamp, and everyday gift essentials.",
          after: "A festive desk scene with wrapped small gifts from Atlas & Co.",
        },
        {
          label: "Current offer title",
          before: "Useful gifts, ready now",
          after: "Safe bets under £50",
        },
        {
          label: "Current offer copy",
          before: "A current edit of high-stock everyday gifts with practical appeal.",
          after:
            "A current offer built from affordable products with practical workplace gift appeal.",
        },
        {
          label: "Spotlight title",
          before: "Spotlight on better coffee breaks",
          after: "Spotlight: Pour-Over Coffee Set",
        },
        {
          label: "Spotlight copy",
          before:
            "The Pour-Over Coffee Set leads the baseline shop because it is giftable, replenishable, and easy to explain.",
          after:
            "A compact coffee gift that feels considered, useful, and safely inside the under-£50 brief.",
        },
      ],
      strategicSummary: [
        "Campaign shifted from Baseline Atlas & Co. to Secret Santa.",
        "Hero moved from everyday curation to under-£50 office gifting.",
        "Creative asset changed from /static-assets/basic-hero.svg to /static-assets/secret-santa-hero.svg.",
      ],
      styleChanges: [
        {
          label: "Theme",
          before: "basic",
          after: "holiday",
        },
        {
          label: "Accent color",
          before: "#2563eb",
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
          "Spotlight: Pour-Over Coffee Set",
        ],
        removed: [
          "Curated goods for useful everyday rituals.",
          "Useful gifts, ready now",
          "Spotlight on better coffee breaks",
        ],
        unchanged: [],
      },
      productChanges: {
        added: ["cast-iron-grill-press", "travel-grooming-kit"],
        removed: ["desk-organizer-tray"],
        unchanged: ["pour-over-coffee-set", "wireless-charging-valet"],
      },
    });
  });

  it("explains the Father’s Day to Secret Santa revamp for Time Machine review", () => {
    expect(
      compareStorefrontVersions({
        base: fatherDayStorefront,
        selected: secretSantaStorefront,
      }),
    ).toMatchObject({
      baseVersionName: "Father’s Day",
      selectedVersionName: "Secret Santa",
      campaignChanged: true,
      heroChange: {
        beforeTitle: "Father’s Day gifts for grill masters, travelers, and everyday fixers.",
        afterTitle: "Secret Santa gifts under £50 that do not feel last-minute.",
      },
      visualAssetChange: {
        beforePrompt: "Warm outdoor Father’s Day gifting scene.",
        afterPrompt: "Playful office Secret Santa gifting.",
        beforePath: "/static-assets/fathers-day-hero.svg",
        afterPath: "/static-assets/secret-santa-hero.svg",
      },
      strategicSummary: [
        "Campaign shifted from Father’s Day to Secret Santa.",
        "Hero moved from grill, travel, and everyday carry gifting to under-£50 office gifting.",
        "Creative asset changed from /static-assets/fathers-day-hero.svg to /static-assets/secret-santa-hero.svg.",
      ],
      sectionChanges: {
        added: [
          "Secret Santa gifts under £50 that do not feel last-minute.",
          "Safe bets under £50",
          "Spotlight: Pour-Over Coffee Set",
        ],
        removed: [
          "Father’s Day gifts for grill masters, travelers, and everyday fixers.",
          "Build the weekend-ready bundle",
          "Spotlight: Portable Charcoal Grill",
        ],
      },
      productChanges: {
        added: ["cast-iron-grill-press", "pour-over-coffee-set"],
        removed: ["leather-weekender-bag", "portable-charcoal-grill"],
      },
    });
  });

  it("summarizes unchanged versions without inventing hero or creative changes", () => {
    expect(
      compareStorefrontVersions({
        base: fatherDayStorefront,
        selected: fatherDayStorefront,
      }).strategicSummary,
    ).toEqual(["Campaign stayed on Father’s Day."]);
  });

  it("resolves an explicit Guest storefront version even when it is inactive", () => {
    const activeVersion = publishedVersion({
      id: "version-2",
      config: secretSantaStorefront,
      status: "active",
    });
    const inactiveVersion = publishedVersion({
      id: "version-1",
      config: fatherDayStorefront,
      status: "inactive",
      publishedAt: new Date("2026-05-22T15:00:00.000Z"),
    });

    const selected = resolveGuestStorefrontSelection({
      requestedVersionId: "version-1",
      activeVersion,
      publishedVersions: [activeVersion, inactiveVersion],
      baseline: baselineStorefront,
    });

    expect(selected).toMatchObject({
      storefront: fatherDayStorefront,
      selectedVersionId: "version-1",
      activeVersionId: "version-2",
      statusLabel: "Previewing inactive version",
      options: [
        { id: "baseline", label: "Baseline Atlas & Co.", status: "baseline" },
        { id: "version-2", label: "Secret Santa", status: "active" },
        { id: "version-1", label: "Father’s Day", status: "inactive" },
      ],
    });
  });

  it("defaults the Guest storefront to the active version and falls back from unknown ids", () => {
    const activeVersion = publishedVersion({
      id: "version-2",
      config: secretSantaStorefront,
      status: "active",
    });
    const inactiveVersion = publishedVersion({
      id: "version-1",
      config: fatherDayStorefront,
      status: "inactive",
    });

    expect(
      resolveGuestStorefrontSelection({
        activeVersion,
        publishedVersions: [activeVersion, inactiveVersion],
        baseline: baselineStorefront,
      }),
    ).toMatchObject({
      storefront: secretSantaStorefront,
      selectedVersionId: "version-2",
      statusLabel: "Viewing current version",
    });
    expect(
      resolveGuestStorefrontSelection({
        requestedVersionId: "missing-version",
        activeVersion,
        publishedVersions: [activeVersion, inactiveVersion],
        baseline: baselineStorefront,
      }),
    ).toMatchObject({
      storefront: secretSantaStorefront,
      selectedVersionId: "version-2",
      statusLabel: "Viewing current version",
    });
  });

  it("lets Guests explicitly preview the baseline storefront", () => {
    const activeVersion = publishedVersion({
      id: "version-2",
      config: secretSantaStorefront,
      status: "active",
    });

    expect(
      resolveGuestStorefrontSelection({
        requestedVersionId: "baseline",
        activeVersion,
        publishedVersions: [activeVersion],
        baseline: baselineStorefront,
      }),
    ).toMatchObject({
      storefront: baselineStorefront,
      selectedVersionId: "baseline",
      activeVersionId: "version-2",
      statusLabel: "Previewing baseline",
    });
  });

  it("always places a non-deletable Basic Atlas & Co. entry first in the style gallery", () => {
    expect(
      buildStorefrontGalleryEntries({
        drafts: [fatherDayGeneratedConfig],
        activeVersion: publishedVersion({
          id: "version-1",
          config: fatherDayStorefront,
          status: "active",
        }),
        baseline: baselineStorefront,
        previewStorefrontId: "basic",
      }),
    ).toMatchObject([
      {
        id: "basic",
        versionName: "Basic Atlas & Co.",
        kind: "basic",
        canDelete: false,
        canPublish: true,
        isPreviewing: true,
        isLive: false,
        config: {
          versionName: "Baseline Atlas & Co.",
        },
      },
      {
        id: "storefront-draft-1",
        versionName: "Father’s Day",
        kind: "draft",
        canDelete: true,
        validationStatus: "ready",
        canPublish: true,
        isPreviewing: false,
        isLive: true,
      },
    ]);
  });

  it("builds homepage staff controls from gallery entries and marks the live version as current", () => {
    const galleryEntries = buildStorefrontGalleryEntries({
      drafts: [fatherDayGeneratedConfig],
      activeVersion: publishedVersion({
        id: "version-1",
        config: fatherDayStorefront,
        status: "active",
      }),
      baseline: baselineStorefront,
      previewStorefrontId: null,
    });

    expect(
      buildStaffStorefrontVersionSelection({
        galleryEntries,
        previewStorefrontId: null,
      }),
    ).toEqual({
      selectedEntryId: "storefront-draft-1",
      selectedEntryVersionName: "Father’s Day",
      options: [
        { id: "basic", label: "Basic Atlas & Co.", status: "basic" },
        { id: "storefront-draft-1", label: "Father’s Day", status: "current" },
      ],
      previewActionLabel: "Preview",
      applyActionLabel: "Current",
      isApplyDisabled: true,
    });
  });

  it("publishes the basic storefront as a new active version for everyone", () => {
    const savedVersions: unknown[] = [];

    const version = publishBaselineStorefront({
      id: "version-basic",
      baseline: baselineStorefront,
      publishedByUserId: "demo-operator",
      publishedAt: new Date("2026-05-24T10:00:00.000Z"),
      publicationStore: {
        savePublishedStorefrontVersion(savedVersion) {
          savedVersions.push(savedVersion);
        },
      },
    });

    expect(version).toEqual({
      id: "version-basic",
      sourceStorefrontConfigId: "basic",
      config: {
        ...baselineStorefront,
        versionName: "Basic Atlas & Co.",
      },
      status: "active",
      rollbackOfVersionId: null,
      publishedByUserId: "demo-operator",
      publishedAt: new Date("2026-05-24T10:00:00.000Z"),
    });
    expect(savedVersions).toEqual([version]);
  });

  it("resolves a staff preview without changing the Guest active storefront", () => {
    const activeVersion = publishedVersion({
      id: "version-1",
      config: fatherDayStorefront,
      status: "active",
    });

    const preview = resolveStaffStorefrontPreview({
      previewStorefrontId: "basic",
      drafts: [fatherDayGeneratedConfig],
      activeVersion,
      publishedVersions: [activeVersion],
      baseline: baselineStorefront,
    });

    expect(preview).toMatchObject({
      storefront: {
        versionName: "Basic Atlas & Co.",
      },
      previewStorefrontId: "basic",
      isPreviewing: true,
      label: "You are previewing Basic Atlas & Co.",
    });
    expect(
      resolveGuestStorefrontSelection({
        activeVersion,
        publishedVersions: [activeVersion],
        baseline: baselineStorefront,
      }).storefront,
    ).toBe(fatherDayStorefront);
  });

  it("resolves staff draft previews, current published previews, and unknown preview ids", () => {
    const activeVersion = publishedVersion({
      id: "version-1",
      config: fatherDayStorefront,
      status: "active",
    });

    expect(
      resolveStaffStorefrontPreview({
        previewStorefrontId: "storefront-draft-1",
        drafts: [fatherDayGeneratedConfig],
        activeVersion,
        publishedVersions: [activeVersion],
        baseline: baselineStorefront,
      }),
    ).toMatchObject({
      storefront: fatherDayStorefront,
      previewStorefrontId: "storefront-draft-1",
      isPreviewing: true,
      label: "You are previewing Father’s Day",
    });

    expect(
      resolveStaffStorefrontPreview({
        previewStorefrontId: "version-1",
        drafts: [],
        activeVersion,
        publishedVersions: [activeVersion],
        baseline: baselineStorefront,
      }),
    ).toMatchObject({
      storefront: fatherDayStorefront,
      previewStorefrontId: "version-1",
      isPreviewing: false,
      label: null,
    });

    expect(
      resolveStaffStorefrontPreview({
        previewStorefrontId: "missing-preview",
        drafts: [],
        activeVersion,
        publishedVersions: [activeVersion],
        baseline: baselineStorefront,
      }),
    ).toMatchObject({
      storefront: fatherDayStorefront,
      previewStorefrontId: null,
      isPreviewing: false,
      label: null,
    });
  });
});

const fatherDayGeneratedConfig: GeneratedStorefrontConfig = {
  id: "storefront-draft-1",
  sourceDraftKey: "adaptation:summer-hosting",
  config: fatherDayStorefront,
  validationStatus: "ready",
  validationErrors: [],
  createdByUserId: "demo-operator",
  createdAt: new Date("2026-05-22T14:00:00.000Z"),
};

function publishedVersion({
  id,
  config,
  status,
  publishedAt = new Date("2026-05-22T16:00:00.000Z"),
}: {
  id: string;
  config: StorefrontConfig;
  status: "active" | "inactive";
  publishedAt?: Date;
}) {
  return {
    id,
    sourceStorefrontConfigId:
      config.campaignId === "secret-santa-2026" ? "storefront-draft-2" : "storefront-draft-1",
    config,
    status,
    rollbackOfVersionId: null,
    publishedByUserId: "demo-operator",
    publishedAt,
  };
}
