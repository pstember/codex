import type { Product } from "@/domain/product";
import {
  defaultStorefrontHeroImageComposition,
  type StorefrontConfig,
  storefrontConfigSchema,
  validateStorefrontProductReferences,
} from "@/domain/storefront";
import type { GeneratedStorefrontConfig, StorefrontConfigStore } from "@/domain/storefrontDraft";
import type { CodexGenerationTrace, CodexHarness } from "@/harness/codexHarness";
import { type ImageHarness, staticImageHarness } from "@/harness/imageHarness";

export async function adaptStorefrontForEvent(input: {
  id: string;
  eventName: string;
  operatorPrompt: string;
  sourceStorefront: StorefrontConfig;
  harness: CodexHarness;
  imageHarness?: ImageHarness;
  products: Product[];
  createdByUserId: string;
  createdAt: Date;
  storefrontStore: StorefrontConfigStore;
}): Promise<
  GeneratedStorefrontConfig & { generationTrace: CodexGenerationTrace<StorefrontConfig> }
> {
  const eventName = input.eventName.trim();
  const operatorPrompt = input.operatorPrompt.trim();

  if (!eventName) {
    throw new Error("Enter an event name before adapting the storefront.");
  }

  if (!operatorPrompt) {
    throw new Error("Enter an adaptation request before sending it to Codex.");
  }

  const generationTrace = await input.harness.generateStorefrontAdaptationTrace({
    eventName,
    operatorPrompt,
    sourceStorefront: input.sourceStorefront,
  });
  const generatedConfig = generationTrace.value;
  const eventSlug = slugify(eventName);
  const campaignId = generatedConfig.campaignId || `event-${eventSlug}`;
  const imageErrors: string[] = [];
  let visualAsset = generatedConfig.visualAsset;

  try {
    visualAsset = await (input.imageHarness ?? staticImageHarness).generateCampaignHero({
      campaignId,
      eventName,
      visualDirection: generatedConfig.visualAsset.prompt || operatorPrompt,
      composition: generatedConfig.visualAsset.composition ?? defaultStorefrontHeroImageComposition,
    });
  } catch (error) {
    imageErrors.push(
      `Generated image failed: ${error instanceof Error ? error.message : "Unknown image error"}`,
    );
  }

  const config = {
    ...generatedConfig,
    campaignId,
    visualAsset,
  };
  const validationErrors = [
    ...validateAdaptedStorefrontConfig(config, input.products),
    ...imageErrors,
  ];
  const storefrontConfig: GeneratedStorefrontConfig = {
    id: input.id,
    sourceDraftKey: `adaptation:${eventSlug}`,
    config,
    validationStatus: validationErrors.length > 0 ? "invalid" : "draft",
    validationErrors,
    createdByUserId: input.createdByUserId,
    createdAt: input.createdAt,
  };

  input.storefrontStore.saveStorefrontConfig(storefrontConfig);

  return Object.defineProperty(storefrontConfig, "generationTrace", {
    enumerable: false,
    value: generationTrace,
  }) as GeneratedStorefrontConfig & {
    generationTrace: CodexGenerationTrace<StorefrontConfig>;
  };
}

function validateAdaptedStorefrontConfig(config: StorefrontConfig, products: Product[]): string[] {
  const parsed = storefrontConfigSchema.safeParse(config);
  const errors: string[] = [];

  if (!parsed.success) {
    errors.push(
      ...parsed.error.issues.map((issue) => `Invalid storefront config: ${issue.message}`),
    );
  }

  const validProductIds = new Set(products.map((product) => product.id));
  const unknownProductIds = validateStorefrontProductReferences(config, validProductIds);

  for (const productId of unknownProductIds) {
    errors.push(`Storefront section references unknown product "${productId}".`);
  }

  if (config.visualAsset.campaignId !== config.campaignId) {
    errors.push(
      `Storefront visual asset campaign "${config.visualAsset.campaignId}" does not match storefront campaign "${config.campaignId}".`,
    );
  }

  return errors;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
