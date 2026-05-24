import { getStorefrontSectionLabel, type StorefrontConfig } from "@/domain/storefront";
import type { CodexGenerationTrace, CodexHarness } from "@/harness/codexHarness";

export async function regenerateStorefrontWorkbenchText(input: {
  config: StorefrontConfig;
  masterPrompt: string;
  harness: CodexHarness;
}): Promise<StorefrontConfig> {
  const result = await regenerateStorefrontWorkbenchTextWithTrace(input);

  return result.config;
}

export async function regenerateStorefrontWorkbenchTextWithTrace(input: {
  config: StorefrontConfig;
  masterPrompt: string;
  harness: CodexHarness;
}): Promise<{
  config: StorefrontConfig;
  generationTrace: CodexGenerationTrace<StorefrontConfig>;
}> {
  const masterPrompt = input.masterPrompt.trim();

  if (!masterPrompt) {
    throw new Error("Add a master prompt before regenerating the config workbench.");
  }

  const generationTrace = await input.harness.generateStorefrontAdaptationTrace({
    eventName: input.config.versionName,
    operatorPrompt: buildWorkbenchMasterPrompt(input.config, masterPrompt),
    sourceStorefront: input.config,
  });
  const generatedConfig = generationTrace.value;

  return {
    config: {
      ...input.config,
      versionName: generatedRequiredText(generatedConfig.versionName, input.config.versionName),
      visualAsset: {
        ...input.config.visualAsset,
        prompt: generatedRequiredText(
          generatedConfig.visualAsset.prompt,
          input.config.visualAsset.prompt,
        ),
        alt: generatedRequiredText(generatedConfig.visualAsset.alt, input.config.visualAsset.alt),
      },
      sections: input.config.sections.map((section, index) => {
        const generatedSection =
          generatedConfig.sections.find((candidate) => candidate.id === section.id) ??
          generatedConfig.sections[index];

        return {
          ...section,
          title: generatedRequiredText(generatedSection?.title, section.title),
          body: generatedTextOrFallback(generatedSection?.body, section.body),
        };
      }),
    },
    generationTrace,
  };
}

function buildWorkbenchMasterPrompt(config: StorefrontConfig, masterPrompt: string) {
  return [
    "Regenerate every editable text field in this storefront config workbench at once.",
    "Keep product ids, section ids, section types, campaign ids, image paths, and palette values unchanged.",
    "Use the visual selection theme only as context; do not rewrite the theme setting.",
    `Master prompt: ${masterPrompt}`,
    "Current editable text:",
    `Selection name: ${config.versionName}`,
    `Visual selection theme: ${config.style.theme}`,
    `Hero visual prompt: ${config.visualAsset.prompt}`,
    `Image alt text: ${config.visualAsset.alt}`,
    `Hero image slot: ${config.visualAsset.composition.slot}`,
    `Hero image aspect ratio: ${config.visualAsset.composition.aspectRatio}`,
    `Hero image focal point: ${config.visualAsset.composition.focalPoint}`,
    `Hero image safe area: ${config.visualAsset.composition.safeArea}`,
    `Hero image crop anchor: ${config.visualAsset.composition.objectPosition ?? "default"}`,
    ...config.sections.flatMap((section) => [
      `Section ${section.id} role: ${getStorefrontSectionLabel(section)}`,
      `Section ${section.id} title: ${section.title}`,
      `Section ${section.id} copy: ${section.body ?? ""}`,
    ]),
  ].join("\n");
}

function generatedRequiredText(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();

  return trimmed || fallback;
}

function generatedTextOrFallback(value: string | undefined, fallback: string | undefined) {
  const trimmed = value?.trim();

  return trimmed || fallback;
}
