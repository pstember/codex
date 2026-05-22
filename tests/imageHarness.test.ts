import { describe, expect, it } from "vitest";
import { fixtureImageHarness } from "@/harness/imageHarness";

describe("fixture image harness", () => {
  it("returns deterministic Father’s Day visual metadata", async () => {
    const asset = await fixtureImageHarness.generateCampaignHero({
      campaignId: "fathers-day-2026",
      season: "fathers-day",
      visualDirection: "Warm outdoor gifting scene.",
    });

    expect(asset.source).toBe("fixture");
    expect(asset.path).toBe("/fixtures/fathers-day-hero.png");
    expect(asset.alt).toContain("Father’s Day");
  });

  it("returns deterministic Secret Santa visual metadata", async () => {
    const asset = await fixtureImageHarness.generateCampaignHero({
      campaignId: "secret-santa-2026",
      season: "secret-santa",
      visualDirection: "Festive desk with small wrapped gifts.",
    });

    expect(asset.source).toBe("fixture");
    expect(asset.path).toBe("/fixtures/secret-santa-hero.png");
    expect(asset.alt).toContain("festive");
  });
});
