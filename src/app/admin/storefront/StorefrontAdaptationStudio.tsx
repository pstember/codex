"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useState } from "react";
import {
  deleteStorefrontConfigAction,
  markStorefrontConfigReadyAction,
  moveStorefrontConfigToDraftAction,
  previewStorefrontForCurrentUserAction,
  publishBasicStorefrontAction,
  publishStorefrontConfigAction,
  updateStorefrontPaletteAction,
} from "@/app/admin/storefront/actions";
import { AdminObservabilityRail } from "@/app/components/AdminObservabilityRail";
import type { StorefrontConfig, StorefrontPalette } from "@/domain/storefront";
import {
  describeStorefrontHeroImageComposition,
  resolveStorefrontHeroImageComposition,
  resolveStorefrontHeroImageObjectPosition,
  resolveStorefrontPalette,
} from "@/domain/storefront";
import type { StorefrontGalleryEntry } from "@/domain/storefrontPublishing";

export type StorefrontDraftSummary = {
  id: string;
  versionName: string;
  sourceDraftKey: string;
  validationStatus: "draft" | "ready" | "invalid";
  validationErrors: string[];
  createdAtLabel: string;
  config: StorefrontConfig;
};

type TraceEvent = {
  stage: string;
  title: string;
  body: string;
  payload?: string;
  payloadKind?: string;
};

type AdaptationResult = {
  draftId: string;
  status: "draft" | "ready" | "invalid";
  versionName: string;
  validationErrors: string[];
  traceEvents: TraceEvent[];
};

type RecentVisualRun = {
  id: string;
  label: string;
  status: string;
  traceEvents: TraceEvent[];
};

const examplePrompts = [
  "Halloween storefront for cosy office gifts",
  "Valentine’s Day gift edit for useful everyday rituals",
  "Launch weekend refresh with brighter product storytelling",
];
const eventPlaceholder = "Event to customize for, e.g. World Cup";
const styleGalleryPageSize = 8;
const observabilityPreferenceKey = "storefront-observability-open";

export function StorefrontAdaptationStudio({
  activeStorefront,
  sourceOptions,
  selectedDraft,
  selectedGalleryEntry,
  recentReplayRuns,
  drafts,
  galleryEntries,
}: {
  activeStorefront: StorefrontConfig;
  sourceOptions: Array<{ id: string; label: string }>;
  selectedDraft: StorefrontDraftSummary | null;
  selectedGalleryEntry: StorefrontGalleryEntry | null;
  recentReplayRuns: RecentVisualRun[];
  drafts: StorefrontDraftSummary[];
  galleryEntries: StorefrontGalleryEntry[];
}) {
  const [eventName, setEventName] = useState("");
  const [operatorPrompt, setOperatorPrompt] = useState(
    "Make the storefront feel cosy, eerie, and useful for office gift buyers.",
  );
  const [sourceVersionId, setSourceVersionId] = useState(sourceOptions[0]?.id ?? "baseline");
  const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
  const [recentRuns, setRecentRuns] = useState<RecentVisualRun[]>(
    [
      ...recentReplayRuns,
      ...drafts.slice(0, 5).map((draft) => ({
        id: draft.id,
        label: draft.versionName,
        status: draft.validationStatus,
        traceEvents: traceEventsFromDraft(draft),
      })),
    ].slice(0, 5),
  );
  const [result, setResult] = useState<AdaptationResult | null>(null);
  const [isObservabilityOpen, setIsObservabilityOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [editorPalette, setEditorPalette] = useState<StorefrontPalette | null>(null);
  const previewStorefront =
    selectedGalleryEntry?.config ?? selectedDraft?.config ?? activeStorefront;
  const previewPalette =
    selectedDraft && editorPalette ? editorPalette : resolveStorefrontPalette(previewStorefront);

  useEffect(() => {
    setEditorPalette(selectedDraft ? resolveStorefrontPalette(selectedDraft.config) : null);
  }, [selectedDraft]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedPreference = window.sessionStorage.getItem(observabilityPreferenceKey);
    setIsObservabilityOpen(savedPreference === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(observabilityPreferenceKey, String(isObservabilityOpen));
  }, [isObservabilityOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsObservabilityOpen(true);
    setIsPending(true);
    setResult(null);
    setTraceEvents([]);

    try {
      const response = await fetch("/api/admin/storefront/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventName, operatorPrompt, sourceVersionId }),
      });

      if (!response.ok || !response.body) {
        throw new Error("The storefront adaptation stream could not be opened.");
      }

      await readEventStream(response.body, {
        onTrace(traceEvent) {
          setTraceEvents((currentEvents) => [...currentEvents, traceEvent]);
        },
        onResult(nextResult) {
          setResult(nextResult);
          setTraceEvents(nextResult.traceEvents);
          setRecentRuns((currentRuns) =>
            [
              {
                id: nextResult.draftId,
                label: nextResult.versionName,
                status: nextResult.status,
                traceEvents: nextResult.traceEvents,
              },
              ...currentRuns.filter((run) => run.id !== nextResult.draftId),
            ].slice(0, 5),
          );
          window.history.replaceState(
            null,
            "",
            `/admin/storefront?storefront=${nextResult.draftId}`,
          );
          window.location.reload();
        },
        onError(message) {
          const errorTraceEvents = [
            {
              stage: "error",
              title: "Adaptation failed",
              body: message,
            },
          ];
          setResult({
            draftId: "",
            status: "invalid",
            versionName: eventName,
            validationErrors: [message],
            traceEvents: errorTraceEvents,
          });
          setTraceEvents(errorTraceEvents);
        },
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="relative w-full max-w-none">
      <div className="grid min-w-0 gap-5 xl:mx-auto xl:w-full xl:max-w-[1280px] xl:justify-self-center">
        <div className="d20-ink min-w-0 overflow-hidden rounded-lg border border-[#263f7a] p-5 text-white shadow-[0_30px_90px_rgba(8,13,31,0.30)] md:p-7">
          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.72fr)] xl:items-start">
            <div className="grid min-w-0 content-start gap-4">
              <form className="grid min-w-0 content-start gap-4" onSubmit={handleSubmit}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
                    Visual adaptation
                  </p>
                  <h2 className="mt-2 text-3xl font-black">Event storefront studio</h2>
                  <p className="mt-3 text-sm leading-6 text-[#c7d2fe]">
                    Ask Codex for visitor copy, a palette, and a generated hero direction.
                  </p>
                </div>

                <label className="grid min-w-0 gap-2 text-sm font-bold text-[#f8fbff]">
                  Event
                  <input
                    aria-describedby="event-name-hint"
                    className="min-w-0 rounded-md border border-white/15 bg-white/95 px-3 py-2 font-semibold text-[#0b1020] outline-none focus:ring-4 focus:ring-[#22d3ee]/25"
                    onChange={(changeEvent) => setEventName(changeEvent.target.value)}
                    placeholder={eventPlaceholder}
                    title={eventPlaceholder}
                    value={eventName}
                  />
                  <span className="sr-only" id="event-name-hint">
                    {eventPlaceholder}
                  </span>
                </label>

                <label className="grid min-w-0 gap-2 text-sm font-bold text-[#f8fbff]">
                  Start from
                  <select
                    aria-label="Start from"
                    className="min-w-0 rounded-md border border-white/15 bg-white/95 px-3 py-2 font-semibold text-[#0b1020] outline-none focus:ring-4 focus:ring-[#22d3ee]/25"
                    onChange={(changeEvent) => setSourceVersionId(changeEvent.target.value)}
                    value={sourceVersionId}
                  >
                    {sourceOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs font-semibold leading-5 text-[#c7d2fe]">
                    Codex will adapt this version&apos;s copy, products, palette, and hero
                    direction.
                  </span>
                </label>

                <label className="grid min-w-0 gap-2 text-sm font-bold text-[#f8fbff]">
                  Ask Codex
                  <textarea
                    className="min-h-36 min-w-0 resize-y rounded-md border border-white/15 bg-white/95 px-3 py-3 text-sm font-semibold leading-6 text-[#0b1020] outline-none focus:ring-4 focus:ring-[#22d3ee]/25"
                    onChange={(changeEvent) => setOperatorPrompt(changeEvent.target.value)}
                    value={operatorPrompt}
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  {examplePrompts.map((prompt) => (
                    <button
                      className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-left text-xs font-bold text-[#d7ff3f] transition hover:bg-white/10"
                      key={prompt}
                      onClick={() => {
                        setEventName(prompt.split(" storefront")[0].split(" gift")[0]);
                        setOperatorPrompt(prompt);
                      }}
                      type="button"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                <button
                  className="w-fit rounded-md bg-[#d7ff3f] px-5 py-3 text-sm font-black text-[#0b1020] shadow-[0_18px_50px_rgba(215,255,63,0.25)] transition hover:bg-[#22d3ee] disabled:cursor-wait disabled:bg-[#94a3b8]"
                  disabled={isPending}
                  type="submit"
                >
                  {isPending ? "Generating..." : "Generate visual draft"}
                </button>
                {result ? (
                  <p className="text-sm font-semibold text-[#c7d2fe]">
                    {result.versionName}: {result.status}
                    {result.validationErrors.length ? ` · ${result.validationErrors[0]}` : ""}
                  </p>
                ) : null}
              </form>
            </div>

            <div className="grid min-w-0 content-start gap-4">
              <StorefrontMiniPreview
                label={selectedDraft ? "Current working draft" : "Active storefront"}
                paletteOverride={previewPalette}
                storefront={previewStorefront}
              />
            </div>
          </div>
          {selectedDraft ? (
            <VisualEditor draft={selectedDraft} onPaletteChange={setEditorPalette} />
          ) : null}
        </div>

        <DraftGallery entries={galleryEntries} selectedEntryId={selectedGalleryEntry?.id ?? null} />
      </div>

      <AdminObservabilityRail
        description="Copy, palette, image metadata, and validation as the run happens."
        eyebrow="Codex observability"
        isOpen={isObservabilityOpen}
        onToggle={() => setIsObservabilityOpen((current) => !current)}
        title="Visual exchange"
      >
        <StorefrontRecentRunsPanel
          onRevisitRun={(run) => setTraceEvents(run.traceEvents)}
          recentRuns={recentRuns}
        />
        <StorefrontTraceTimeline events={traceEvents} isPending={isPending} />
      </AdminObservabilityRail>
    </section>
  );
}

function VisualEditor({
  draft,
  onPaletteChange,
}: {
  draft: StorefrontDraftSummary;
  onPaletteChange: (palette: StorefrontPalette) => void;
}) {
  const [palette, setPalette] = useState(resolveStorefrontPalette(draft.config));

  useEffect(() => {
    const nextPalette = resolveStorefrontPalette(draft.config);
    setPalette(nextPalette);
    onPaletteChange(nextPalette);
  }, [draft.config, onPaletteChange]);

  const updatePalette = (name: keyof typeof palette, value: string) => {
    setPalette((currentPalette) => {
      const nextPalette = { ...currentPalette, [name]: value };
      onPaletteChange(nextPalette);
      return nextPalette;
    });
  };

  return (
    <section className="mt-6 rounded-lg border border-white/10 bg-white/95 p-5 text-[#0b1020] shadow-[0_16px_50px_rgba(8,13,31,0.18)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2563eb]">Brand kit</p>
          <h2 className="mt-2 text-2xl font-black">Palette and contrast</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-[#42526e]">
          Tune the visitor-facing palette before saving this selection.
        </p>
      </div>

      <div className="mt-4 grid gap-4">
        <form action={updateStorefrontPaletteAction} className="grid gap-3">
          <input name="storefrontConfigId" type="hidden" value={draft.id} />
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <ColorField
                label="Background"
                name="background"
                onChange={updatePalette}
                usage="Page wash"
                value={palette.background}
              />
              <ColorField
                label="Surface"
                name="surface"
                onChange={updatePalette}
                usage="Product panels"
                value={palette.surface}
              />
              <ColorField
                label="Text"
                name="text"
                onChange={updatePalette}
                usage="Main copy"
                value={palette.text}
              />
              <ColorField
                label="Accent"
                name="accent"
                onChange={updatePalette}
                usage="Campaign signal"
                value={palette.accent}
              />
            </div>
            <ReadabilitySample draft={draft} palette={palette} />
          </div>

          <details className="rounded-md border border-[#d7e0f4] bg-[#f8fbff] p-3" open>
            <summary className="cursor-pointer text-sm font-black text-[#0b1020]">
              Advanced palette tokens
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <ColorField
                label="Muted"
                name="muted"
                onChange={updatePalette}
                usage="Secondary copy"
                value={palette.muted}
              />
              <ColorField
                label="Border"
                name="border"
                onChange={updatePalette}
                usage="Rules"
                value={palette.border}
              />
              <ColorField
                label="Secondary"
                name="secondaryAccent"
                onChange={updatePalette}
                usage="Highlights"
                value={palette.secondaryAccent}
              />
              <ColorField
                label="Button"
                name="button"
                onChange={updatePalette}
                usage="Actions"
                value={palette.button}
              />
              <ColorField
                label="Button text"
                name="buttonText"
                onChange={updatePalette}
                usage="Action labels"
                value={palette.buttonText}
              />
            </div>
          </details>

          <div className="flex flex-wrap items-end gap-2">
            <button
              className="rounded-md bg-[#0b1020] px-4 py-3 text-sm font-black text-white"
              name="intent"
              type="submit"
              value="save"
            >
              Save brand kit
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function ColorField({
  label,
  name,
  onChange,
  usage,
  value,
}: {
  label: string;
  name: StorefrontPaletteKey;
  onChange: (name: StorefrontPaletteKey, value: string) => void;
  usage: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 rounded-md border border-[#d7e0f4] bg-white p-3 shadow-sm">
      <span className="flex items-center justify-between gap-2">
        <span>
          <span className="block text-xs font-black uppercase tracking-[0.08em] text-[#17203a]">
            {label}
          </span>
          <span className="mt-1 block text-xs font-semibold text-[#64748b]">{usage}</span>
        </span>
        <input
          aria-label={label}
          className="h-9 w-9 shrink-0 cursor-pointer border-0 bg-transparent p-0"
          onChange={(event) => onChange(name, event.target.value)}
          value={value}
          name={name}
          type="color"
        />
      </span>
      <span
        className="grid min-h-12 place-items-center rounded-md border border-black/10 px-2 text-center font-mono text-xs font-black"
        style={{ background: value, color: readableTextFor(value) }}
      >
        {value}
      </span>
    </label>
  );
}

function readableTextFor(hexColor: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hexColor)) {
    return "#0b1020";
  }

  const red = Number.parseInt(hexColor.slice(1, 3), 16);
  const green = Number.parseInt(hexColor.slice(3, 5), 16);
  const blue = Number.parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.58 ? "#0b1020" : "#ffffff";
}

type StorefrontPaletteKey = keyof ReturnType<typeof resolveStorefrontPalette>;

function ReadabilitySample({
  draft,
  palette,
}: {
  draft: StorefrontDraftSummary;
  palette: ReturnType<typeof resolveStorefrontPalette>;
}) {
  const hero =
    draft.config.sections.find((section) => section.type === "hero") ?? draft.config.sections[0];

  return (
    <div
      className="min-h-full overflow-hidden rounded-md border shadow-sm"
      style={{ background: palette.background, color: palette.text }}
    >
      <div
        className="flex min-h-full flex-col justify-between p-4"
        style={{ background: palette.surface, borderColor: palette.border }}
      >
        <p
          className="text-[11px] font-black uppercase tracking-[0.16em]"
          style={{ color: palette.accent }}
        >
          Text preview
        </p>
        <p className="mt-2 text-xl font-black leading-7">{hero?.title ?? draft.versionName}</p>
        <p className="mt-2 text-sm leading-6" style={{ color: palette.muted }}>
          {hero?.body ?? "Check that campaign copy stays readable against this palette."}
        </p>
        <button
          className="mt-3 rounded-md px-3 py-2 text-xs font-black"
          style={{ background: palette.button, color: palette.buttonText }}
          type="button"
        >
          Sample button
        </button>
      </div>
    </div>
  );
}

function StorefrontMiniPreview({
  label,
  paletteOverride,
  storefront,
}: {
  label: string;
  paletteOverride?: StorefrontPalette;
  storefront: StorefrontConfig;
}) {
  const palette = paletteOverride ?? resolveStorefrontPalette(storefront);
  const hero =
    storefront.sections.find((section) => section.type === "hero") ?? storefront.sections[0];

  return (
    <article
      className="grid min-w-0 overflow-hidden rounded-lg border border-white/15 bg-white text-[#0b1020] shadow-[0_18px_55px_rgba(8,13,31,0.18)]"
      style={{ background: palette.surface, color: palette.text }}
    >
      <Image
        alt={storefront.visualAsset.alt}
        className="w-full object-cover"
        height={720}
        src={storefront.visualAsset.path}
        style={{
          aspectRatio: resolveStorefrontHeroImageComposition(storefront.visualAsset).aspectRatio,
          objectPosition: resolveStorefrontHeroImageObjectPosition(storefront.visualAsset),
        }}
        width={1200}
      />
      <div className="grid min-w-0 gap-4 p-5">
        <div className="min-w-0">
          <p
            className="text-xs font-black uppercase tracking-[0.18em]"
            style={{ color: palette.accent }}
          >
            {label}
          </p>
          <h3 className="mt-2 line-clamp-2 text-2xl font-black leading-8">{hero?.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6" style={{ color: palette.muted }}>
            {hero?.body}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PaletteSwatches storefront={storefront} />
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#64748b]">
            {describeStorefrontHeroImageComposition(storefront.visualAsset)}
          </span>
          <button
            className="rounded-md px-3 py-2 text-xs font-black"
            style={{ background: palette.button, color: palette.buttonText }}
            type="button"
          >
            Shop preview
          </button>
        </div>
      </div>
    </article>
  );
}

function DraftGallery({
  entries,
  selectedEntryId,
}: {
  entries: StorefrontGalleryEntry[];
  selectedEntryId: string | null;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(entries.length / styleGalleryPageSize));
  const firstVisibleDraft = (currentPage - 1) * styleGalleryPageSize;
  const visibleEntries = entries.slice(firstVisibleDraft, firstVisibleDraft + styleGalleryPageSize);
  const visibleRangeStart = entries.length === 0 ? 0 : firstVisibleDraft + 1;
  const visibleRangeEnd = Math.min(firstVisibleDraft + visibleEntries.length, entries.length);

  useEffect(() => {
    const selectedDraftIndex = entries.findIndex((entry) => entry.id === selectedEntryId);
    const selectedDraftPage =
      selectedDraftIndex >= 0 ? Math.floor(selectedDraftIndex / styleGalleryPageSize) + 1 : 1;

    setCurrentPage(Math.min(selectedDraftPage, pageCount));
  }, [entries, pageCount, selectedEntryId]);

  return (
    <section className="min-w-0 rounded-lg border border-[#c7d7ff] bg-white/80 p-5 shadow-[0_20px_70px_rgba(8,13,31,0.10)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2563eb]">
            Style gallery
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#0b1020]">Saved storefront styles</h2>
          <p className="mt-2 text-sm font-semibold text-[#64748b]">
            Showing {visibleRangeStart}-{visibleRangeEnd} of {entries.length} styles
          </p>
        </div>
        {pageCount > 1 ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-md border border-[#abc2ff] bg-white px-3 py-2 text-sm font-black text-[#2563eb] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              type="button"
            >
              Previous
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
              <button
                aria-current={page === currentPage ? "page" : undefined}
                className={
                  page === currentPage
                    ? "grid size-10 place-items-center rounded-md bg-[#2563eb] text-sm font-black text-white"
                    : "grid size-10 place-items-center rounded-md border border-[#abc2ff] bg-white text-sm font-black text-[#2563eb]"
                }
                key={page}
                onClick={() => setCurrentPage(page)}
                type="button"
              >
                {page}
              </button>
            ))}
            <button
              className="rounded-md border border-[#abc2ff] bg-white px-3 py-2 text-sm font-black text-[#2563eb] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={currentPage === pageCount}
              onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
      {entries.length > 0 ? (
        <div className="mt-5 flex max-w-full gap-4 overflow-x-auto pb-2">
          {visibleEntries.map((entry) => (
            <article
              className={`grid w-[280px] shrink-0 overflow-hidden rounded-lg border bg-white shadow-[0_16px_50px_rgba(8,13,31,0.10)] ${
                entry.id === selectedEntryId
                  ? "border-[#2563eb] ring-4 ring-[#2563eb]/10"
                  : "border-[#d7e0f4]"
              }`}
              key={entry.id}
            >
              <Image
                alt={entry.config.visualAsset.alt}
                className="w-full object-cover"
                height={720}
                src={entry.config.visualAsset.path}
                style={{
                  aspectRatio: resolveStorefrontHeroImageComposition(entry.config.visualAsset)
                    .aspectRatio,
                  objectPosition: resolveStorefrontHeroImageObjectPosition(
                    entry.config.visualAsset,
                  ),
                }}
                width={1200}
              />
              <div className="grid content-between gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 font-black leading-5 text-[#0b1020]">
                      {entry.versionName}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-[#64748b]">
                      {entry.createdAtLabel} · {entry.config.visualAsset.source}
                    </p>
                  </div>
                  <GalleryStatus entry={entry} />
                </div>
                <PaletteSwatches storefront={entry.config} />
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#64748b]">
                  {describeStorefrontHeroImageComposition(entry.config.visualAsset)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    className="rounded-md border border-[#c7d7ff] px-3 py-2 text-xs font-bold text-[#2563eb]"
                    href={`/admin/storefront?storefront=${entry.id}`}
                  >
                    Edit
                  </a>
                  {entry.validationStatus !== "invalid" ? (
                    <>
                      <form action={previewStorefrontForCurrentUserAction}>
                        <input name="storefrontId" type="hidden" value={entry.id} />
                        <button
                          className="rounded-md border border-[#c7d7ff] px-3 py-2 text-xs font-bold text-[#0b1020]"
                          type="submit"
                        >
                          Preview for me
                        </button>
                      </form>
                      {entry.kind === "basic" ? (
                        <form action={publishBasicStorefrontAction}>
                          <button
                            className="rounded-md bg-[#d7ff3f] px-3 py-2 text-xs font-bold text-[#0b1020]"
                            type="submit"
                          >
                            Publish for everyone
                          </button>
                        </form>
                      ) : entry.validationStatus === "ready" ? (
                        <>
                          <form action={publishStorefrontConfigAction}>
                            <input name="storefrontConfigId" type="hidden" value={entry.id} />
                            <button
                              className="rounded-md bg-[#d7ff3f] px-3 py-2 text-xs font-bold text-[#0b1020]"
                              type="submit"
                            >
                              Publish for everyone
                            </button>
                          </form>
                          <form action={moveStorefrontConfigToDraftAction}>
                            <input name="storefrontConfigId" type="hidden" value={entry.id} />
                            <button
                              className="rounded-md border border-[#cbd5e1] px-3 py-2 text-xs font-bold text-[#334155]"
                              type="submit"
                            >
                              Move back to draft
                            </button>
                          </form>
                        </>
                      ) : (
                        <form action={markStorefrontConfigReadyAction}>
                          <input name="storefrontConfigId" type="hidden" value={entry.id} />
                          <button
                            className="rounded-md bg-[#d7ff3f] px-3 py-2 text-xs font-bold text-[#0b1020]"
                            type="submit"
                          >
                            Mark ready to publish
                          </button>
                        </form>
                      )}
                    </>
                  ) : null}
                  {entry.canDelete ? (
                    <form action={deleteStorefrontConfigAction}>
                      <input name="storefrontConfigId" type="hidden" value={entry.id} />
                      <button
                        className="rounded-md border border-[#fecdd3] px-3 py-2 text-xs font-bold text-[#be123c]"
                        type="submit"
                      >
                        Delete
                      </button>
                    </form>
                  ) : null}
                </div>
                {entry.validationErrors.length > 0 ? (
                  <p className="text-xs leading-5 text-[#be123c]">{entry.validationErrors[0]}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-md border border-dashed border-[#abc2ff] bg-white/70 p-4 text-sm font-semibold text-[#42526e]">
          No event adaptations yet. Generate a Halloween, Valentine’s Day, or launch-week draft.
        </p>
      )}
    </section>
  );
}

function GalleryStatus({ entry }: { entry: StorefrontGalleryEntry }) {
  const label = entry.isPreviewing
    ? "Previewing"
    : entry.isLive
      ? "Current"
      : entry.kind === "basic"
        ? "Basic"
        : entry.validationStatus === "ready"
          ? "Ready"
          : entry.validationStatus === "draft"
            ? "Draft"
            : "Invalid";
  const className =
    label === "Invalid"
      ? "rounded-md bg-[#ffe4e6] px-2.5 py-1 text-xs font-black text-[#be123c]"
      : label === "Current"
        ? "rounded-md bg-[#dcfff0] px-2.5 py-1 text-xs font-black text-[#157f5b]"
        : label === "Previewing"
          ? "rounded-md bg-[#dbeafe] px-2.5 py-1 text-xs font-black text-[#1d4ed8]"
          : label === "Ready"
            ? "rounded-md bg-[#fef3c7] px-2.5 py-1 text-xs font-black text-[#92400e]"
            : "rounded-md bg-[#f1f5f9] px-2.5 py-1 text-xs font-black text-[#334155]";

  return <span className={className}>{label}</span>;
}

function PaletteSwatches({ storefront }: { storefront: StorefrontConfig }) {
  const palette = resolveStorefrontPalette(storefront);

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(palette).map(([label, value]) => (
        <span
          className="grid size-8 place-items-center rounded-md border border-black/10 shadow-sm"
          key={label}
          style={{ background: value }}
          title={`${label}: ${value}`}
        />
      ))}
    </div>
  );
}

function StorefrontRecentRunsPanel({
  onRevisitRun,
  recentRuns,
}: {
  onRevisitRun: (run: RecentVisualRun) => void;
  recentRuns: RecentVisualRun[];
}) {
  return (
    <section className="grid gap-2">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#22d3ee]">Recent runs</p>
      {recentRuns.length > 0 ? (
        recentRuns.map((run) => (
          <button
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:bg-white/10"
            key={run.id}
            onClick={() => onRevisitRun(run)}
            type="button"
          >
            <span className="block text-sm font-bold text-white">{run.label}</span>
            <span className="mt-1 block text-[11px] font-black uppercase tracking-[0.12em] text-[#67e8f9]">
              {run.status} · {run.traceEvents.length} trace steps
            </span>
          </button>
        ))
      ) : (
        <p className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-[#c7d2fe]">
          Recent visual runs will appear here.
        </p>
      )}
    </section>
  );
}

function StorefrontTraceTimeline({
  events,
  isPending,
}: {
  events: TraceEvent[];
  isPending: boolean;
}) {
  return (
    <ol className="grid gap-3">
      {events.length > 0 ? (
        events.map((event, index) => (
          <li
            className="grid grid-cols-[22px_1fr] gap-3"
            key={`${event.stage}-${event.title}-${event.body}`}
          >
            <span className="mt-0.5 grid size-5 place-items-center rounded-full bg-[#d7ff3f] text-[10px] font-black text-[#0b1020]">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-bold">{event.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#c7d2fe]">
                {event.body}
              </p>
              {event.payload ? (
                <details className="mt-2 rounded-md border border-white/10 bg-white/5">
                  <summary className="cursor-pointer px-2 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#67e8f9]">
                    {storefrontTracePayloadLabel(event)}
                  </summary>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap px-2 pb-2 text-[11px] leading-5 text-[#e0f2fe]">
                    {event.payload}
                  </pre>
                </details>
              ) : null}
            </div>
          </li>
        ))
      ) : (
        <li className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-[#c7d2fe]">
          {isPending
            ? "Waiting for the first trace event..."
            : "Run an adaptation to watch Codex work."}
        </li>
      )}
    </ol>
  );
}

function storefrontTracePayloadLabel(event: TraceEvent): string {
  if (event.payloadKind === "app-server-request") {
    return "App Server request JSON";
  }

  if (event.payloadKind === "app-server-response") {
    return "App Server response JSON";
  }

  if (event.payloadKind === "prompt-context") {
    return "Prompt context JSON";
  }

  return "Trace detail";
}

function traceEventsFromDraft(draft: StorefrontDraftSummary): TraceEvent[] {
  return [
    {
      stage: "draft-loaded",
      title: "Draft loaded",
      body: `${draft.versionName} was saved as a ${draft.validationStatus} storefront visual draft.`,
    },
    {
      stage: "image-loaded",
      title: "Hero image",
      body: `${draft.config.visualAsset.source} asset: ${draft.config.visualAsset.path}`,
      payload: JSON.stringify(draft.config.visualAsset, null, 2),
    },
    {
      stage: "config-loaded",
      title: "Stored config",
      body:
        draft.validationErrors.length > 0
          ? draft.validationErrors.join("\n")
          : "Stored copy, palette, sections, and visual metadata are available for review.",
      payload: JSON.stringify(draft.config, null, 2),
    },
  ];
}

async function readEventStream(
  body: ReadableStream<Uint8Array>,
  handlers: {
    onTrace(event: TraceEvent): void;
    onResult(result: AdaptationResult): void;
    onError(message: string): void;
  },
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const eventLine = chunk.split("\n").find((line) => line.startsWith("event: "));
      const dataLine = chunk.split("\n").find((line) => line.startsWith("data: "));

      if (!eventLine || !dataLine) {
        continue;
      }

      const eventName = eventLine.replace("event: ", "");
      const data = JSON.parse(dataLine.replace("data: ", ""));

      if (eventName === "trace") {
        handlers.onTrace(data as TraceEvent);
      } else if (eventName === "result") {
        handlers.onResult(data as AdaptationResult);
      } else if (eventName === "error") {
        handlers.onError(String((data as { message?: string }).message ?? "Unknown error"));
      }
    }
  }
}
