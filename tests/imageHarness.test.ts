import { describe, expect, it } from "vitest";
import { staticImageHarness } from "@/harness/imageHarness";

describe("static image harness", () => {
  it("returns deterministic Father’s Day visual metadata", async () => {
    const asset = await staticImageHarness.generateCampaignHero({
      campaignId: "fathers-day-2026",
      season: "fathers-day",
      visualDirection: "Warm outdoor gifting scene.",
    });

    expect(asset.source).toBe("static");
    expect(asset.path).toBe("/static-assets/fathers-day-hero.svg");
    expect(asset.alt).toContain("Father’s Day");
  });

  it("returns deterministic Secret Santa visual metadata", async () => {
    const asset = await staticImageHarness.generateCampaignHero({
      campaignId: "secret-santa-2026",
      season: "secret-santa",
      visualDirection: "Festive desk with small wrapped gifts.",
    });

    expect(asset.source).toBe("static");
    expect(asset.path).toBe("/static-assets/secret-santa-hero.svg");
    expect(asset.alt).toContain("festive");
  });
});
