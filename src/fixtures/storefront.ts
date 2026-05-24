import type { StorefrontConfig } from "@/domain/storefront";

export const baselineStorefront: StorefrontConfig = {
  id: "baseline",
  campaignId: "evergreen",
  versionName: "Baseline Atlas & Co.",
  style: {
    theme: "basic",
    accentColor: "#2563eb",
    density: "comfortable",
    palette: {
      background: "#f9fbff",
      surface: "#ffffff",
      text: "#0b1020",
      muted: "#42526e",
      border: "#c7d7ff",
      accent: "#2563eb",
      secondaryAccent: "#22d3ee",
      button: "#0b1020",
      buttonText: "#ffffff",
    },
  },
  visualAsset: {
    id: "evergreen-hero-asset",
    campaignId: "evergreen",
    prompt:
      "Bright Atlas & Co. tabletop hero with coffee, desk, and travel essentials in a clean everyday retail style.",
    alt: "A bright Atlas & Co. tabletop scene with coffee gear, a desk lamp, and everyday gift essentials.",
    source: "static",
    path: "/static-assets/basic-hero.svg",
    composition: {
      slot: "storefrontHeroWide",
      aspectRatio: "14 / 9",
      focalPoint: "right-center",
      safeArea: "copy-left-half",
      objectPosition: "72% center",
    },
  },
  sections: [
    {
      id: "baseline-hero",
      type: "hero",
      sectionIntent: "heroProduct",
      title: "Curated goods for useful everyday rituals.",
      body: "Home, travel, coffee, grooming, and giftable essentials from Atlas & Co.",
      productIds: ["pour-over-coffee-set"],
    },
    {
      id: "baseline-offer",
      type: "productRail",
      sectionIntent: "currentOffer",
      title: "Useful gifts, ready now",
      body: "A current edit of high-stock everyday gifts with practical appeal.",
      productIds: ["pour-over-coffee-set", "wireless-charging-valet", "desk-organizer-tray"],
    },
    {
      id: "baseline-spotlight",
      type: "featuredCollection",
      sectionIntent: "spotlight",
      title: "Spotlight on better coffee breaks",
      body: "The Pour-Over Coffee Set leads the baseline shop because it is giftable, replenishable, and easy to explain.",
      productIds: ["pour-over-coffee-set"],
    },
  ],
};

export const fatherDayStorefront: StorefrontConfig = {
  id: "fathers-day-storefront",
  campaignId: "fathers-day-2026",
  versionName: "Father’s Day",
  style: {
    theme: "summer",
    accentColor: "#b45309",
    density: "editorial",
  },
  visualAsset: {
    id: "fathers-day-2026-hero-asset",
    campaignId: "fathers-day-2026",
    prompt: "Warm outdoor Father’s Day gifting scene.",
    alt: "A warm outdoor Father’s Day gifting scene with grilling and travel essentials.",
    source: "static",
    path: "/static-assets/fathers-day-hero.svg",
    composition: {
      slot: "storefrontHeroWide",
      aspectRatio: "14 / 9",
      focalPoint: "right-center",
      safeArea: "copy-left-half",
      objectPosition: "72% center",
    },
  },
  sections: [
    {
      id: "fd-hero",
      type: "hero",
      sectionIntent: "heroProduct",
      title: "Father’s Day gifts for grill masters, travelers, and everyday fixers.",
      body: "Practical picks with strong margins, healthy inventory, and proven conversion.",
      productIds: ["portable-charcoal-grill"],
    },
    {
      id: "fd-offer",
      type: "bundleCards",
      sectionIntent: "currentOffer",
      title: "Build the weekend-ready bundle",
      body: "Pair outdoor hosting and travel essentials while the Father’s Day campaign is active.",
      productIds: ["leather-weekender-bag", "travel-grooming-kit", "wireless-charging-valet"],
    },
    {
      id: "fd-spotlight",
      type: "featuredCollection",
      sectionIntent: "spotlight",
      title: "Spotlight: Portable Charcoal Grill",
      body: "The campaign lead combines strong conversion, healthy stock, and a clear gift moment.",
      productIds: ["portable-charcoal-grill"],
    },
  ],
};

export const secretSantaStorefront: StorefrontConfig = {
  id: "secret-santa-storefront",
  campaignId: "secret-santa-2026",
  versionName: "Secret Santa",
  style: {
    theme: "holiday",
    accentColor: "#be123c",
    density: "compact",
  },
  visualAsset: {
    id: "secret-santa-2026-hero-asset",
    campaignId: "secret-santa-2026",
    prompt: "Playful office Secret Santa gifting.",
    alt: "A festive desk scene with wrapped small gifts from Atlas & Co.",
    source: "static",
    path: "/static-assets/secret-santa-hero.svg",
    composition: {
      slot: "storefrontHeroWide",
      aspectRatio: "14 / 9",
      focalPoint: "right-center",
      safeArea: "copy-left-half",
      objectPosition: "72% center",
    },
  },
  sections: [
    {
      id: "ss-hero",
      type: "hero",
      sectionIntent: "heroProduct",
      title: "Secret Santa gifts under £50 that do not feel last-minute.",
      body: "Playful, useful, and easy-to-ship picks for office gift exchanges.",
      productIds: ["pour-over-coffee-set"],
    },
    {
      id: "ss-offer",
      type: "productRail",
      sectionIntent: "currentOffer",
      title: "Safe bets under £50",
      body: "A current offer built from affordable products with practical workplace gift appeal.",
      productIds: ["cast-iron-grill-press", "travel-grooming-kit", "wireless-charging-valet"],
    },
    {
      id: "ss-spotlight",
      type: "featuredCollection",
      sectionIntent: "spotlight",
      title: "Spotlight: Pour-Over Coffee Set",
      body: "A compact coffee gift that feels considered, useful, and safely inside the under-£50 brief.",
      productIds: ["pour-over-coffee-set"],
    },
  ],
};
