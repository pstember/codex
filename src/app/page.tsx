import Link from "next/link";
import { getCurrentUser } from "@/app/auth/session";
import { AuthPanel } from "@/app/components/AuthPanel";
import { fatherDayCampaign, secretSantaCampaign } from "@/fixtures/campaigns";
import { products } from "@/fixtures/products";

export default async function Home() {
  const currentUser = await getCurrentUser();

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
              Phase 0 scaffold is focused on contracts, fixtures, documentation, and tests. The
              polished Manager, Operator, and Guest workflows come next.
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
