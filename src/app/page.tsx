import Link from "next/link";
import { getCurrentUser } from "@/app/auth/session";
import { AuthPanel } from "@/app/components/AuthPanel";
import {
  buildMissionControlReplay,
  type MissionControlReplayStep,
} from "@/domain/missionControlReplay";
import { fatherDayCampaign, secretSantaCampaign } from "@/fixtures/campaigns";
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
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex min-h-[72vh] flex-col justify-between rounded-lg border border-neutral-300 bg-white p-8 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Atlas & Co. Mission Control
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight">
              From commerce insight to seasonal storefront in one traceable Codex run.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-700">
              Run the Manager insight, Operator activation, Time Machine comparison, and Guest
              storefront from one replayable demo path.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Link
              className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
              href="/manager"
            >
              <p className="text-sm font-semibold">Store Manager</p>
            </Link>
            <Link
              className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
              href="/operator"
            >
              <p className="text-sm font-semibold">Store Operator</p>
            </Link>
            <Link className="rounded-md border border-neutral-200 bg-neutral-50 p-4" href="/store">
              <p className="text-sm font-semibold">Guest storefront</p>
            </Link>
          </div>
        </div>
        <aside className="space-y-4">
          <AuthPanel currentUser={currentUser} />
          <div className="rounded-lg border border-neutral-300 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                  Demo Mode
                </p>
                <h2 className="mt-2 text-xl font-semibold">Mission Control replay</h2>
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
            <p className="mt-3 text-sm leading-6 text-neutral-700">{replay.nextAction}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Active storefront: {replay.activeVersionName}
            </p>
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    Step {replay.selectedStep.position}/{replay.totalCount} ·{" "}
                    {replay.selectedStep.status}
                  </p>
                  <p className="mt-1 font-semibold">{replay.selectedStep.title}</p>
                </div>
                <Link
                  className="shrink-0 rounded-md bg-neutral-950 px-3 py-2 text-xs font-semibold text-white"
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
            <ol className="mt-4 space-y-2">
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
          </div>
          <div className="rounded-lg border border-neutral-300 bg-neutral-950 p-6 text-white">
            <p className="text-sm uppercase tracking-wide text-emerald-300">Golden Query</p>
            <p className="mt-3 text-2xl font-semibold">
              What should we promote for Father’s Day based on margin, inventory, and conversion?
            </p>
          </div>
          <div className="rounded-lg border border-neutral-300 bg-white p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Fixture Campaigns
            </p>
            <div className="mt-4 space-y-3">
              {[fatherDayCampaign, secretSantaCampaign].map((campaign) => (
                <div className="rounded-md border border-neutral-200 p-4" key={campaign.id}>
                  <p className="font-semibold">{campaign.name}</p>
                  <p className="mt-1 text-sm text-neutral-600">{campaign.summary}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-300 bg-white p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Seed Catalog
            </p>
            <p className="mt-3 text-3xl font-semibold">{products.length} products</p>
          </div>
        </aside>
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
