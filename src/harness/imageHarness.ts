export interface CampaignAsset {
  id: string;
  campaignId: string;
  prompt: string;
  alt: string;
  source: "fixture" | "generated";
  path: string;
}

export interface ImageHarness {
  readonly mode: "fixture" | "live";
  generateCampaignHero(input: {
    campaignId: string;
    season: "fathers-day" | "secret-santa";
    visualDirection: string;
  }): Promise<CampaignAsset>;
}

export const fixtureImageHarness: ImageHarness = {
  mode: "fixture",
  async generateCampaignHero(input) {
    const isSecretSanta = input.season === "secret-santa";

    return {
      id: `${input.campaignId}-hero-asset`,
      campaignId: input.campaignId,
      prompt: input.visualDirection,
      alt: isSecretSanta
        ? "A festive desk scene with wrapped small gifts from Atlas & Co."
        : "A warm outdoor Father’s Day gifting scene with grilling and travel essentials.",
      source: "fixture",
      path: isSecretSanta ? "/fixtures/secret-santa-hero.png" : "/fixtures/fathers-day-hero.png",
    };
  },
};
