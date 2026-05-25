import { execFile } from "node:child_process";
import { access, copyFile, mkdir, open, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import {
  type CampaignVisualAsset,
  defaultStorefrontHeroImageComposition,
} from "@/domain/storefront";
import {
  type CodexAppServerImageResult,
  runCodexAppServerImagePrompt,
} from "@/harness/codexAppServerClient";

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
    season?: "fathers-day" | "secret-santa";
    eventName?: string;
    visualDirection: string;
    composition?: CampaignVisualAsset["composition"];
  }): Promise<CampaignVisualAsset>;
}

export type CodexAppServerImageRunner = (input: {
  prompt: string;
}) => Promise<CodexAppServerImageResult>;

export type GeneratedImageOptimizer = (input: {
  publicDirectory: string;
  sourcePath: string;
  targetDirectory: string;
  targetSlugBase: string;
}) => Promise<string | null>;

const execFileAsync = promisify(execFile);
const maxGeneratedImageBytes = 10 * 1024 * 1024;

export const staticImageHarness: ImageHarness = {
  mode: "static",
  async generateCampaignHero(input) {
    const eventSlug = slugify(input.eventName ?? input.season ?? "event");
    const isSecretSanta = input.season === "secret-santa" || eventSlug.includes("secret-santa");

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
        : input.eventName
          ? "/static-assets/generated-event-hero.svg"
          : "/static-assets/fathers-day-hero.svg",
      composition: input.composition ?? defaultStorefrontHeroImageComposition,
    };
  },
};

export const generatedEventImageHarness: ImageHarness = {
  mode: "live",
  generateCampaignHero: createCodexAppServerImageHarness().generateCampaignHero,
};

export function createCodexAppServerImageHarness(
  input: {
    publicDirectory?: string;
    allowedSourceDirectories?: string[];
    runImagePrompt?: CodexAppServerImageRunner;
    optimizeGeneratedImage?: GeneratedImageOptimizer;
  } = {},
): ImageHarness {
  const publicDirectory = input.publicDirectory ?? join(process.cwd(), "public");
  const allowedSourceDirectories = (
    input.allowedSourceDirectories ?? [
      join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "generated_images"),
    ]
  ).map((directory) => resolve(directory));
  const runImagePrompt = input.runImagePrompt ?? runCodexAppServerImagePrompt;
  const optimizeGeneratedImage = input.optimizeGeneratedImage ?? optimizeGeneratedHeroImage;

  return {
    mode: "live",
    async generateCampaignHero(heroInput) {
      const imagePrompt = buildStorefrontHeroImagePrompt(heroInput);
      const generatedImage = await runImagePrompt({ prompt: imagePrompt });
      const publicPath = await copyGeneratedImageToPublicAssets({
        eventName: heroInput.eventName ?? heroInput.season ?? heroInput.campaignId,
        allowedSourceDirectories,
        optimizeGeneratedImage,
        publicDirectory,
        sourcePath: generatedImage.savedPath,
      });

      return {
        id: `${heroInput.campaignId}-hero-asset`,
        campaignId: heroInput.campaignId,
        prompt: generatedImage.revisedPrompt ?? heroInput.visualDirection,
        alt: `${heroInput.eventName ?? "Generated campaign"} hero visual for Atlas & Co.`,
        source: "generated",
        path: publicPath,
        composition: heroInput.composition ?? defaultStorefrontHeroImageComposition,
      };
    },
  };
}

async function copyGeneratedImageToPublicAssets(input: {
  allowedSourceDirectories?: string[];
  eventName: string;
  optimizeGeneratedImage: GeneratedImageOptimizer;
  publicDirectory: string;
  sourcePath: string;
}): Promise<string> {
  const targetDirectory = join(input.publicDirectory, "generated-assets");
  const targetSlugBase = `${slugify(input.eventName)}-storefront-hero`;
  const extension = await assertValidGeneratedImage(
    input.sourcePath,
    input.allowedSourceDirectories,
  );
  await mkdir(targetDirectory, { recursive: true });

  const optimizedPath = await input.optimizeGeneratedImage({
    publicDirectory: input.publicDirectory,
    sourcePath: input.sourcePath,
    targetDirectory,
    targetSlugBase,
  });

  if (optimizedPath) {
    return optimizedPath;
  }

  const filename = await nextAvailableAssetFilename(targetDirectory, targetSlugBase, extension);
  await copyFile(input.sourcePath, join(targetDirectory, filename));

  return `/generated-assets/${filename}`;
}

async function assertValidGeneratedImage(
  sourcePath: string,
  allowedSourceDirectories: string[] | undefined,
): Promise<string> {
  const resolvedSourcePath = resolve(sourcePath);

  if (
    allowedSourceDirectories &&
    !allowedSourceDirectories.some((directory) =>
      isPathInsideDirectory(resolvedSourcePath, directory),
    )
  ) {
    throw new Error(
      "Codex App Server returned an image outside the allowed generated-image directory.",
    );
  }

  const sourceStats = await stat(resolvedSourcePath);

  if (!sourceStats.isFile()) {
    throw new Error("Codex App Server returned a generated image path that is not a file.");
  }

  if (sourceStats.size > maxGeneratedImageBytes) {
    throw new Error("Codex App Server returned a generated image that is too large.");
  }

  const file = await open(resolvedSourcePath, "r");

  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    const imageExtension = detectImageExtension(buffer.subarray(0, bytesRead));

    if (!imageExtension) {
      throw new Error("Codex App Server returned a non-image file.");
    }

    return imageExtension;
  } finally {
    await file.close();
  }
}

function isPathInsideDirectory(path: string, directory: string): boolean {
  return path === directory || path.startsWith(`${directory}/`);
}

function detectImageExtension(bytes: Buffer): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return ".png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return ".jpg";
  }

  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return ".webp";
  }

  return null;
}

async function optimizeGeneratedHeroImage(input: {
  targetDirectory: string;
  targetSlugBase: string;
  sourcePath: string;
}): Promise<string | null> {
  const filename = await nextAvailableAssetFilename(
    input.targetDirectory,
    input.targetSlugBase,
    ".jpg",
  );
  const targetPath = join(input.targetDirectory, filename);

  try {
    await mkdir(input.targetDirectory, { recursive: true });
    await execFileAsync("sips", ["-s", "format", "jpeg", input.sourcePath, "--out", targetPath]);
    return `/generated-assets/${filename}`;
  } catch {
    return null;
  }
}

async function nextAvailableAssetFilename(
  targetDirectory: string,
  slugBase: string,
  extension: string,
): Promise<string> {
  let index = 1;

  while (true) {
    const filename = index === 1 ? `${slugBase}${extension}` : `${slugBase}-${index}${extension}`;

    try {
      await access(join(targetDirectory, filename));
      index += 1;
    } catch {
      return filename;
    }
  }
}

function buildStorefrontHeroImagePrompt(input: {
  campaignId: string;
  season?: "fathers-day" | "secret-santa";
  eventName?: string;
  visualDirection: string;
  composition?: CampaignVisualAsset["composition"];
}): string {
  return [
    "Generate exactly one ecommerce storefront hero image for Atlas & Co.",
    `Theme or event: ${input.eventName ?? input.season ?? input.campaignId}`,
    `Creative direction: ${input.visualDirection}`,
    `Final image slot: ${(input.composition ?? defaultStorefrontHeroImageComposition).slot}`,
    `Target aspect ratio: ${(input.composition ?? defaultStorefrontHeroImageComposition).aspectRatio}`,
    `Preferred focal point: ${(input.composition ?? defaultStorefrontHeroImageComposition).focalPoint}`,
    `Safe copy zone: ${(input.composition ?? defaultStorefrontHeroImageComposition).safeArea}`,
    `Suggested crop anchor: ${(input.composition ?? defaultStorefrontHeroImageComposition).objectPosition}`,
    "Composition: final usage is a wide cropped storefront hero, keep generous negative space for overlaid copy on the left, and place the main product cluster inside the preserved right-side area.",
    "Cropping constraints: avoid placing key objects, handles, or packaging edges near the top, far left, or far right trim lines.",
    "Style: polished editorial retail photography, realistic useful gift products, crisp natural lighting, visually matched to the requested theme.",
    "Constraints: no readable text, no logos, no watermarks, no people, no distorted products.",
  ].join("\n");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
