import { requireCurrentUser } from "@/app/auth/session";
import { AppChrome } from "@/app/components/AppChrome";
import { runMetricsQuestionAction } from "@/app/manager/actions";
import { answerMetricsQuestion, fatherDayMetricsQuestion } from "@/domain/metricsCopilot";
import { products } from "@/fixtures/products";
import { fixtureCodexHarness } from "@/harness/codexHarness";
import { getAppDatabase } from "@/persistence/appDatabase";

export default async function ManagerPage() {
  const user = await requireCurrentUser("ask_deep_metrics");
  const answer = await answerMetricsQuestion({
    question: fatherDayMetricsQuestion,
    harness: fixtureCodexHarness,
    products,
  });
  const savedTraces = getAppDatabase().listRecentMetricsTraces();

  return (
    <AppChrome eyebrow="Store Manager" title="Metrics command center" user={user}>
      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-neutral-300 bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Golden question
          </p>
          <h2 className="mt-3 text-2xl font-semibold">{answer.question}</h2>
          <p className="mt-4 text-base leading-7 text-neutral-700">{answer.insight.summary}</p>

          <form action={runMetricsQuestionAction} className="mt-5 flex flex-wrap gap-3">
            <input name="question" type="hidden" value={answer.question} />
            <button
              className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
              type="submit"
            >
              Run analysis
            </button>
          </form>

          <div className="mt-6 overflow-hidden rounded-md border border-neutral-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-100 text-neutral-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Margin</th>
                  <th className="px-4 py-3 font-semibold">Stock</th>
                  <th className="px-4 py-3 font-semibold">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {answer.recommendedProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3">{product.marginPercent}%</td>
                    <td className="px-4 py-3">{product.inventory}</td>
                    <td className="px-4 py-3">{Math.round(product.conversionRate * 1000) / 10}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-lg border border-neutral-300 bg-neutral-950 p-6 text-white">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
              Codex trace
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-neutral-400">Operation</dt>
                <dd className="mt-1 font-mono text-neutral-50">
                  {answer.trace.generatedQuery.operationName}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-400">Validation</dt>
                <dd className="mt-1 capitalize text-neutral-50">
                  {answer.trace.validation.status}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-400">Chart</dt>
                <dd className="mt-1 text-neutral-50">{answer.chart.type}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-neutral-300 bg-white p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Risk exclusions
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-700">
              {answer.insight.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-neutral-300 bg-white p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Saved runs
            </p>
            {savedTraces.length > 0 ? (
              <ol className="mt-4 space-y-3 text-sm">
                {savedTraces.map((trace) => (
                  <li className="rounded-md border border-neutral-200 p-3" key={trace.id}>
                    <p className="font-medium">{trace.operationName}</p>
                    <p className="mt-1 text-neutral-600">
                      {trace.validationStatus} · {trace.chartType} ·{" "}
                      {trace.recommendedProductIds.length} products
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm leading-6 text-neutral-600">
                Run the analysis to save the first trace.
              </p>
            )}
          </div>
        </aside>
      </section>
    </AppChrome>
  );
}
