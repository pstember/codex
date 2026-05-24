import {
  getHeroSection,
  getStorefrontSectionLabel,
  type StorefrontConfig,
} from "@/domain/storefront";
import type { GeneratedStorefrontConfig } from "@/domain/storefrontDraft";

export type StorefrontVersionStatus = "active" | "inactive";

export interface PublishedStorefrontVersion {
  id: string;
  sourceStorefrontConfigId: string;
  config: StorefrontConfig;
  status: StorefrontVersionStatus;
  rollbackOfVersionId: string | null;
  publishedByUserId: string;
  publishedAt: Date;
}

export interface StorefrontPublicationStore {
  savePublishedStorefrontVersion(version: PublishedStorefrontVersion): void;
}

export interface StorefrontVersionComparison {
  baseVersionName: string;
  selectedVersionName: string;
  campaignChanged: boolean;
  heroChange: {
    beforeTitle: string;
    afterTitle: string;
    beforeBody: string;
    afterBody: string;
  };
  visualAssetChange: {
    beforePrompt: string;
    afterPrompt: string;
    beforePath: string;
    afterPath: string;
  };
  textChanges: Array<{
    label: string;
    before: string;
    after: string;
  }>;
  strategicSummary: string[];
  styleChanges: Array<{
    label: string;
    before: string;
    after: string;
  }>;
  sectionChanges: {
    added: string[];
    removed: string[];
    unchanged: string[];
  };
  productChanges: {
    added: string[];
    removed: string[];
    unchanged: string[];
  };
}

export interface GuestStorefrontSelection {
  storefront: StorefrontConfig;
  selectedVersionId: string;
  activeVersionId: string | null;
  statusLabel: string;
  options: Array<{
    id: string;
    label: string;
    status: "baseline" | StorefrontVersionStatus;
  }>;
}

export interface StorefrontGalleryEntry {
  id: string;
  versionName: string;
  kind: "basic" | "draft";
  config: StorefrontConfig;
  validationStatus: "draft" | "ready" | "invalid";
  validationErrors: string[];
  createdAtLabel: string;
  canDelete: boolean;
  canPublish: boolean;
  isPreviewing: boolean;
  isLive: boolean;
  sourceDraftKey: string;
}

export interface StaffStorefrontPreview {
  storefront: StorefrontConfig;
  previewStorefrontId: string | null;
  isPreviewing: boolean;
  label: string | null;
}

export interface StaffStorefrontVersionSelection {
  selectedEntryId: string;
  selectedEntryVersionName: string;
  options: Array<{
    id: string;
    label: string;
    status: "basic" | "draft" | "current" | "previewing";
  }>;
  previewActionLabel: "Preview";
  applyActionLabel: "Apply" | "Current";
  isApplyDisabled: boolean;
}

export const basicStorefrontId = "basic";
export const basicStorefrontVersionName = "Basic Atlas & Co.";

export function publishStorefrontConfig({
  id,
  storefrontConfig,
  publishedByUserId,
  publishedAt,
  publicationStore,
}: {
  id: string;
  storefrontConfig: GeneratedStorefrontConfig;
  publishedByUserId: string;
  publishedAt: Date;
  publicationStore: StorefrontPublicationStore;
}): PublishedStorefrontVersion {
  if (storefrontConfig.validationStatus !== "ready") {
    throw new Error("Only ready storefront configs can be published.");
  }

  const version: PublishedStorefrontVersion = {
    id,
    sourceStorefrontConfigId: storefrontConfig.id,
    config: storefrontConfig.config,
    status: "active",
    rollbackOfVersionId: null,
    publishedByUserId,
    publishedAt,
  };

  publicationStore.savePublishedStorefrontVersion(version);

  return version;
}

export function publishBaselineStorefront({
  id,
  baseline,
  publishedByUserId,
  publishedAt,
  publicationStore,
}: {
  id: string;
  baseline: StorefrontConfig;
  publishedByUserId: string;
  publishedAt: Date;
  publicationStore: StorefrontPublicationStore;
}): PublishedStorefrontVersion {
  const version: PublishedStorefrontVersion = {
    id,
    sourceStorefrontConfigId: basicStorefrontId,
    config: toBasicStorefrontConfig(baseline),
    status: "active",
    rollbackOfVersionId: null,
    publishedByUserId,
    publishedAt,
  };

  publicationStore.savePublishedStorefrontVersion(version);

  return version;
}

export function buildStorefrontGalleryEntries({
  drafts,
  activeVersion,
  baseline,
  previewStorefrontId = null,
}: {
  drafts: GeneratedStorefrontConfig[];
  activeVersion: PublishedStorefrontVersion | null;
  baseline: StorefrontConfig;
  previewStorefrontId?: string | null;
}): StorefrontGalleryEntry[] {
  return [
    {
      id: basicStorefrontId,
      versionName: basicStorefrontVersionName,
      kind: "basic",
      config: baseline,
      validationStatus: "ready",
      validationErrors: [],
      createdAtLabel: "Always available",
      canDelete: false,
      canPublish: true,
      isPreviewing: previewStorefrontId === basicStorefrontId,
      isLive: activeVersion?.sourceStorefrontConfigId === basicStorefrontId,
      sourceDraftKey: "baseline",
    },
    ...drafts.map((draft) => ({
      id: draft.id,
      versionName: draft.config.versionName,
      kind: "draft" as const,
      config: draft.config,
      validationStatus: draft.validationStatus,
      validationErrors: draft.validationErrors,
      createdAtLabel: draft.createdAt.toLocaleString("en-GB"),
      canDelete: true,
      canPublish: draft.validationStatus === "ready",
      isPreviewing: previewStorefrontId === draft.id,
      isLive: activeVersion?.sourceStorefrontConfigId === draft.id,
      sourceDraftKey: draft.sourceDraftKey,
    })),
  ];
}

export function resolveStaffStorefrontPreview({
  previewStorefrontId,
  drafts,
  activeVersion,
  publishedVersions,
  baseline,
}: {
  previewStorefrontId?: string | null;
  drafts: GeneratedStorefrontConfig[];
  activeVersion: PublishedStorefrontVersion | null;
  publishedVersions: PublishedStorefrontVersion[];
  baseline: StorefrontConfig;
}): StaffStorefrontPreview {
  if (previewStorefrontId === basicStorefrontId) {
    return {
      storefront: toBasicStorefrontConfig(baseline),
      previewStorefrontId: basicStorefrontId,
      isPreviewing: true,
      label: `You are previewing ${basicStorefrontVersionName}`,
    };
  }

  const draft = previewStorefrontId
    ? (drafts.find((storefrontConfig) => storefrontConfig.id === previewStorefrontId) ?? null)
    : null;

  if (draft) {
    return {
      storefront: draft.config,
      previewStorefrontId: draft.id,
      isPreviewing: true,
      label: `You are previewing ${draft.config.versionName}`,
    };
  }

  const publishedVersion = previewStorefrontId
    ? (publishedVersions.find((version) => version.id === previewStorefrontId) ?? null)
    : null;

  if (publishedVersion) {
    return {
      storefront: publishedVersion.config,
      previewStorefrontId: publishedVersion.id,
      isPreviewing: publishedVersion.id !== activeVersion?.id,
      label:
        publishedVersion.id === activeVersion?.id
          ? null
          : `You are previewing ${publishedVersion.config.versionName}`,
    };
  }

  return {
    storefront: activeVersion?.config ?? baseline,
    previewStorefrontId: null,
    isPreviewing: false,
    label: null,
  };
}

export function buildStaffStorefrontVersionSelection({
  galleryEntries,
  previewStorefrontId,
}: {
  galleryEntries: StorefrontGalleryEntry[];
  previewStorefrontId: string | null;
}): StaffStorefrontVersionSelection {
  const selectedEntry =
    galleryEntries.find((entry) => entry.id === previewStorefrontId) ??
    galleryEntries.find((entry) => entry.isLive) ??
    galleryEntries[0];

  if (!selectedEntry) {
    return {
      selectedEntryId: basicStorefrontId,
      selectedEntryVersionName: basicStorefrontVersionName,
      options: [],
      previewActionLabel: "Preview",
      applyActionLabel: "Apply",
      isApplyDisabled: true,
    };
  }

  return {
    selectedEntryId: selectedEntry.id,
    selectedEntryVersionName: selectedEntry.versionName,
    options: galleryEntries.map((entry) => ({
      id: entry.id,
      label: entry.versionName,
      status: entry.isLive ? "current" : entry.isPreviewing ? "previewing" : entry.kind,
    })),
    previewActionLabel: "Preview",
    applyActionLabel: selectedEntry.isLive ? "Current" : "Apply",
    isApplyDisabled: selectedEntry.isLive || !selectedEntry.canPublish,
  };
}

export function resolveGuestStorefrontSelection({
  requestedVersionId,
  activeVersion,
  publishedVersions,
  baseline,
}: {
  requestedVersionId?: string;
  activeVersion: PublishedStorefrontVersion | null;
  publishedVersions: PublishedStorefrontVersion[];
  baseline: StorefrontConfig;
}): GuestStorefrontSelection {
  const requestedPublishedVersion =
    requestedVersionId && requestedVersionId !== "baseline"
      ? (publishedVersions.find((version) => version.id === requestedVersionId) ?? null)
      : null;
  const selectedVersion =
    requestedVersionId === "baseline"
      ? null
      : (requestedPublishedVersion ?? activeVersion ?? publishedVersions[0] ?? null);
  const selectedVersionId = requestedVersionId === "baseline" ? "baseline" : selectedVersion?.id;

  return {
    storefront: selectedVersion?.config ?? baseline,
    selectedVersionId: selectedVersionId ?? "baseline",
    activeVersionId: activeVersion?.id ?? null,
    statusLabel: getGuestVersionStatusLabel(selectedVersion, activeVersion),
    options: [
      { id: "baseline", label: baseline.versionName, status: "baseline" },
      ...publishedVersions.map((version) => ({
        id: version.id,
        label: version.config.versionName,
        status: version.status,
      })),
    ],
  };
}

function toBasicStorefrontConfig(baseline: StorefrontConfig): StorefrontConfig {
  return {
    ...baseline,
    versionName: basicStorefrontVersionName,
  };
}

export function compareStorefrontVersions({
  base,
  selected,
}: {
  base: StorefrontConfig;
  selected: StorefrontConfig;
}): StorefrontVersionComparison {
  const baseHero = getHeroSection(base);
  const selectedHero = getHeroSection(selected);

  return {
    baseVersionName: base.versionName,
    selectedVersionName: selected.versionName,
    campaignChanged: base.campaignId !== selected.campaignId,
    heroChange: {
      beforeTitle: baseHero.title,
      afterTitle: selectedHero.title,
      beforeBody: baseHero.body ?? "",
      afterBody: selectedHero.body ?? "",
    },
    visualAssetChange: {
      beforePrompt: base.visualAsset.prompt,
      afterPrompt: selected.visualAsset.prompt,
      beforePath: base.visualAsset.path,
      afterPath: selected.visualAsset.path,
    },
    textChanges: compareStorefrontText(base, selected),
    strategicSummary: buildStrategicSummary(base, selected, baseHero, selectedHero),
    styleChanges: [
      styleChange("Theme", base.style.theme, selected.style.theme),
      styleChange("Accent color", base.style.accentColor, selected.style.accentColor),
      styleChange("Density", base.style.density, selected.style.density),
    ].filter((change) => change.before !== change.after),
    sectionChanges: compareLists(
      base.sections.map((section) => section.title),
      selected.sections.map((section) => section.title),
    ),
    productChanges: compareLists(getUniqueProductIds(base), getUniqueProductIds(selected)),
  };
}

function compareStorefrontText(base: StorefrontConfig, selected: StorefrontConfig) {
  const changes = [
    textChange("Selection name", base.versionName, selected.versionName),
    textChange("Hero title", getHeroSection(base).title, getHeroSection(selected).title),
    textChange("Hero copy", getHeroSection(base).body ?? "", getHeroSection(selected).body ?? ""),
    textChange("Hero visual prompt", base.visualAsset.prompt, selected.visualAsset.prompt),
    textChange("Image alt text", base.visualAsset.alt, selected.visualAsset.alt),
  ];
  for (const [index, baseSection] of base.sections.entries()) {
    const selectedSection =
      selected.sections.find((section) => section.id === baseSection.id) ??
      selected.sections[index];

    if (!selectedSection) {
      continue;
    }

    if (baseSection.type !== "hero") {
      const sectionLabel = getStorefrontSectionLabel(baseSection, index);

      changes.push(textChange(`${sectionLabel} title`, baseSection.title, selectedSection.title));
      changes.push(
        textChange(`${sectionLabel} copy`, baseSection.body ?? "", selectedSection.body ?? ""),
      );
    }
  }

  return changes.filter((change) => change.before !== change.after);
}

function textChange(label: string, before: string, after: string) {
  return { label, before, after };
}

function getGuestVersionStatusLabel(
  selectedVersion: PublishedStorefrontVersion | null,
  activeVersion: PublishedStorefrontVersion | null,
) {
  if (!selectedVersion) {
    return "Previewing baseline";
  }

  if (selectedVersion.id === activeVersion?.id) {
    return "Viewing current version";
  }

  return "Previewing inactive version";
}

function buildStrategicSummary(
  base: StorefrontConfig,
  selected: StorefrontConfig,
  baseHero: ReturnType<typeof getHeroSection>,
  selectedHero: ReturnType<typeof getHeroSection>,
): string[] {
  const summary = [];

  if (base.campaignId !== selected.campaignId) {
    summary.push(`Campaign shifted from ${base.versionName} to ${selected.versionName}.`);
  } else {
    summary.push(`Campaign stayed on ${selected.versionName}.`);
  }

  if (baseHero.title !== selectedHero.title || baseHero.body !== selectedHero.body) {
    summary.push(`Hero moved from ${summarizeHero(baseHero)} to ${summarizeHero(selectedHero)}.`);
  }

  if (base.visualAsset.path !== selected.visualAsset.path) {
    summary.push(
      `Creative asset changed from ${base.visualAsset.path} to ${selected.visualAsset.path}.`,
    );
  }

  return summary;
}

function summarizeHero(section: ReturnType<typeof getHeroSection>) {
  const text = `${section.title} ${section.body ?? ""}`.toLowerCase();

  if (text.includes("grill") && text.includes("travel")) {
    return "grill, travel, and everyday carry gifting";
  }

  if (text.includes("under £50") || text.includes("office")) {
    return "under-£50 office gifting";
  }

  if (text.includes("everyday")) {
    return "everyday curation";
  }

  return section.title;
}

function styleChange(label: string, before: string, after: string) {
  return { label, before, after };
}

function compareLists(baseItems: string[], selectedItems: string[]) {
  const baseSet = new Set(baseItems);
  const selectedSet = new Set(selectedItems);

  return {
    added: selectedItems.filter((item) => !baseSet.has(item)),
    removed: baseItems.filter((item) => !selectedSet.has(item)),
    unchanged: selectedItems.filter((item) => baseSet.has(item)),
  };
}

function getUniqueProductIds(config: StorefrontConfig): string[] {
  return Array.from(new Set(config.sections.flatMap((section) => section.productIds))).sort();
}

export function rollbackStorefrontVersion({
  id,
  targetVersion,
  rolledBackByUserId,
  rolledBackAt,
  publicationStore,
}: {
  id: string;
  targetVersion: PublishedStorefrontVersion;
  rolledBackByUserId: string;
  rolledBackAt: Date;
  publicationStore: StorefrontPublicationStore;
}): PublishedStorefrontVersion {
  const version: PublishedStorefrontVersion = {
    id,
    sourceStorefrontConfigId: targetVersion.sourceStorefrontConfigId,
    config: targetVersion.config,
    status: "active",
    rollbackOfVersionId: targetVersion.id,
    publishedByUserId: rolledBackByUserId,
    publishedAt: rolledBackAt,
  };

  publicationStore.savePublishedStorefrontVersion(version);

  return version;
}
