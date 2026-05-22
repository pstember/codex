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

function getHeroSection(config: StorefrontConfig) {
  return config.sections.find((section) => section.type === "hero") ?? config.sections[0];
}

function getGuestVersionStatusLabel(
  selectedVersion: PublishedStorefrontVersion | null,
  activeVersion: PublishedStorefrontVersion | null,
) {
  if (!selectedVersion) {
    return "Previewing baseline";
  }

  if (selectedVersion.id === activeVersion?.id) {
    return "Viewing active version";
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
