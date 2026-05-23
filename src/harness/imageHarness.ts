import type { CampaignVisualAsset } from "@/domain/storefront";

export interface CampaignAsset {
  id: string;
  campaignId: string;
  prompt: string;
  alt: string;
  source: "static" | "generated";
  path: string;
}

export interface ImageHarness {
  readonly mode: "static" | "live";
  generateCampaignHero(input: {
    campaignId: string;
    season: "fathers-day" | "secret-santa";
    visualDirection: string;
  }): Promise<CampaignVisualAsset>;
}

export const staticImageHarness: ImageHarness = {
  mode: "static",
  async generateCampaignHero(input) {
    const isSecretSanta = input.season === "secret-santa";

    return {
      id: `${input.campaignId}-hero-asset`,
      campaignId: input.campaignId,
      prompt: input.visualDirection,
      alt: isSecretSanta
        ? "A festive desk scene with wrapped small gifts from Atlas & Co."
        : "A warm outdoor Father’s Day gifting scene with grilling and travel essentials.",
      source: "static",
      path: isSecretSanta
        ? "/static-assets/secret-santa-hero.svg"
        : "/static-assets/fathers-day-hero.svg",
    };
  },
};
