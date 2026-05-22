import type { Campaign } from "@/domain/campaign";

export const fatherDayCampaign: Campaign = {
  id: "fathers-day-2026",
  name: "Grill, Travel, and Everyday Carry",
  season: "fathers-day",
  summary: "A margin-friendly Father’s Day campaign built around outdoor hosting and travel.",
  audience: "Gift buyers shopping for practical premium Father’s Day products.",
  productIds: [
    "portable-charcoal-grill",
    "cast-iron-grill-press",
    "leather-weekender-bag",
    "travel-grooming-kit",
    "wireless-charging-valet",
    "insulated-cooler-tote",
  ],
  expectedImpact:
    "Lift gift collection conversion by focusing on high-stock, high-margin products.",
  storefrontAngle: "Lead with confident gifting, outdoor hosting, and polished travel essentials.",
};

export const secretSantaCampaign: Campaign = {
  id: "secret-santa-2026",
  name: "Secret Santa Gifts That Look Effortless",
  season: "secret-santa",
  summary: "A playful under-£50 holiday campaign for office and friend-group gifting.",
  audience: "Office gift buyers, last-minute shoppers, and friends shopping under £50.",
  productIds: [
    "cast-iron-grill-press",
    "travel-grooming-kit",
    "wireless-charging-valet",
    "pour-over-coffee-set",
    "desk-organizer-tray",
  ],
  expectedImpact:
    "Increase holiday gift conversion while protecting inventory and return-rate risk.",
  storefrontAngle: "Organize gifts by price band, safe bets, and personality-led picks.",
};
