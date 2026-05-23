import Link from "next/link";
import { getCurrentUser } from "@/app/auth/session";
import { AuthPanel } from "@/app/components/AuthPanel";
import {
  buildMissionControlReplay,
  type MissionControlReplayStep,
} from "@/domain/missionControlReplay";
import { products } from "@/fixtures/products";
import { getAppDatabase } from "@/persistence/appDatabase";

type HomeProps = {
  searchParams?: Promise<{
    step?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const database = getAppDatabase();
  const activeVersion = database.findActiveStorefrontVersion();
  const replay = buildMissionControlReplay({
    traces: database.listRecentMetricsTraces(),
    proposals: database.listRecentCampaignProposals(),
    storefrontConfigs: database.listRecentStorefrontConfigs(),
    publishedVersions: database.listPublishedStorefrontVersions(),
    activeVersionId: activeVersion?.id ?? null,
    selectedStepId: params?.step ?? null,
  });

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-neutral-950">
      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:min-h-screen lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="flex min-h-[calc(100vh-3rem)] min-w-0 flex-col gap-4 rounded-lg border border-neutral-300 bg-white p-5 shadow-sm lg:p-6">
          <div className="flex flex-col items-start gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Atlas & Co. Mission Control
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight">Loom command center</h1>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold">
                {replay.completedCount}/{replay.totalCount}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {replay.completedCount === replay.totalCount ? "ready" : "progress"}
              </p>
            </div>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm font-semibold text-neutral-900">{replay.nextAction}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Active storefront: {replay.activeVersionName}
            </p>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Step {replay.selectedStep.position}/{replay.totalCount} ·{" "}
                  {replay.selectedStep.status}
                </p>
                <p className="mt-1 font-semibold">{replay.selectedStep.title}</p>
              </div>
              <Link
                className="rounded-md bg-neutral-950 px-3 py-2 text-center text-xs font-semibold text-white sm:shrink-0"
                href={replay.selectedStep.href}
              >
                {replay.selectedStep.action}
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-center text-sm font-semibold text-emerald-900"
                href={replay.selectedStep.previousHref}
              >
                Previous
              </Link>
              <Link
                className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-center text-sm font-semibold text-emerald-900"
                href={replay.selectedStep.nextHref}
              >
                Next
              </Link>
            </div>
          </div>
          <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {replay.steps.map((step) => (
              <li className={replayStepClassName(step)} key={step.id}>
                <Link
                  aria-current={step.isSelected ? "step" : undefined}
                  className="min-w-0 underline-offset-4 hover:underline"
                  href={`/?step=${step.id}`}
                >
                  <span className="block truncate font-semibold">{step.title}</span>
                  <span className="text-xs text-neutral-500">{step.role}</span>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={replayStatusClassName(step)}>{step.status}</span>
                  <Link
                    className="rounded-md border border-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700"
                    href={step.href}
                  >
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ol>
          <section
            aria-label="Loom capture checklist"
            className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Loom capture checklist
              </h2>
              <span className="text-xs font-semibold text-neutral-500">stable links</span>
            </div>
            <div className="mt-3 grid gap-2">
              {replay.captureChecklist.map((item) => (
                <Link
                  className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm hover:border-emerald-300"
                  href={item.href}
                  key={item.label}
                >
                  <span className="font-semibold">{item.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-neutral-600">
                    {item.detail}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
        <aside className="flex min-h-[calc(100vh-3rem)] min-w-0 flex-col gap-4">
          <div className="flex-1 rounded-lg border border-neutral-900 bg-neutral-950 p-4 text-white shadow-sm lg:p-5">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  {replay.captureFrame.eyebrow}
                </p>
                <h2 className="mt-1 text-xl font-semibold">{replay.captureFrame.storefrontName}</h2>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-950">
                {replay.captureFrame.statusLabel}
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-[#f8f4ed] text-neutral-950">
              <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {replay.captureFrame.stepLabel}
                </p>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {replay.captureFrame.role}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold leading-tight">
                    {replay.captureFrame.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-neutral-700">
                    {replay.captureFrame.body}
                  </p>
                  <Link
                    className="mt-4 inline-flex rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white"
                    href={replay.captureFrame.primaryAction.href}
                  >
                    {replay.captureFrame.primaryAction.label}
                  </Link>
                </div>
                <div className="grid content-between gap-3 rounded-md border border-neutral-200 bg-neutral-100 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Active storefront
                    </p>
                    <p className="mt-2 text-3xl font-semibold leading-tight">
                      {replay.captureFrame.storefrontName}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {replay.captureFrame.roleLinks.map((roleLink) => (
                      <Link
                        className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-center text-sm font-semibold"
                        href={roleLink.href}
                        key={roleLink.label}
                      >
                        {roleLink.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-neutral-300">
              Run the Manager insight, Operator activation, Time Machine comparison, and Guest
              storefront from one replayable path.
            </p>
          </div>
          <AuthPanel currentUser={currentUser} />
        </aside>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-8 lg:grid-cols-3 lg:px-8">
        <div className="rounded-lg border border-neutral-300 bg-neutral-950 p-6 text-white">
          <p className="text-sm uppercase tracking-wide text-emerald-300">Golden Query</p>
          <p className="mt-3 text-2xl font-semibold">
            What should we promote for Father’s Day based on margin, inventory, and conversion?
          </p>
        </div>
        <div className="rounded-lg border border-neutral-300 bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Live Inputs
          </p>
          <div className="mt-4 space-y-3">
            <div className="rounded-md border border-neutral-200 p-4">
              <p className="font-semibold">Static catalog data</p>
              <p className="mt-1 text-sm text-neutral-600">
                Product margin, inventory, conversion, return risk, price, and tags drive quick demo
                outputs.
              </p>
            </div>
            <div className="rounded-md border border-neutral-200 p-4">
              <p className="font-semibold">Codex App Server mode</p>
              <p className="mt-1 text-sm text-neutral-600">
                Custom Manager questions and generated artifacts use live Codex with server
                validation.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-neutral-300 bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Seed Catalog
          </p>
          <p className="mt-3 text-3xl font-semibold">{products.length} products</p>
        </div>
      </section>
    </main>
  );
}

function replayStepClassName(step: MissionControlReplayStep) {
  const baseClassName =
    "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm";

  if (step.isSelected) {
    return `${baseClassName} border-emerald-400 bg-emerald-50`;
  }

  return `${baseClassName} border-neutral-200`;
}

function replayStatusClassName(step: MissionControlReplayStep) {
  if (step.status === "complete") {
    return "shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800";
  }

  if (step.status === "current") {
    return "shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800";
  }

  return "shrink-0 rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-600";
}
