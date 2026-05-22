import type { StorefrontConfig } from "@/domain/storefront";
import type { GeneratedStorefrontConfig } from "@/domain/storefrontGeneration";

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
  if (storefrontConfig.validationStatus !== "valid") {
    throw new Error("Only valid storefront configs can be published.");
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

export function compareStorefrontVersions({
  base,
  selected,
}: {
  base: StorefrontConfig;
  selected: StorefrontConfig;
}): StorefrontVersionComparison {
  return {
    baseVersionName: base.versionName,
    selectedVersionName: selected.versionName,
    campaignChanged: base.campaignId !== selected.campaignId,
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
