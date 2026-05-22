import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { getCurrentUser } from "@/app/auth/session";
import type { StorefrontConfig } from "@/domain/storefront";
import { resolveGuestStorefrontSelection } from "@/domain/storefrontPublishing";
import { products } from "@/fixtures/products";
import { baselineStorefront } from "@/fixtures/storefront";
import { getAppDatabase } from "@/persistence/appDatabase";

export default async function StorePage({
  searchParams,
}: {
  searchParams?: Promise<{
    version?: string;
  }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const database = getAppDatabase();
  const selection = resolveGuestStorefrontSelection({
    requestedVersionId: params?.version,
    activeVersion: database.findActiveStorefrontVersion(),
    publishedVersions: database.listPublishedStorefrontVersions(),
    baseline: baselineStorefront,
  });
  const storefront = selection.storefront;
  const hero =
    storefront.sections.find((section) => section.type === "hero") ?? storefront.sections[0];

  return (
    <main className="min-h-screen bg-white text-neutral-950" style={storefrontAccent(storefront)}>
      <section className="mx-auto max-w-6xl px-6 py-8">
        <nav className="flex items-center justify-between border-b border-neutral-200 pb-5">
          <Link className="text-lg font-semibold" href="/">
            Atlas & Co.
          </Link>
          <p className="text-sm text-neutral-600">
            {user ? `Viewing as ${user.name}` : "Public storefront"}
          </p>
        </nav>
        <form
          className="mt-6 flex flex-wrap items-end justify-between gap-3 border-b border-neutral-200 pb-5 text-sm"
          method="get"
        >
          <label className="grid min-w-64 gap-2 font-semibold text-neutral-900">
            Preview version
            <select
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 font-normal text-neutral-900"
              defaultValue={selection.selectedVersionId}
              name="version"
            >
              {selection.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} ({option.status})
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-semibold text-neutral-700">{selection.statusLabel}</p>
            {selection.activeVersionId ? (
              <Link
                className="rounded-md border border-neutral-300 px-4 py-2 font-semibold text-neutral-900"
                href={`/store?version=${selection.activeVersionId}`}
              >
                Active version
              </Link>
            ) : null}
            <button
              className="rounded-md bg-neutral-950 px-4 py-2 font-semibold text-white"
              type="submit"
            >
              View version
            </button>
          </div>
        </form>
        <div className="grid min-h-[58vh] items-center gap-8 py-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--storefront-accent)]">
              {storefront.versionName}
            </p>
            <h1 className="mt-4 max-w-3xl text-6xl font-semibold leading-tight">{hero?.title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-700">{hero?.body}</p>
            {hero && hero.productIds.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {hero.productIds.map((productId) => {
                  const product = products.find((item) => item.id === productId);

                  return (
                    <span
                      className="rounded-full border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-800"
                      key={productId}
                    >
                      {product?.name ?? productId}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
            <Image
              alt={storefront.visualAsset.alt}
              className="aspect-[4/5] h-full w-full object-cover"
              height={720}
              src={storefront.visualAsset.path}
              width={1200}
            />
          </div>
        </div>
        <div className="grid gap-6 pb-12">
          {storefront.sections
            .filter((section) => section.id !== hero?.id)
            .map((section) => (
              <section className="border-t border-neutral-200 pt-6" key={section.id}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {section.type}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">{section.title}</h2>
                  </div>
                  {section.body ? (
                    <p className="max-w-xl text-sm leading-6 text-neutral-600">{section.body}</p>
                  ) : null}
                </div>
                {section.productIds.length > 0 ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    {section.productIds.map((productId) => {
                      const product = products.find((item) => item.id === productId);

                      return (
                        <article
                          className="rounded-lg border border-neutral-200 p-4"
                          key={productId}
                        >
                          <h3 className="font-semibold">{product?.name ?? productId}</h3>
                          {product ? (
                            <p className="mt-2 text-sm text-neutral-600">
                              £{product.price.toFixed(2)} · {product.category}
                            </p>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            ))}
        </div>
      </section>
    </main>
  );
}

function storefrontAccent(storefront: StorefrontConfig) {
  return {
    "--storefront-accent": storefront.style.accentColor,
  } as CSSProperties;
}
