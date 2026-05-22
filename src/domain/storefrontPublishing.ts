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
