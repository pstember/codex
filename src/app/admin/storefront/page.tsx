import Image from "next/image";
import {
  markStorefrontConfigReadyAction,
  moveStorefrontConfigToDraftAction,
  publishStorefrontConfigAction,
  regenerateStorefrontConfigPartAction,
  regenerateStorefrontConfigTextAction,
  resetStorefrontConfigProfileAction,
  rollbackStorefrontVersionAction,
  updateStorefrontConfigContentAction,
} from "@/app/admin/storefront/actions";
import {
  StorefrontAdaptationStudio,
  type StorefrontDraftSummary,
} from "@/app/admin/storefront/StorefrontAdaptationStudio";
import { getStorefrontPreviewId, requireCurrentUser } from "@/app/auth/session";
import { AppChrome } from "@/app/components/AppChrome";
import {
  describeStorefrontHeroImageComposition,
  getStorefrontSectionLabel,
  resolveStorefrontHeroImageComposition,
  resolveStorefrontHeroImageObjectPosition,
  type StorefrontSection,
  storefrontSectionIntentLabels,
} from "@/domain/storefront";
import {
  buildStorefrontGalleryEntries,
  compareStorefrontVersions,
} from "@/domain/storefrontPublishing";
import { products } from "@/fixtures/products";
import { baselineStorefront } from "@/fixtures/storefront";
import { getAppDatabase } from "@/persistence/appDatabase";

export default async function OperatorPage({
  searchParams,
}: {
  searchParams?: Promise<{
    trace?: string;
    proposal?: string;
    storefront?: string;
    version?: string;
    compare?: string;
  }>;
}) {
  const user = await requireCurrentUser("publish_storefront");
  const params = await searchParams;
  const database = getAppDatabase();
  const storefrontConfigs = database.listRecentStorefrontConfigs(100);
  const publishedVersions = database.listPublishedStorefrontVersions();
  const activeVersion = database.findActiveStorefrontVersion();
  const previewStorefrontId = await getStorefrontPreviewId();
  const recentReplayRuns = database
    .listRecentCodexRuns(8)
    .filter((run) => run.question.startsWith("Storefront "))
    .map((run) => {
      const runEvents = database.listCodexRunEvents(run.id);

      return {
        id: run.id,
        label: run.question.replace(/^Storefront /, ""),
        status: runEvents.at(-1)?.stage ?? "pending",
        traceEvents: runEvents.map((event) => ({
          stage: event.stage,
          title: formatReplayStage(event.stage),
          body: event.message,
          payload:
            Object.keys(event.payload).length > 0
              ? JSON.stringify(event.payload, null, 2)
              : undefined,
        })),
      };
    });
  const adaptationDrafts = storefrontConfigs
    .filter((config) => config.sourceDraftKey.startsWith("adaptation:"))
    .map(
      (config): StorefrontDraftSummary => ({
        id: config.id,
        versionName: config.config.versionName,
        sourceDraftKey: config.sourceDraftKey,
        validationStatus: config.validationStatus,
        validationErrors: config.validationErrors,
        createdAtLabel: config.createdAt.toLocaleString("en-GB"),
        config: config.config,
      }),
    );
  const galleryEntries = buildStorefrontGalleryEntries({
    drafts: storefrontConfigs.filter((config) => config.sourceDraftKey.startsWith("adaptation:")),
    activeVersion,
    baseline: baselineStorefront,
    previewStorefrontId,
  });
  const selectedGalleryEntry =
    galleryEntries.find((entry) => entry.id === params?.storefront) ??
    galleryEntries.find((entry) => entry.isPreviewing) ??
    galleryEntries[0];
  const selectedStorefrontConfig =
    selectedGalleryEntry?.kind === "draft"
      ? database.findStorefrontConfigById(selectedGalleryEntry.id)
      : null;
  const selectedAdaptationDraft =
    selectedGalleryEntry?.kind === "basic"
      ? null
      : selectedStorefrontConfig?.sourceDraftKey.startsWith("adaptation:")
        ? (adaptationDrafts.find((draft) => draft.id === selectedStorefrontConfig.id) ?? null)
        : (adaptationDrafts[0] ?? null);
  const activeStorefront = activeVersion?.config ?? baselineStorefront;
  const currentWorkingStorefront =
    selectedGalleryEntry?.config ?? selectedStorefrontConfig?.config ?? activeStorefront;
  const currentComparison = compareStorefrontVersions({
    base: activeStorefront,
    selected: currentWorkingStorefront,
  });
  const sourceOptions = [
    { id: "baseline", label: "Baseline Atlas & Co." },
    ...publishedVersions.map((version) => ({
      id: version.id,
      label: `${version.config.versionName} (${version.status})`,
    })),
  ];
  const productsById = new Map(products.map((product) => [product.id, product]));

  return (
    <AppChrome eyebrow="Store Operator" title="Visual adaptation studio" user={user}>
      <StorefrontAdaptationStudio
        activeStorefront={activeStorefront}
        drafts={adaptationDrafts}
        galleryEntries={galleryEntries}
        recentReplayRuns={recentReplayRuns}
        selectedDraft={selectedAdaptationDraft}
        selectedGalleryEntry={selectedGalleryEntry}
        sourceOptions={sourceOptions}
      />

      <section className="mt-6 rounded-lg border border-[#c7d7ff] bg-white/85 p-5 shadow-[0_18px_70px_rgba(8,13,31,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2563eb]">
              Edit and compare
            </p>
            <h2 className="mt-2 text-3xl font-black text-[#0b1020]">
              {selectedStorefrontConfig?.config.versionName ?? currentWorkingStorefront.versionName}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#42526e]">
              Refine the selected draft on the left, then use the review column to check what will
              change before publishing.
            </p>
          </div>
          {selectedStorefrontConfig ? (
            <span
              className={resolveDraftStatusChipClassName(selectedStorefrontConfig.validationStatus)}
            >
              {selectedStorefrontConfig.validationStatus}
            </span>
          ) : null}
        </div>

        {selectedStorefrontConfig?.validationErrors.length ? (
          <ul className="mt-4 space-y-1 text-sm text-red-700">
            {selectedStorefrontConfig.validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)] xl:items-start">
          <div className="grid gap-5">
            {selectedStorefrontConfig ? (
              <>
                <form action={updateStorefrontConfigContentAction} id="storefront-config-editor">
                  <input
                    name="storefrontConfigId"
                    type="hidden"
                    value={selectedStorefrontConfig.id}
                  />
                </form>

                <div className="rounded-lg bg-[#eef5ff] p-4">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <label className="grid gap-2 text-sm font-bold text-[#17203a]">
                      Master prompt
                      <textarea
                        className="min-h-28 resize-y rounded-md border border-[#abc2ff] bg-white px-3 py-3 text-sm font-semibold leading-6 text-[#0b1020] outline-none focus:ring-4 focus:ring-[#22d3ee]/25"
                        form="storefront-config-editor"
                        name="masterPrompt"
                        placeholder="Rewrite all editable copy for a launch-week gift guide while keeping this draft's visual selection and product placements."
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-md bg-[#2563eb] px-4 py-2 text-sm font-black text-white"
                        form="storefront-config-editor"
                        formAction={regenerateStorefrontConfigTextAction}
                        type="submit"
                      >
                        Generate all text
                      </button>
                      <button
                        className="rounded-md bg-[#0b1020] px-4 py-2 text-sm font-black text-white"
                        form="storefront-config-editor"
                        type="submit"
                      >
                        Save draft edits
                      </button>
                      {selectedStorefrontConfig.validationStatus === "draft" ? (
                        <form action={markStorefrontConfigReadyAction}>
                          <input
                            name="storefrontConfigId"
                            type="hidden"
                            value={selectedStorefrontConfig.id}
                          />
                          <button
                            className="rounded-md bg-[#d7ff3f] px-4 py-2 text-sm font-black text-[#0b1020]"
                            type="submit"
                          >
                            Mark ready to publish
                          </button>
                        </form>
                      ) : null}
                      {selectedStorefrontConfig.validationStatus === "ready" ? (
                        <form action={moveStorefrontConfigToDraftAction}>
                          <input
                            name="storefrontConfigId"
                            type="hidden"
                            value={selectedStorefrontConfig.id}
                          />
                          <button
                            className="rounded-md border border-[#cbd5e1] px-4 py-2 text-sm font-black text-[#334155]"
                            type="submit"
                          >
                            Move back to draft
                          </button>
                        </form>
                      ) : null}
                      {selectedStorefrontConfig.validationStatus === "ready" ? (
                        <form action={publishStorefrontConfigAction}>
                          <input
                            name="storefrontConfigId"
                            type="hidden"
                            value={selectedStorefrontConfig.id}
                          />
                          <button
                            className="rounded-md bg-[#d7ff3f] px-4 py-2 text-sm font-black text-[#0b1020]"
                            type="submit"
                          >
                            Publish for everyone
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                    Saves to selected draft: {selectedStorefrontConfig.config.versionName}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#42526e]">
                    Save draft edits keeps your manual text, product, and theme changes. Generate
                    all text runs Codex and logs a new observability trace.
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#42526e]">
                    Draft means private work in progress. Ready means approved but not live. Publish
                    for everyone makes this the live storefront.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.72fr)_minmax(0,1fr)]">
                  <label className="grid content-start gap-2 text-sm font-bold text-[#17203a]">
                    Selection name
                    <input
                      className="rounded-md border border-[#abc2ff] bg-white px-3 py-2 font-semibold text-[#0b1020] outline-none focus:ring-4 focus:ring-[#22d3ee]/25"
                      defaultValue={selectedStorefrontConfig.config.versionName}
                      form="storefront-config-editor"
                      name="versionName"
                    />
                  </label>

                  <div className="grid gap-4 rounded-lg bg-[#f8fbff] p-4 md:grid-cols-[190px_1fr]">
                    <Image
                      alt={selectedStorefrontConfig.config.visualAsset.alt}
                      className="w-full rounded-md object-cover"
                      height={720}
                      src={selectedStorefrontConfig.config.visualAsset.path}
                      style={{
                        aspectRatio: resolveStorefrontHeroImageComposition(
                          selectedStorefrontConfig.config.visualAsset,
                        ).aspectRatio,
                        objectPosition: resolveStorefrontHeroImageObjectPosition(
                          selectedStorefrontConfig.config.visualAsset,
                        ),
                      }}
                      width={1200}
                    />
                    <form action={regenerateStorefrontConfigPartAction} className="grid gap-2">
                      <input
                        name="storefrontConfigId"
                        type="hidden"
                        value={selectedStorefrontConfig.id}
                      />
                      <input name="target" type="hidden" value="visualAsset" />
                      <label className="grid gap-2 text-sm font-bold text-[#17203a]">
                        Hero image instruction
                        <input
                          className="rounded-md border border-[#abc2ff] bg-white px-3 py-2 font-semibold text-[#0b1020] outline-none focus:ring-4 focus:ring-[#22d3ee]/25"
                          defaultValue={selectedStorefrontConfig.config.visualAsset.prompt}
                          name="localPrompt"
                        />
                      </label>
                      <button
                        className="w-fit rounded-md border border-[#2563eb] px-4 py-2 text-sm font-black text-[#2563eb]"
                        type="submit"
                      >
                        Regenerate hero image
                      </button>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                        {describeStorefrontHeroImageComposition(
                          selectedStorefrontConfig.config.visualAsset,
                        )}
                      </p>
                    </form>
                  </div>
                </div>

                <details className="rounded-lg bg-white p-4 shadow-[0_10px_35px_rgba(8,13,31,0.06)]">
                  <summary className="cursor-pointer text-sm font-black text-[#0b1020]">
                    Advanced draft details
                  </summary>
                  <div className="mt-4 grid gap-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-bold text-[#17203a]">
                        Density
                        <select
                          className="rounded-md border border-[#abc2ff] bg-white px-3 py-2 font-semibold text-[#0b1020] outline-none focus:ring-4 focus:ring-[#22d3ee]/25"
                          defaultValue={selectedStorefrontConfig.config.style.density}
                          form="storefront-config-editor"
                          name="density"
                        >
                          <option value="compact">compact</option>
                          <option value="comfortable">comfortable</option>
                          <option value="editorial">editorial</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-bold text-[#17203a]">
                        Theme
                        <input
                          className="rounded-md border border-[#abc2ff] bg-white px-3 py-2 font-semibold text-[#0b1020] outline-none focus:ring-4 focus:ring-[#22d3ee]/25"
                          defaultValue={selectedStorefrontConfig.config.style.theme}
                          form="storefront-config-editor"
                          name="theme"
                        />
                      </label>
                    </div>
                    <label className="grid gap-2 text-sm font-bold text-[#17203a]">
                      Image alt text
                      <textarea
                        className="min-h-20 resize-y rounded-md border border-[#abc2ff] bg-white px-3 py-3 text-sm font-semibold leading-6 text-[#0b1020] outline-none focus:ring-4 focus:ring-[#22d3ee]/25"
                        defaultValue={selectedStorefrontConfig.config.visualAsset.alt}
                        form="storefront-config-editor"
                        name="visualAlt"
                      />
                    </label>
                    <input
                      form="storefront-config-editor"
                      name="visualPrompt"
                      type="hidden"
                      value={selectedStorefrontConfig.config.visualAsset.prompt}
                    />
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                      {selectedStorefrontConfig.config.visualAsset.source} asset ·{" "}
                      {selectedStorefrontConfig.config.visualAsset.path}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                      Hero slot ·{" "}
                      {describeStorefrontHeroImageComposition(
                        selectedStorefrontConfig.config.visualAsset,
                      )}
                    </p>
                    <div className="grid gap-3">
                      {selectedStorefrontConfig.config.sections.map((section) => (
                        <label
                          className="grid gap-2 text-sm font-bold text-[#17203a]"
                          key={section.id}
                        >
                          {sectionAdminLabel(section)} products
                          <input
                            className="rounded-md border border-[#abc2ff] bg-white px-3 py-2 font-mono text-sm font-semibold text-[#0b1020] outline-none focus:ring-4 focus:ring-[#22d3ee]/25"
                            defaultValue={section.productIds.join(", ")}
                            form="storefront-config-editor"
                            name={`sectionProducts:${section.id}`}
                          />
                        </label>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={resetStorefrontConfigProfileAction}>
                        <input
                          name="storefrontConfigId"
                          type="hidden"
                          value={selectedStorefrontConfig.id}
                        />
                        <button
                          className="rounded-md border border-[#c7d7ff] px-4 py-2 text-sm font-black text-[#2563eb]"
                          name="profile"
                          type="submit"
                          value="basic"
                        >
                          Apply basic profile
                        </button>
                      </form>
                      <form action={resetStorefrontConfigProfileAction}>
                        <input
                          name="storefrontConfigId"
                          type="hidden"
                          value={selectedStorefrontConfig.id}
                        />
                        <button
                          className="rounded-md border border-[#c7d7ff] px-4 py-2 text-sm font-black text-[#0b1020]"
                          name="profile"
                          type="submit"
                          value="default"
                        >
                          Revert to default
                        </button>
                      </form>
                    </div>
                  </div>
                </details>

                <div className="grid gap-4 lg:grid-cols-2">
                  {selectedStorefrontConfig.config.sections.map((section, index) => (
                    <article
                      className={`grid gap-3 rounded-lg bg-white p-4 shadow-[0_10px_35px_rgba(8,13,31,0.06)] ${
                        index === 0 ? "lg:col-span-2 lg:grid-cols-[0.85fr_1.15fr]" : ""
                      }`}
                      key={section.id}
                    >
                      <input
                        form="storefront-config-editor"
                        name="sectionId"
                        type="hidden"
                        value={section.id}
                      />
                      <div className="grid content-start gap-3">
                        <span className="w-fit rounded-full bg-[#eef5ff] px-2 py-1 text-xs font-black uppercase tracking-wide text-[#2563eb]">
                          {sectionAdminLabel(section)}
                        </span>
                        <label className="grid gap-2 text-sm font-bold text-[#17203a]">
                          Title
                          <input
                            className="rounded-md border border-[#abc2ff] bg-white px-3 py-2 font-semibold text-[#0b1020] outline-none focus:ring-4 focus:ring-[#22d3ee]/25"
                            defaultValue={section.title}
                            form="storefront-config-editor"
                            name={`sectionTitle:${section.id}`}
                          />
                        </label>
                        {section.productIds.length > 0 ? (
                          <p className="text-xs font-semibold leading-5 text-[#64748b]">
                            {section.productIds
                              .map((productId) => productsById.get(productId)?.name ?? productId)
                              .join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <div className="grid gap-3">
                        <label className="grid gap-2 text-sm font-bold text-[#17203a]">
                          Copy
                          <textarea
                            className="min-h-24 resize-y rounded-md border border-[#abc2ff] bg-white px-3 py-3 text-sm font-semibold leading-6 text-[#0b1020] outline-none focus:ring-4 focus:ring-[#22d3ee]/25"
                            defaultValue={section.body ?? ""}
                            form="storefront-config-editor"
                            name={`sectionBody:${section.id}`}
                          />
                        </label>
                        <form action={regenerateStorefrontConfigPartAction} className="grid gap-2">
                          <input
                            name="storefrontConfigId"
                            type="hidden"
                            value={selectedStorefrontConfig.id}
                          />
                          <input name="target" type="hidden" value={section.id} />
                          <label className="grid gap-2 text-sm font-bold text-[#17203a]">
                            Local Codex instruction
                            <input
                              className="rounded-md border border-[#abc2ff] bg-white px-3 py-2 font-semibold text-[#0b1020] outline-none focus:ring-4 focus:ring-[#22d3ee]/25"
                              name="localPrompt"
                              placeholder={`Regenerate this ${sectionAdminLabel(section).toLowerCase()} from the main event direction`}
                            />
                          </label>
                          <button
                            className="w-fit rounded-md border border-[#2563eb] px-4 py-2 text-sm font-black text-[#2563eb]"
                            type="submit"
                          >
                            Regenerate section
                          </button>
                        </form>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="rounded-lg bg-[#f8fbff] p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-[#2563eb]">
                    {storefrontSectionIntentLabels.allProducts}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#42526e]">
                    The public storefront keeps the full searchable catalog after these configured
                    sections. Codex cannot remove it from a draft.
                  </p>
                </div>
              </>
            ) : (
              <p className="rounded-lg bg-[#f8fbff] p-4 text-sm leading-6 text-[#42526e]">
                Select a generated draft from the style gallery to edit copy, image prompts, and
                section merchandising.
              </p>
            )}
          </div>

          <aside className="grid gap-4 xl:sticky xl:top-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  Compare with active
                </p>
                {activeVersion ? (
                  <p className="mt-2 text-sm leading-6 text-neutral-700">
                    Active Guest version: {activeVersion.config.versionName}
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Publish a storefront config to create the first Guest version.
                  </p>
                )}
                <p className="mt-1 text-sm leading-6 text-neutral-700">
                  Current working draft: {currentWorkingStorefront.versionName}
                </p>
              </div>
              <a
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900"
                href="/"
              >
                Open public storefront
              </a>
            </div>
            <div className="grid gap-3">
              <article className="rounded-lg bg-white p-4 shadow-[0_10px_35px_rgba(8,13,31,0.06)]">
                <h3 className="text-sm font-semibold text-neutral-900">Active to current</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  {currentComparison.baseVersionName} to {currentComparison.selectedVersionName}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {currentComparison.campaignChanged ? "Campaign changed" : "Same campaign"}
                </p>
              </article>
              <article className="rounded-lg bg-white p-4 shadow-[0_10px_35px_rgba(8,13,31,0.06)]">
                <h3 className="text-sm font-semibold text-neutral-900">Style changes</h3>
                {currentComparison.styleChanges.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm leading-6 text-neutral-700">
                    {currentComparison.styleChanges.map((change) => (
                      <li key={change.label}>
                        {change.label}: {change.before} to {change.after}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-neutral-600">No style changes.</p>
                )}
              </article>
              <article className="rounded-lg bg-white p-4 shadow-[0_10px_35px_rgba(8,13,31,0.06)]">
                <h3 className="text-sm font-semibold text-neutral-900">Product changes</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  Added: {formatProductIds(currentComparison.productChanges.added, productsById)}
                </p>
                <p className="mt-1 text-sm leading-6 text-neutral-700">
                  Removed:{" "}
                  {formatProductIds(currentComparison.productChanges.removed, productsById)}
                </p>
              </article>
            </div>
            <div className="rounded-lg bg-[#f8fbff] p-4">
              <h3 className="text-sm font-semibold text-neutral-900">Copy diff</h3>
              {currentComparison.textChanges.length > 0 ? (
                <div className="mt-3 grid gap-3">
                  {currentComparison.textChanges.map((change) => (
                    <article className="grid gap-3 rounded-md bg-white p-3" key={change.label}>
                      <p className="text-xs font-black uppercase tracking-wide text-[#2563eb]">
                        {change.label}
                      </p>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-[#64748b]">
                          Active
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#42526e]">
                          {change.before || "None"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-[#157f5b]">
                          Current
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#0b1020]">
                          {change.after || "None"}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Current draft copy matches the active storefront.
                </p>
              )}
            </div>
          </aside>
        </div>

        {publishedVersions.length > 0 ? (
          <details
            aria-label="Published storefront version history"
            className="mt-5 rounded-lg bg-white p-5 shadow-[0_10px_35px_rgba(8,13,31,0.06)]"
          >
            <summary className="cursor-pointer text-sm font-semibold text-neutral-900">
              Version history
            </summary>
            <ol className="mt-4 grid gap-3 text-sm">
              {publishedVersions.map((version) => (
                <li
                  className="grid gap-4 rounded-md border border-neutral-200 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                  key={version.id}
                >
                  <div>
                    <a
                      className="text-base font-semibold underline-offset-4 hover:underline"
                      href={`/admin/storefront?version=${version.id}`}
                    >
                      {version.config.versionName}
                    </a>
                    <p className="mt-1 text-neutral-600">
                      {version.status} · {version.publishedAt.toLocaleString("en-GB")}
                      {version.rollbackOfVersionId ? " · rollback" : ""}
                    </p>
                  </div>
                  {version.status === "inactive" ? (
                    <form action={rollbackStorefrontVersionAction}>
                      <input name="versionId" type="hidden" value={version.id} />
                      <button
                        className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900"
                        type="submit"
                      >
                        Roll back
                      </button>
                    </form>
                  ) : (
                    <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                      Live
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </section>
    </AppChrome>
  );
}

function resolveDraftStatusChipClassName(status: "draft" | "ready" | "invalid") {
  if (status === "invalid") {
    return "rounded-full bg-[#ffe4e6] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#be123c]";
  }

  if (status === "ready") {
    return "rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#92400e]";
  }

  return "rounded-full bg-[#dbeafe] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#1d4ed8]";
}

function formatProductIds(
  productIds: string[],
  productsById: Map<string, (typeof products)[number]>,
) {
  if (productIds.length === 0) {
    return "None";
  }

  return productIds.map((productId) => productsById.get(productId)?.name ?? productId).join(", ");
}

function sectionAdminLabel(section: StorefrontSection) {
  return getStorefrontSectionLabel(section);
}

function formatReplayStage(stage: string) {
  return stage
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
