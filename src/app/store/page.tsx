import Link from "next/link";
import { getCurrentUser } from "@/app/auth/session";
import { baselineStorefront } from "@/fixtures/storefront";

export default async function StorePage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <section className="mx-auto max-w-6xl px-6 py-8">
        <nav className="flex items-center justify-between border-b border-neutral-200 pb-5">
          <Link className="text-lg font-semibold" href="/">
            Atlas & Co.
          </Link>
          <p className="text-sm text-neutral-600">
            {user ? `Viewing as ${user.name}` : "Public storefront"}
          </p>
        </nav>
        <div className="grid min-h-[70vh] items-center gap-8 py-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {baselineStorefront.versionName}
            </p>
            <h1 className="mt-4 max-w-3xl text-6xl font-semibold leading-tight">
              {baselineStorefront.sections[0]?.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-700">
              {baselineStorefront.sections[0]?.body}
            </p>
          </div>
          <div className="aspect-[4/5] rounded-lg bg-[linear-gradient(135deg,#0f766e,#f5d7a1_55%,#171717)]" />
        </div>
      </section>
    </main>
  );
}
