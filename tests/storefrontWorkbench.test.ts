import { describe, expect, it } from "vitest";
import { regenerateStorefrontWorkbenchText } from "@/application/storefrontWorkbench";
import { baselineStorefront } from "@/fixtures/storefront";
import type { CodexHarness } from "@/harness/codexHarness";
import { fixtureCodexHarness } from "./support/fixtureCodexHarness";

describe("storefront config workbench", () => {
  it("uses one master prompt to regenerate every editable text field at once", async () => {
    let sentPrompt = "";
    const harness: CodexHarness = {
      ...fixtureCodexHarness,
      async generateStorefrontAdaptation(input) {
        sentPrompt = input.operatorPrompt;

        return {
          ...input.sourceStorefront,
          versionName: "Launch Week Edit",
          style: {
            ...input.sourceStorefront.style,
            theme: "launch-week",
          },
          visualAsset: {
            ...input.sourceStorefront.visualAsset,
            prompt: "A polished launch-week hero scene for useful Atlas gifts.",
            alt: "Launch-week gifting scene with Atlas and Co. products.",
          },
          sections: input.sourceStorefront.sections.map((section, index) => ({
            ...section,
            title: `Launch section ${index + 1}`,
            body: `Launch copy ${index + 1}`,
          })),
        };
      },
    };

    const updatedConfig = await regenerateStorefrontWorkbenchText({
      config: baselineStorefront,
      masterPrompt: "Make every text field feel like a confident launch-week campaign.",
      harness,
    });

    expect(sentPrompt).toContain(
      "Make every text field feel like a confident launch-week campaign.",
    );
    expect(sentPrompt).toContain(`Selection name: ${baselineStorefront.versionName}`);
    expect(sentPrompt).toContain(`Visual selection theme: ${baselineStorefront.style.theme}`);
    expect(sentPrompt).toContain(`Hero visual prompt: ${baselineStorefront.visualAsset.prompt}`);
    expect(sentPrompt).toContain(`Image alt text: ${baselineStorefront.visualAsset.alt}`);
    expect(sentPrompt).toContain(
      `Hero image slot: ${baselineStorefront.visualAsset.composition.slot}`,
    );
    expect(sentPrompt).toContain(
      `Hero image crop anchor: ${baselineStorefront.visualAsset.composition.objectPosition}`,
    );
    for (const section of baselineStorefront.sections) {
      expect(sentPrompt).toContain(`Section ${section.id} title: ${section.title}`);
      expect(sentPrompt).toContain(`Section ${section.id} copy: ${section.body ?? ""}`);
    }
    expect(updatedConfig.versionName).toBe("Launch Week Edit");
    expect(updatedConfig.style.theme).toBe(baselineStorefront.style.theme);
    expect(updatedConfig.visualAsset.prompt).toBe(
      "A polished launch-week hero scene for useful Atlas gifts.",
    );
    expect(updatedConfig.visualAsset.alt).toBe(
      "Launch-week gifting scene with Atlas and Co. products.",
    );
    expect(updatedConfig.sections.map((section) => section.title)).toEqual(
      baselineStorefront.sections.map((_, index) => `Launch section ${index + 1}`),
    );
    expect(updatedConfig.sections.map((section) => section.body)).toEqual(
      baselineStorefront.sections.map((_, index) => `Launch copy ${index + 1}`),
    );
    expect(updatedConfig.sections.map((section) => section.productIds)).toEqual(
      baselineStorefront.sections.map((section) => section.productIds),
    );
  });

  it("rejects an empty master prompt before calling Codex", async () => {
    await expect(
      regenerateStorefrontWorkbenchText({
        config: baselineStorefront,
        masterPrompt: "   ",
        harness: fixtureCodexHarness,
      }),
    ).rejects.toThrow("Add a master prompt before regenerating the config workbench.");
  });

  it("keeps current workbench text when generated fields are blank", async () => {
    const harness: CodexHarness = {
      ...fixtureCodexHarness,
      async generateStorefrontAdaptation(input) {
        return {
          ...input.sourceStorefront,
          versionName: " ",
          visualAsset: {
            ...input.sourceStorefront.visualAsset,
            prompt: "",
            alt: " ",
          },
          sections: [],
        };
      },
    };

    const updatedConfig = await regenerateStorefrontWorkbenchText({
      config: baselineStorefront,
      masterPrompt: "Try an empty response.",
      harness,
    });

    expect(updatedConfig.versionName).toBe(baselineStorefront.versionName);
    expect(updatedConfig.visualAsset.prompt).toBe(baselineStorefront.visualAsset.prompt);
    expect(updatedConfig.visualAsset.alt).toBe(baselineStorefront.visualAsset.alt);
    expect(updatedConfig.sections).toEqual(baselineStorefront.sections);
  });
});
