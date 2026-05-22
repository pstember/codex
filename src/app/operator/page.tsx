import { requireCurrentUser } from "@/app/auth/session";
import { AppChrome } from "@/app/components/AppChrome";
import { generateCampaignProposalAction } from "@/app/operator/actions";
import { products } from "@/fixtures/products";
import { getAppDatabase } from "@/persistence/appDatabase";

export default async function OperatorPage({
  searchParams,
}: {
  searchParams?: Promise<{ trace?: string; proposal?: string }>;
}) {
  const user = await requireCurrentUser("publish_storefront");
  const params = await searchParams;
  const database = getAppDatabase();
  const traces = database.listRecentMetricsTraces();
  const proposals = database.listRecentCampaignProposals();
  const selectedTrace =
    (params?.trace ? database.findMetricsTraceById(params.trace) : null) ?? traces[0] ?? null;
  const selectedProposal =
    (params?.proposal ? database.findCampaignProposalById(params.proposal) : null) ??
    proposals[0] ??
    null;
  const productsById = new Map(products.map((product) => [product.id, product]));

  return (
    <AppChrome eyebrow="Store Operator" title="Campaign activation" user={user}>
      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="space-y-5">
          <div className="rounded-lg border border-neutral-300 bg-white p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Metrics handoff
            </p>
            {selectedTrace ? (
              <>
                <h2 className="mt-3 text-xl font-semibold">{selectedTrace.operationName}</h2>
                <p className="mt-3 text-sm leading-6 text-neutral-700">{selectedTrace.question}</p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-neutral-900">Validation</dt>
                    <dd className="mt-1 capitalize text-neutral-700">
                      {selectedTrace.validationStatus}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-neutral-900">Products</dt>
                    <dd className="mt-1 text-neutral-700">
                      {selectedTrace.recommendedProductIds.length} recommended
                    </dd>
                  </div>
                </dl>
                <form action={generateCampaignProposalAction} className="mt-5">
                  <input name="traceId" type="hidden" value={selectedTrace.id} />
                  <button
                    className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
                    type="submit"
                  >
                    Generate proposal
                  </button>
                </form>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Run a Manager analysis to create the first Operator handoff.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-neutral-300 bg-white p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Recent handoffs
            </p>
            {traces.length > 0 ? (
              <ol className="mt-4 space-y-3 text-sm">
                {traces.map((trace) => (
                  <li className="rounded-md border border-neutral-200 p-3" key={trace.id}>
                    <a
                      className="font-medium underline-offset-4 hover:underline"
                      href={`/operator?trace=${trace.id}`}
                    >
                      {trace.operationName}
                    </a>
                    <p className="mt-1 text-neutral-600">
                      {trace.validationStatus} · {trace.recommendedProductIds.length} products
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm leading-6 text-neutral-600">No handoffs yet.</p>
            )}
          </div>
        </aside>

        <div className="space-y-5">
          <div className="rounded-lg border border-neutral-300 bg-white p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Campaign proposal
            </p>
            {selectedProposal ? (
              <>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold">{selectedProposal.campaign.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-neutral-700">
                      {selectedProposal.campaign.summary}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    {selectedProposal.validationStatus}
                  </span>
                </div>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-neutral-900">Audience</dt>
                    <dd className="mt-1 leading-6 text-neutral-700">
                      {selectedProposal.campaign.audience}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-neutral-900">Expected impact</dt>
                    <dd className="mt-1 leading-6 text-neutral-700">
                      {selectedProposal.campaign.expectedImpact}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-neutral-900">Storefront angle</dt>
                    <dd className="mt-1 leading-6 text-neutral-700">
                      {selectedProposal.campaign.storefrontAngle}
                    </dd>
                  </div>
                </dl>
                {selectedProposal.validationErrors.length > 0 ? (
                  <ul className="mt-4 space-y-1 text-sm text-red-700">
                    {selectedProposal.validationErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-6 overflow-hidden rounded-md border border-neutral-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-100 text-neutral-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Product</th>
                        <th className="px-4 py-3 font-semibold">Margin</th>
                        <th className="px-4 py-3 font-semibold">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {selectedProposal.campaign.productIds.map((productId) => {
                        const product = productsById.get(productId);

                        return (
                          <tr key={productId}>
                            <td className="px-4 py-3 font-medium">{product?.name ?? productId}</td>
                            <td className="px-4 py-3">
                              {product ? `${product.marginPercent}%` : "Unknown"}
                            </td>
                            <td className="px-4 py-3">
                              {product ? product.inventory.toLocaleString("en-GB") : "Unknown"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Generate the first fixture-backed proposal from a Manager handoff.
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Product placement", "Choose what appears in each storefront section."],
              ["Campaign approval", "Review Codex proposals before publishing."],
              ["Publish controls", "Ship, compare, and roll back storefront versions."],
            ].map(([title, body]) => (
              <article className="rounded-lg border border-neutral-300 bg-white p-5" key={title}>
                <h2 className="text-base font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </AppChrome>
  );
}
