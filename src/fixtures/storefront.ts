import type { StorefrontConfig } from "@/domain/storefront";

export const baselineStorefront: StorefrontConfig = {
  id: "baseline",
  campaignId: "evergreen",
  versionName: "Baseline Atlas & Co.",
  style: {
    theme: "heritage",
    accentColor: "#0f766e",
    density: "comfortable",
  },
  sections: [
    {
      id: "baseline-hero",
      type: "hero",
      title: "Curated goods for useful everyday rituals.",
      body: "Home, travel, coffee, grooming, and giftable essentials from Atlas & Co.",
      productIds: [],
    },
    {
      id: "baseline-rail",
      type: "productRail",
      title: "Popular this week",
      productIds: ["pour-over-coffee-set", "wireless-charging-valet", "desk-organizer-tray"],
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
  sections: [
    {
      id: "fd-hero",
      type: "hero",
      title: "Father’s Day gifts for grill masters, travelers, and everyday fixers.",
      body: "Practical picks with strong margins, healthy inventory, and proven conversion.",
      productIds: ["portable-charcoal-grill", "cast-iron-grill-press"],
    },
    {
      id: "fd-bundle",
      type: "bundleCards",
      title: "Build the weekend-ready bundle",
      productIds: ["leather-weekender-bag", "travel-grooming-kit", "wireless-charging-valet"],
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
  sections: [
    {
      id: "ss-hero",
      type: "hero",
      title: "Secret Santa gifts under £50 that do not feel last-minute.",
      body: "Playful, useful, and easy-to-ship picks for office gift exchanges.",
      productIds: ["pour-over-coffee-set", "desk-organizer-tray"],
    },
    {
      id: "ss-rail",
      type: "productRail",
      title: "Safe bets under £50",
      productIds: [
        "cast-iron-grill-press",
        "travel-grooming-kit",
        "wireless-charging-valet",
        "pour-over-coffee-set",
        "desk-organizer-tray",
      ],
    },
  ],
};
