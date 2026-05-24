import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  campaignVisualAssetSchema,
  defaultStorefrontHeroImageComposition,
} from "@/domain/storefront";
import { createCodexAppServerImageHarness, staticImageHarness } from "@/harness/imageHarness";

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
    expect(asset.composition).toEqual(defaultStorefrontHeroImageComposition);
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
    expect(asset.composition).toEqual(defaultStorefrontHeroImageComposition);
  });

  it("copies Codex App Server generated images into public generated assets", async () => {
    const sourceDirectory = await mkdtemp(join(tmpdir(), "codex-source-image-"));
    const publicDirectory = await mkdtemp(join(tmpdir(), "codex-public-assets-"));
    const sourcePath = join(sourceDirectory, "ig_theme.png");
    await writeFile(sourcePath, pngBytes);

    const harness = createCodexAppServerImageHarness({
      allowedSourceDirectories: [sourceDirectory],
      publicDirectory,
      runImagePrompt: async (input) => ({
        prompt: input.prompt,
        revisedPrompt: "A polished launch-week storefront hero.",
        savedPath: sourcePath,
      }),
    });

    const asset = await harness.generateCampaignHero({
      campaignId: "event-launch-week",
      eventName: "Launch Week",
      visualDirection: "Bright launch-week gifts on a clean table.",
    });

    expect(campaignVisualAssetSchema.parse(asset)).toEqual(asset);
    expect(asset).toMatchObject({
      id: "event-launch-week-hero-asset",
      campaignId: "event-launch-week",
      prompt: "A polished launch-week storefront hero.",
      alt: "Launch Week hero visual for Atlas & Co.",
      source: "generated",
      path: "/generated-assets/launch-week-storefront-hero.png",
      composition: defaultStorefrontHeroImageComposition,
    });
    await expect(
      readFile(join(publicDirectory, "generated-assets", "launch-week-storefront-hero.png")),
    ).resolves.toEqual(pngBytes);
  });

  it("uses an optimized generated image path when conversion succeeds", async () => {
    const sourceDirectory = await mkdtemp(join(tmpdir(), "codex-source-image-"));
    const publicDirectory = await mkdtemp(join(tmpdir(), "codex-public-assets-"));
    const sourcePath = join(sourceDirectory, "ig_theme.png");
    await writeFile(sourcePath, pngBytes);

    const harness = createCodexAppServerImageHarness({
      allowedSourceDirectories: [sourceDirectory],
      publicDirectory,
      optimizeGeneratedImage: async (input) => {
        await writeFile(join(input.targetDirectory, `${input.targetSlugBase}.jpg`), "jpeg bytes");

        return `/generated-assets/${input.targetSlugBase}.jpg`;
      },
      runImagePrompt: async (input) => ({
        prompt: input.prompt,
        revisedPrompt: "A compressed storefront hero.",
        savedPath: sourcePath,
      }),
    });

    const asset = await harness.generateCampaignHero({
      campaignId: "event-launch-week",
      eventName: "Launch Week",
      visualDirection: "Bright launch-week gifts on a clean table.",
    });

    expect(asset.path).toBe("/generated-assets/launch-week-storefront-hero.jpg");
    await expect(
      readFile(
        join(publicDirectory, "generated-assets", "launch-week-storefront-hero.jpg"),
        "utf8",
      ),
    ).resolves.toBe("jpeg bytes");
  });

  it("falls back to the original visual direction when App Server keeps the prompt unchanged", async () => {
    const sourceDirectory = await mkdtemp(join(tmpdir(), "codex-source-image-"));
    const publicDirectory = await mkdtemp(join(tmpdir(), "codex-public-assets-"));
    const sourcePath = join(sourceDirectory, "ig_campaign.png");
    await writeFile(sourcePath, pngBytes);

    const harness = createCodexAppServerImageHarness({
      allowedSourceDirectories: [sourceDirectory],
      publicDirectory,
      runImagePrompt: async (input) => ({
        prompt: input.prompt,
        revisedPrompt: null,
        savedPath: sourcePath,
      }),
    });

    const asset = await harness.generateCampaignHero({
      campaignId: "event-summer-sale",
      visualDirection: "Summer sale gift edit with bright product styling.",
    });

    expect(asset.prompt).toBe("Summer sale gift edit with bright product styling.");
    expect(asset.alt).toBe("Generated campaign hero visual for Atlas & Co.");
    expect(asset.path).toBe("/generated-assets/event-summer-sale-storefront-hero.png");
    expect(asset.composition).toEqual(defaultStorefrontHeroImageComposition);
  });

  it("adds a readable suffix instead of overwriting an existing generated hero", async () => {
    const sourceDirectory = await mkdtemp(join(tmpdir(), "codex-source-image-"));
    const publicDirectory = await mkdtemp(join(tmpdir(), "codex-public-assets-"));
    const sourcePath = join(sourceDirectory, "ig_campaign.png");
    await writeFile(sourcePath, pngBytes);
    await mkdir(join(publicDirectory, "generated-assets"), { recursive: true });
    await writeFile(
      join(publicDirectory, "generated-assets", "event-summer-sale-storefront-hero.png"),
      "existing hero",
    );

    const harness = createCodexAppServerImageHarness({
      allowedSourceDirectories: [sourceDirectory],
      publicDirectory,
      runImagePrompt: async (input) => ({
        prompt: input.prompt,
        revisedPrompt: null,
        savedPath: sourcePath,
      }),
    });

    const asset = await harness.generateCampaignHero({
      campaignId: "event-summer-sale",
      visualDirection: "Summer sale gift edit with bright product styling.",
    });

    expect(asset.path).toBe("/generated-assets/event-summer-sale-storefront-hero-2.png");
  });

  it("tells Codex the exact hero crop and safe copy zone", async () => {
    let sentPrompt = "";
    const sourceDirectory = await mkdtemp(join(tmpdir(), "codex-source-image-"));
    const publicDirectory = await mkdtemp(join(tmpdir(), "codex-public-assets-"));
    const sourcePath = join(sourceDirectory, "ig_prompt.png");
    await writeFile(sourcePath, pngBytes);

    const harness = createCodexAppServerImageHarness({
      allowedSourceDirectories: [sourceDirectory],
      publicDirectory,
      runImagePrompt: async (input) => {
        sentPrompt = input.prompt;

        return {
          prompt: input.prompt,
          revisedPrompt: null,
          savedPath: sourcePath,
        };
      },
    });

    await harness.generateCampaignHero({
      campaignId: "event-world-cup",
      eventName: "World Cup",
      visualDirection: "Celebratory desk gifts with football watch-party energy.",
    });

    expect(sentPrompt).toContain("Final image slot: storefrontHeroWide");
    expect(sentPrompt).toContain("Target aspect ratio: 14 / 9");
    expect(sentPrompt).toContain("Safe copy zone: copy-left-half");
    expect(sentPrompt).toContain("final usage is a wide cropped storefront hero");
  });

  it("rejects non-image App Server saved paths before copying them into public assets", async () => {
    const sourceDirectory = await mkdtemp(join(tmpdir(), "codex-source-image-"));
    const publicDirectory = await mkdtemp(join(tmpdir(), "codex-public-assets-"));
    const sourcePath = join(sourceDirectory, "not-an-image.txt");
    await writeFile(sourcePath, "DATABASE_URL=file:local-secret");

    const harness = createCodexAppServerImageHarness({
      allowedSourceDirectories: [sourceDirectory],
      publicDirectory,
      runImagePrompt: async (input) => ({
        prompt: input.prompt,
        revisedPrompt: null,
        savedPath: sourcePath,
      }),
    });

    await expect(
      harness.generateCampaignHero({
        campaignId: "event-launch-week",
        eventName: "Launch Week",
        visualDirection: "Bright launch-week gifts on a clean table.",
      }),
    ).rejects.toThrow("Codex App Server returned a non-image file.");
  });
});

const pngBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
