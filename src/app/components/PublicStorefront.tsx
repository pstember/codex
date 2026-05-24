import type { CSSProperties } from "react";
import { getCurrentUser, getStorefrontPreviewId } from "@/app/auth/session";
import { PublicStorefrontExperience } from "@/app/components/PublicStorefrontExperience";
import { can } from "@/domain/roles";
import { resolveStorefrontPalette, type StorefrontConfig } from "@/domain/storefront";
import {
  buildStaffStorefrontVersionSelection,
  buildStorefrontGalleryEntries,
  resolveGuestStorefrontSelection,
  resolveStaffStorefrontPreview,
} from "@/domain/storefrontPublishing";
import { products } from "@/fixtures/products";
import { baselineStorefront } from "@/fixtures/storefront";
import { getAppDatabase } from "@/persistence/appDatabase";

export async function PublicStorefront({ version }: { version?: string }) {
  const user = await getCurrentUser();
  const canPreviewVersions = user ? can(user.role, "publish_storefront") : false;
  const database = getAppDatabase();
  const activeVersion = database.findActiveStorefrontVersion();
  const publishedVersions = database.listPublishedStorefrontVersions();
  const previewStorefrontId = canPreviewVersions ? await getStorefrontPreviewId() : null;
  const galleryEntries = canPreviewVersions
    ? buildStorefrontGalleryEntries({
        drafts: database
          .listRecentStorefrontConfigs(100)
          .filter((config) => config.sourceDraftKey.startsWith("adaptation:")),
        activeVersion,
        baseline: baselineStorefront,
        previewStorefrontId,
      })
    : [];
  const selection = resolveGuestStorefrontSelection({
    requestedVersionId: version,
    activeVersion,
    publishedVersions,
    baseline: baselineStorefront,
  });
  const staffVersionSelection = canPreviewVersions
    ? buildStaffStorefrontVersionSelection({
        galleryEntries,
        previewStorefrontId,
      })
    : null;
  const preview = canPreviewVersions
    ? resolveStaffStorefrontPreview({
        previewStorefrontId: version ? null : previewStorefrontId,
        drafts: database.listRecentStorefrontConfigs(100),
        activeVersion,
        publishedVersions,
        baseline: baselineStorefront,
      })
    : null;
  const storefront = preview?.isPreviewing ? preview.storefront : selection.storefront;

  return (
    <PublicStorefrontExperience
      canPreviewVersions={canPreviewVersions}
      products={products}
      selection={selection}
      staffVersionSelection={staffVersionSelection}
      style={storefrontAccent(storefront)}
      storefront={storefront}
      staffPreview={preview?.isPreviewing ? { label: preview.label ?? "" } : null}
      user={user ? { name: user.name, role: user.role } : null}
    />
  );
}

function storefrontAccent(storefront: StorefrontConfig) {
  const palette = resolveStorefrontPalette(storefront);

  return {
    "--storefront-background": palette.background,
    "--storefront-surface": palette.surface,
    "--storefront-text": palette.text,
    "--storefront-muted": palette.muted,
    "--storefront-border": palette.border,
    "--storefront-accent": palette.accent,
    "--storefront-secondary": palette.secondaryAccent,
    "--storefront-button": palette.button,
    "--storefront-button-text": palette.buttonText,
    background: `linear-gradient(140deg, ${palette.secondaryAccent}22, transparent 34%), linear-gradient(225deg, ${palette.accent}26, transparent 30%), ${palette.background}`,
  } as CSSProperties;
}
