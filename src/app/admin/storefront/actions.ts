"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireCurrentUser, storefrontPreviewCookieName } from "@/app/auth/session";
import { requirePermission } from "@/domain/auth";
import { appendCodexRunEvent, createCodexRun } from "@/domain/codexRun";
import {
  getStorefrontSectionLabel,
  resolveStorefrontSectionIntent,
  type StorefrontConfig,
  storefrontConfigSchema,
  validateStorefrontProductReferences,
} from "@/domain/storefront";
import type { GeneratedStorefrontConfig } from "@/domain/storefrontDraft";
import {
  basicStorefrontId,
  publishBaselineStorefront,
  publishStorefrontConfig,
  rollbackStorefrontVersion,
} from "@/domain/storefrontPublishing";
import { regenerateStorefrontWorkbenchTextWithTrace } from "@/domain/storefrontWorkbench";
import { products } from "@/fixtures/products";
import { baselineStorefront } from "@/fixtures/storefront";
import { getCodexHarness } from "@/harness/codexHarness";
import { generatedEventImageHarness } from "@/harness/imageHarness";
import { getAppDatabase } from "@/persistence/appDatabase";
import type { CommerceDatabase } from "@/persistence/database";

const storefrontAdminPath = "/admin/storefront";

export async function publishStorefrontConfigAction(formData: FormData) {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const storefrontConfigId = String(formData.get("storefrontConfigId") ?? "");
  const database = getAppDatabase();
  const storefrontConfig = database.findStorefrontConfigById(storefrontConfigId);

  if (!storefrontConfig) {
    throw new Error("Storefront config was not found for publishing.");
  }

  const version = publishStorefrontConfig({
    id: randomUUID(),
    storefrontConfig,
    publishedByUserId: user.id,
    publishedAt: new Date(),
    publicationStore: database,
  });
  const cookieStore = await cookies();
  cookieStore.delete(storefrontPreviewCookieName);

  revalidatePath(storefrontAdminPath);
  revalidatePath("/");
  revalidatePath("/store");
  redirect(`${storefrontAdminPath}?storefront=${storefrontConfigId}&version=${version.id}`);
}

export async function markStorefrontConfigReadyAction(formData: FormData) {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const storefrontConfigId = String(formData.get("storefrontConfigId") ?? "");
  const database = getAppDatabase();
  const storefrontConfig = database.findStorefrontConfigById(storefrontConfigId);

  if (!storefrontConfig) {
    throw new Error("Storefront config was not found for review.");
  }

  if (storefrontConfig.validationErrors.length > 0) {
    throw new Error("Only valid storefront configs can be marked ready.");
  }

  database.saveStorefrontConfig({
    ...storefrontConfig,
    validationStatus: "ready",
  });

  revalidatePath(storefrontAdminPath);
  revalidatePath("/");
  redirect(`${storefrontAdminPath}?storefront=${storefrontConfigId}`);
}

export async function moveStorefrontConfigToDraftAction(formData: FormData) {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const storefrontConfigId = String(formData.get("storefrontConfigId") ?? "");
  const database = getAppDatabase();
  const storefrontConfig = database.findStorefrontConfigById(storefrontConfigId);

  if (!storefrontConfig) {
    throw new Error("Storefront config was not found for review.");
  }

  database.saveStorefrontConfig({
    ...storefrontConfig,
    validationStatus: storefrontConfig.validationErrors.length > 0 ? "invalid" : "draft",
  });

  revalidatePath(storefrontAdminPath);
  revalidatePath("/");
  redirect(`${storefrontAdminPath}?storefront=${storefrontConfigId}`);
}

export async function publishBasicStorefrontAction() {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const database = getAppDatabase();
  const version = publishBaselineStorefront({
    id: randomUUID(),
    baseline: baselineStorefront,
    publishedByUserId: user.id,
    publishedAt: new Date(),
    publicationStore: database,
  });
  const cookieStore = await cookies();
  cookieStore.delete(storefrontPreviewCookieName);

  revalidatePath(storefrontAdminPath);
  revalidatePath("/");
  revalidatePath("/store");
  redirect(`${storefrontAdminPath}?storefront=${basicStorefrontId}&version=${version.id}`);
}

export async function previewStorefrontForCurrentUserAction(formData: FormData) {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const storefrontId = String(formData.get("storefrontId") ?? "");
  const database = getAppDatabase();
  const isKnownPreview =
    storefrontId === basicStorefrontId ||
    Boolean(database.findStorefrontConfigById(storefrontId)) ||
    Boolean(database.findPublishedStorefrontVersionById(storefrontId));

  if (!isKnownPreview) {
    throw new Error("Storefront preview target was not found.");
  }

  const cookieStore = await cookies();
  cookieStore.set(storefrontPreviewCookieName, storefrontId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  revalidatePath(storefrontAdminPath);
  revalidatePath("/");
  redirect("/");
}

export async function applyStorefrontSelectionAction(formData: FormData) {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const storefrontId = String(formData.get("storefrontId") ?? "");
  const database = getAppDatabase();

  if (storefrontId === basicStorefrontId) {
    publishBaselineStorefront({
      id: randomUUID(),
      baseline: baselineStorefront,
      publishedByUserId: user.id,
      publishedAt: new Date(),
      publicationStore: database,
    });
  } else {
    const storefrontConfig = database.findStorefrontConfigById(storefrontId);

    if (!storefrontConfig) {
      throw new Error("Storefront config was not found for publishing.");
    }

    publishStorefrontConfig({
      id: randomUUID(),
      storefrontConfig,
      publishedByUserId: user.id,
      publishedAt: new Date(),
      publicationStore: database,
    });
  }

  const cookieStore = await cookies();
  cookieStore.delete(storefrontPreviewCookieName);

  revalidatePath(storefrontAdminPath);
  revalidatePath("/");
  revalidatePath("/store");
  redirect("/");
}

export async function clearStorefrontPreviewAction() {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const cookieStore = await cookies();
  cookieStore.delete(storefrontPreviewCookieName);

  revalidatePath(storefrontAdminPath);
  revalidatePath("/");
  redirect("/");
}

export async function rollbackStorefrontVersionAction(formData: FormData) {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const versionId = String(formData.get("versionId") ?? "");
  const database = getAppDatabase();
  const targetVersion = database.findPublishedStorefrontVersionById(versionId);

  if (!targetVersion) {
    throw new Error("Storefront version was not found for rollback.");
  }

  const rollbackVersion = rollbackStorefrontVersion({
    id: randomUUID(),
    targetVersion,
    rolledBackByUserId: user.id,
    rolledBackAt: new Date(),
    publicationStore: database,
  });

  revalidatePath(storefrontAdminPath);
  revalidatePath("/");
  revalidatePath("/store");
  redirect(`${storefrontAdminPath}?version=${rollbackVersion.id}`);
}

export async function updateStorefrontPaletteAction(formData: FormData) {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const storefrontConfigId = String(formData.get("storefrontConfigId") ?? "");
  const database = getAppDatabase();
  const storefrontConfig = database.findStorefrontConfigById(storefrontConfigId);

  if (!storefrontConfig) {
    throw new Error("Storefront draft was not found for palette editing.");
  }

  const palette = {
    background: readColor(formData, "background", storefrontConfig.config.style.accentColor),
    surface: readColor(formData, "surface", "#ffffff"),
    text: readColor(formData, "text", "#0b1020"),
    muted: readColor(formData, "muted", "#42526e"),
    border: readColor(formData, "border", storefrontConfig.config.style.accentColor),
    accent: readColor(formData, "accent", storefrontConfig.config.style.accentColor),
    secondaryAccent: readColor(formData, "secondaryAccent", "#22d3ee"),
    button: readColor(formData, "button", storefrontConfig.config.style.accentColor),
    buttonText: readColor(formData, "buttonText", "#ffffff"),
  };
  const selectionName = String(formData.get("selectionName") ?? "").trim();
  const updatedStorefrontConfig: GeneratedStorefrontConfig = {
    ...storefrontConfig,
    config: {
      ...storefrontConfig.config,
      versionName: selectionName || storefrontConfig.config.versionName,
      style: {
        ...storefrontConfig.config.style,
        accentColor: palette.accent,
        palette,
      },
    },
    validationStatus: resolveDraftStatus([]),
  };

  database.saveStorefrontConfig(updatedStorefrontConfig);
  const intent = String(formData.get("intent") ?? "save");

  if (intent === "activate") {
    const version = publishStorefrontConfig({
      id: randomUUID(),
      storefrontConfig: updatedStorefrontConfig,
      publishedByUserId: user.id,
      publishedAt: new Date(),
      publicationStore: database,
    });

    revalidatePath(storefrontAdminPath);
    revalidatePath("/");
    revalidatePath("/store");
    redirect(`${storefrontAdminPath}?storefront=${storefrontConfigId}&version=${version.id}`);
  }

  revalidatePath(storefrontAdminPath);
  revalidatePath("/");
  redirect(`${storefrontAdminPath}?storefront=${storefrontConfigId}`);
}

export async function regenerateStorefrontImageAction(formData: FormData) {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const storefrontConfigId = String(formData.get("storefrontConfigId") ?? "");
  const prompt = String(formData.get("imagePrompt") ?? "").trim();
  const database = getAppDatabase();
  const storefrontConfig = database.findStorefrontConfigById(storefrontConfigId);

  if (!storefrontConfig) {
    throw new Error("Storefront draft was not found for image regeneration.");
  }

  const replayRun = createStorefrontReplayRun({
    database,
    question: `Storefront hero image: ${storefrontConfig.config.versionName}`,
    userId: user.id,
  });
  saveStorefrontReplayEvent({
    database,
    runId: replayRun.id,
    stage: "prompt-prepared",
    message: "Hero image regeneration prompt prepared.",
    payload: {
      storefrontConfigId,
      prompt: prompt || storefrontConfig.config.visualAsset.prompt,
      composition: storefrontConfig.config.visualAsset.composition,
      imageHarnessMode: generatedEventImageHarness.mode,
    },
  });

  try {
    const imageInput = {
      campaignId: storefrontConfig.config.campaignId,
      eventName: storefrontConfig.config.versionName,
      visualDirection: prompt || storefrontConfig.config.visualAsset.prompt,
      composition: storefrontConfig.config.visualAsset.composition,
    };
    const visualAsset = await generatedEventImageHarness.generateCampaignHero({
      campaignId: imageInput.campaignId,
      eventName: imageInput.eventName,
      visualDirection: imageInput.visualDirection,
    });
    saveStorefrontReplayEvent({
      database,
      runId: replayRun.id,
      stage: "image-generated",
      message: "Hero image metadata generated and saved.",
      payload: {
        imageHarnessMode: generatedEventImageHarness.mode,
        input: imageInput,
        visualAsset,
      },
    });

    database.saveStorefrontConfig({
      ...storefrontConfig,
      config: {
        ...storefrontConfig.config,
        visualAsset,
      },
      validationStatus: "draft",
      validationErrors: storefrontConfig.validationErrors.filter(
        (error) => !error.startsWith("Generated image failed:"),
      ),
    });
  } catch (error) {
    database.saveStorefrontConfig({
      ...storefrontConfig,
      validationStatus: "invalid",
      validationErrors: [
        ...storefrontConfig.validationErrors.filter(
          (validationError) => !validationError.startsWith("Generated image failed:"),
        ),
        `Generated image failed: ${error instanceof Error ? error.message : "Unknown image error"}`,
      ],
    });
    saveStorefrontReplayEvent({
      database,
      runId: replayRun.id,
      stage: "failed",
      message: error instanceof Error ? error.message : "Hero image regeneration failed.",
    });
  }

  revalidatePath(storefrontAdminPath);
  revalidatePath("/");
  redirect(`${storefrontAdminPath}?storefront=${storefrontConfigId}`);
}

export async function updateStorefrontConfigContentAction(formData: FormData) {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const storefrontConfigId = String(formData.get("storefrontConfigId") ?? "");
  const database = getAppDatabase();
  const storefrontConfig = database.findStorefrontConfigById(storefrontConfigId);

  if (!storefrontConfig) {
    throw new Error("Storefront draft was not found for content editing.");
  }

  const config = buildEditableStorefrontConfig(formData, storefrontConfig.config);
  const validationErrors = validateEditableStorefrontConfig(config);

  database.saveStorefrontConfig({
    ...storefrontConfig,
    config,
    validationStatus: validationErrors.length > 0 ? "invalid" : "draft",
    validationErrors,
  });

  revalidatePath(storefrontAdminPath);
  revalidatePath("/");
  redirect(`${storefrontAdminPath}?storefront=${storefrontConfigId}`);
}

export async function regenerateStorefrontConfigTextAction(formData: FormData) {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const storefrontConfigId = String(formData.get("storefrontConfigId") ?? "");
  const masterPrompt = String(formData.get("masterPrompt") ?? "").trim();
  const database = getAppDatabase();
  const storefrontConfig = database.findStorefrontConfigById(storefrontConfigId);

  if (!storefrontConfig) {
    throw new Error("Storefront draft was not found for master text regeneration.");
  }

  const editedConfig = buildEditableStorefrontConfig(formData, storefrontConfig.config);
  const replayRun = createStorefrontReplayRun({
    database,
    question: `Storefront master text: ${editedConfig.versionName}`,
    userId: user.id,
  });
  saveStorefrontReplayEvent({
    database,
    runId: replayRun.id,
    stage: "prompt-prepared",
    message: "Master text prompt prepared from all editable workbench text.",
    payload: {
      masterPrompt,
      currentConfig: editedConfig,
    },
  });
  const { config, generationTrace } = await regenerateStorefrontWorkbenchTextWithTrace({
    config: editedConfig,
    masterPrompt,
    harness: getCodexHarness(),
  });
  const validationErrors = validateEditableStorefrontConfig(config);
  saveStorefrontReplayEvent({
    database,
    runId: replayRun.id,
    stage: validationErrors.length > 0 ? "validation-failed" : "validated",
    message:
      validationErrors.length > 0
        ? validationErrors.join("\n")
        : "Generated workbench text passed validation and was saved.",
    payload: {
      generatedConfig: config,
      harnessMode: generationTrace.harnessMode,
      rawResponse: generationTrace.rawResponse,
      schemaName: generationTrace.schemaName,
    },
  });

  database.saveStorefrontConfig({
    ...storefrontConfig,
    config,
    validationStatus: validationErrors.length > 0 ? "invalid" : "draft",
    validationErrors,
  });

  revalidatePath(storefrontAdminPath);
  revalidatePath("/");
  redirect(`${storefrontAdminPath}?storefront=${storefrontConfigId}`);
}

export async function regenerateStorefrontConfigPartAction(formData: FormData) {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const storefrontConfigId = String(formData.get("storefrontConfigId") ?? "");
  const target = String(formData.get("target") ?? "");
  const localPrompt = String(formData.get("localPrompt") ?? "").trim();
  const database = getAppDatabase();
  const storefrontConfig = database.findStorefrontConfigById(storefrontConfigId);

  if (!storefrontConfig) {
    throw new Error("Storefront draft was not found for local regeneration.");
  }

  if (!localPrompt) {
    throw new Error("Add a local Codex instruction before regenerating this storefront block.");
  }

  if (target === "visualAsset") {
    const replayRun = createStorefrontReplayRun({
      database,
      question: `Storefront block image: ${storefrontConfig.config.versionName}`,
      userId: user.id,
    });
    saveStorefrontReplayEvent({
      database,
      runId: replayRun.id,
      stage: "prompt-prepared",
      message: "Block-level hero image prompt prepared.",
      payload: {
        storefrontConfigId,
        target,
        localPrompt,
        composition: storefrontConfig.config.visualAsset.composition,
        imageHarnessMode: generatedEventImageHarness.mode,
      },
    });
    try {
      const imageInput = {
        campaignId: storefrontConfig.config.campaignId,
        eventName: storefrontConfig.config.versionName,
        visualDirection: localPrompt,
        composition: storefrontConfig.config.visualAsset.composition,
      };
      const visualAsset = await generatedEventImageHarness.generateCampaignHero({
        campaignId: imageInput.campaignId,
        eventName: imageInput.eventName,
        visualDirection: imageInput.visualDirection,
      });
      saveStorefrontReplayEvent({
        database,
        runId: replayRun.id,
        stage: "image-generated",
        message: "Block-level hero image metadata generated and saved.",
        payload: {
          imageHarnessMode: generatedEventImageHarness.mode,
          input: imageInput,
          visualAsset,
        },
      });

      database.saveStorefrontConfig({
        ...storefrontConfig,
        config: {
          ...storefrontConfig.config,
          visualAsset,
        },
        validationStatus: "draft",
        validationErrors: storefrontConfig.validationErrors.filter(
          (error) => !error.startsWith("Generated image failed:"),
        ),
      });
    } catch (error) {
      database.saveStorefrontConfig({
        ...storefrontConfig,
        validationStatus: "invalid",
        validationErrors: [
          ...storefrontConfig.validationErrors.filter(
            (validationError) => !validationError.startsWith("Generated image failed:"),
          ),
          `Generated image failed: ${error instanceof Error ? error.message : "Unknown image error"}`,
        ],
      });
      saveStorefrontReplayEvent({
        database,
        runId: replayRun.id,
        stage: "failed",
        message: error instanceof Error ? error.message : "Block-level image regeneration failed.",
      });
    }

    revalidatePath(storefrontAdminPath);
    revalidatePath("/");
    redirect(`${storefrontAdminPath}?storefront=${storefrontConfigId}`);
  }

  const targetSection = storefrontConfig.config.sections.find((section) => section.id === target);

  if (!targetSection) {
    throw new Error("The selected storefront section could not be regenerated.");
  }

  const replayRun = createStorefrontReplayRun({
    database,
    question: `Storefront section text: ${targetSection.title}`,
    userId: user.id,
  });
  const operatorPrompt = [
    "Regenerate only one storefront section while preserving the rest of the draft.",
    `Target section role: ${getStorefrontSectionLabel(targetSection)}`,
    `Target section id: ${targetSection.id}`,
    `Target section type: ${targetSection.type}`,
    `Target section intent: ${resolveStorefrontSectionIntent(targetSection)}`,
    `Local instruction: ${localPrompt}`,
    `Current hero visual direction: ${storefrontConfig.config.visualAsset.prompt}`,
  ].join("\n");
  saveStorefrontReplayEvent({
    database,
    runId: replayRun.id,
    stage: "prompt-prepared",
    message: "Section regeneration prompt prepared.",
    payload: {
      storefrontConfigId,
      targetSection,
      operatorPrompt,
    },
  });
  const generationTrace = await getCodexHarness().generateStorefrontAdaptationTrace({
    eventName: storefrontConfig.config.versionName,
    operatorPrompt,
    sourceStorefront: storefrontConfig.config,
  });
  const generatedConfig = generationTrace.value;
  const generatedSection =
    generatedConfig.sections.find((section) => section.id === targetSection.id) ??
    generatedConfig.sections.find((section) => section.type === targetSection.type) ??
    generatedConfig.sections[0];

  const config: StorefrontConfig = {
    ...storefrontConfig.config,
    sections: storefrontConfig.config.sections.map((section) =>
      section.id === targetSection.id
        ? {
            ...section,
            title: generatedSection?.title ?? section.title,
            body: generatedSection?.body ?? section.body,
            productIds:
              generatedSection && generatedSection.productIds.length > 0
                ? generatedSection.productIds
                : section.productIds,
          }
        : section,
    ),
  };
  const validationErrors = validateEditableStorefrontConfig(config);
  saveStorefrontReplayEvent({
    database,
    runId: replayRun.id,
    stage: validationErrors.length > 0 ? "validation-failed" : "validated",
    message:
      validationErrors.length > 0
        ? validationErrors.join("\n")
        : "Generated section text passed validation and was saved.",
    payload: {
      generatedSection,
      generatedConfig: config,
      harnessMode: generationTrace.harnessMode,
      rawResponse: generationTrace.rawResponse,
      schemaName: generationTrace.schemaName,
    },
  });

  database.saveStorefrontConfig({
    ...storefrontConfig,
    config,
    validationStatus: validationErrors.length > 0 ? "invalid" : "draft",
    validationErrors,
  });

  revalidatePath(storefrontAdminPath);
  revalidatePath("/");
  redirect(`${storefrontAdminPath}?storefront=${storefrontConfigId}`);
}

export async function resetStorefrontConfigProfileAction(formData: FormData) {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const storefrontConfigId = String(formData.get("storefrontConfigId") ?? "");
  const profile = String(formData.get("profile") ?? "basic");
  const database = getAppDatabase();
  const storefrontConfig = database.findStorefrontConfigById(storefrontConfigId);

  if (!storefrontConfig) {
    throw new Error("Storefront draft was not found for profile reset.");
  }

  const basicStyle: StorefrontConfig["style"] = {
    theme: "basic",
    accentColor: "#2563eb",
    density: "comfortable",
    palette: {
      background: "#f9fbff",
      surface: "#ffffff",
      text: "#0b1020",
      muted: "#42526e",
      border: "#c7d7ff",
      accent: "#2563eb",
      secondaryAccent: "#22d3ee",
      button: "#0b1020",
      buttonText: "#ffffff",
    },
  };
  const config: StorefrontConfig =
    profile === "default"
      ? {
          ...baselineStorefront,
          id: storefrontConfig.config.id,
          campaignId: storefrontConfig.config.campaignId,
          versionName: "Default Atlas & Co.",
          visualAsset: {
            ...baselineStorefront.visualAsset,
            id: `${storefrontConfig.config.campaignId}-default-hero-asset`,
            campaignId: storefrontConfig.config.campaignId,
          },
        }
      : {
          ...storefrontConfig.config,
          versionName: `${storefrontConfig.config.versionName} Basic`,
          style: basicStyle,
          visualAsset: {
            ...baselineStorefront.visualAsset,
            id: `${storefrontConfig.config.campaignId}-basic-hero-asset`,
            campaignId: storefrontConfig.config.campaignId,
          },
        };
  const validationErrors = validateEditableStorefrontConfig(config);

  database.saveStorefrontConfig({
    ...storefrontConfig,
    config,
    validationStatus: validationErrors.length > 0 ? "invalid" : "draft",
    validationErrors,
  });

  revalidatePath(storefrontAdminPath);
  revalidatePath("/");
  redirect(`${storefrontAdminPath}?storefront=${storefrontConfigId}`);
}

export async function deleteStorefrontConfigAction(formData: FormData) {
  const user = await requireCurrentUser("publish_storefront");

  requirePermission(user, "publish_storefront");

  const storefrontConfigId = String(formData.get("storefrontConfigId") ?? "");
  const database = getAppDatabase();
  const storefrontConfig = database.findStorefrontConfigById(storefrontConfigId);

  if (!storefrontConfig) {
    throw new Error("Storefront draft was not found for deletion.");
  }

  database.deleteStorefrontConfig(storefrontConfigId);
  revalidatePath(storefrontAdminPath);
  redirect(storefrontAdminPath);
}

function readColor(formData: FormData, name: string, fallback: string) {
  const value = String(formData.get(name) ?? fallback);

  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function readDensity(formData: FormData, fallback: StorefrontConfig["style"]["density"]) {
  const value = String(formData.get("density") ?? fallback);

  return value === "compact" || value === "comfortable" || value === "editorial" ? value : fallback;
}

function readProductIds(formData: FormData, name: string) {
  return String(formData.get(name) ?? "")
    .split(",")
    .map((productId) => productId.trim())
    .filter(Boolean);
}

function buildEditableStorefrontConfig(formData: FormData, currentConfig: StorefrontConfig) {
  const sectionIds = formData.getAll("sectionId").map(String);
  const sections = currentConfig.sections.map((section) => {
    if (!sectionIds.includes(section.id)) {
      return section;
    }

    const title = String(formData.get(`sectionTitle:${section.id}`) ?? section.title).trim();
    const body = String(formData.get(`sectionBody:${section.id}`) ?? section.body ?? "").trim();
    const productIds = readProductIds(formData, `sectionProducts:${section.id}`);

    return {
      ...section,
      title: title || section.title,
      body: body || undefined,
      productIds,
    };
  });
  const versionName = String(formData.get("versionName") ?? currentConfig.versionName).trim();
  const theme = String(formData.get("theme") ?? currentConfig.style.theme).trim();
  const density = readDensity(formData, currentConfig.style.density);
  const visualPrompt = String(
    formData.get("visualPrompt") ?? currentConfig.visualAsset.prompt,
  ).trim();
  const visualAlt = String(formData.get("visualAlt") ?? currentConfig.visualAsset.alt).trim();

  return {
    ...currentConfig,
    versionName: versionName || currentConfig.versionName,
    style: {
      ...currentConfig.style,
      theme: theme || currentConfig.style.theme,
      density,
    },
    visualAsset: {
      ...currentConfig.visualAsset,
      prompt: visualPrompt || currentConfig.visualAsset.prompt,
      alt: visualAlt || currentConfig.visualAsset.alt,
    },
    sections,
  };
}

function createStorefrontReplayRun(input: {
  database: CommerceDatabase;
  question: string;
  userId: string;
}) {
  const run = createCodexRun({
    id: randomUUID(),
    question: input.question,
    createdByUserId: input.userId,
    createdAt: new Date(),
  });

  input.database.saveCodexRun(run);

  return run;
}

function saveStorefrontReplayEvent(input: {
  database: CommerceDatabase;
  runId: string;
  stage: string;
  message: string;
  payload?: Record<string, unknown>;
}) {
  input.database.saveCodexRunEvent(
    appendCodexRunEvent(input.runId, input.stage, input.message, new Date(), input.payload ?? {}),
  );
}

function validateEditableStorefrontConfig(config: StorefrontConfig) {
  const parsed = storefrontConfigSchema.safeParse(config);
  const errors = parsed.success
    ? []
    : parsed.error.issues.map((issue) => `Invalid storefront config: ${issue.message}`);
  const validProductIds = new Set(products.map((product) => product.id));

  for (const productId of validateStorefrontProductReferences(config, validProductIds)) {
    errors.push(`Storefront section references unknown product "${productId}".`);
  }

  if (config.visualAsset.campaignId !== config.campaignId) {
    errors.push(
      `Storefront visual asset campaign "${config.visualAsset.campaignId}" does not match storefront campaign "${config.campaignId}".`,
    );
  }

  return errors;
}

function resolveDraftStatus(
  validationErrors: string[],
): GeneratedStorefrontConfig["validationStatus"] {
  return validationErrors.length > 0 ? "invalid" : "draft";
}
