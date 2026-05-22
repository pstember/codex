import { requireCurrentUser } from "@/app/auth/session";
import { AppChrome } from "@/app/components/AppChrome";
import { runMetricsQuestionAction } from "@/app/manager/actions";
import {
  answerMetricsQuestion,
  approvedMetricsQuestions,
  isApprovedMetricsQuestion,
} from "@/domain/metricsCopilot";
import { products } from "@/fixtures/products";
import { fixtureCodexHarness } from "@/harness/codexHarness";
import { getAppDatabase } from "@/persistence/appDatabase";

export default async function ManagerPage({
  searchParams,
}: {
  searchParams?: Promise<{ question?: string; run?: string }>;
}) {
  const user = await requireCurrentUser("ask_deep_metrics");
  const params = await searchParams;
  const requestedQuestion = params?.question;
  const selectedQuestion =
    requestedQuestion && isApprovedMetricsQuestion(requestedQuestion)
      ? requestedQuestion
      : approvedMetricsQuestions[0];
  const answer = await answerMetricsQuestion({
    question: selectedQuestion,
    harness: fixtureCodexHarness,
    products,
  });
  const database = getAppDatabase();
  const savedTraces = database.listRecentMetricsTraces();
  const selectedTrace =
    (params?.run ? database.findMetricsTraceById(params.run) : null) ?? savedTraces[0] ?? null;
  const selectedTraceAnswer = selectedTrace
    ? await answerMetricsQuestion({
        question: selectedTrace.question,
        harness: fixtureCodexHarness,
        products,
      })
    : null;
  const selectedTraceGraphql =
    selectedTrace?.generatedGraphql || selectedTraceAnswer?.trace.generatedQuery.query || "";
  const selectedTraceRationale =
    selectedTrace?.rationale || selectedTraceAnswer?.trace.generatedQuery.rationale || "";
  const recommendedProductsById = new Map(products.map((product) => [product.id, product]));
  const selectedTraceProductNames =
    selectedTrace?.recommendedProductIds.map(
      (productId) => recommendedProductsById.get(productId)?.name ?? productId,
    ) ?? [];
  const answerProductIds = new Set(answer.recommendedProducts.map((product) => product.id));
  const selectedOverlapCount =
    selectedTrace?.recommendedProductIds.filter((productId) => answerProductIds.has(productId))
      .length ?? 0;

  return (
    <AppChrome eyebrow="Store Manager" title="Metrics command center" user={user}>
      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-neutral-300 bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Question</p>
          <h2 className="mt-3 text-2xl font-semibold">{answer.question}</h2>
          <p className="mt-4 text-base leading-7 text-neutral-700">{answer.insight.summary}</p>

          <form action={runMetricsQuestionAction} className="mt-5 flex flex-wrap gap-3">
            <label className="sr-only" htmlFor="metrics-question">
              Metrics question
            </label>
            <select
              className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              defaultValue={answer.question}
              id="metrics-question"
              name="question"
            >
              {approvedMetricsQuestions.map((question) => (
                <option key={question} value={question}>
                  {question}
                </option>
              ))}
            </select>
            <button
              className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
              type="submit"
            >
              Run analysis
            </button>
          </form>

          <div className="mt-6">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  {answer.chart.title}
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  {answer.chart.type} · {answer.chart.rows.length} rows
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-neutral-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-100 text-neutral-600">
                <tr>
                  {answer.chart.columns.map((column) => (
                    <th className="px-4 py-3 font-semibold" key={column}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {answer.chart.rows.map((row) => (
                  <tr key={row.productId ?? row.label}>
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    {row.values.map((value, index) => (
                      <td
                        className="px-4 py-3"
                        key={`${row.label}-${answer.chart.columns[index + 1]}`}
                      >
                        {value}
                      </td>
                    ))}
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
                    <a
                      className="font-medium underline-offset-4 hover:underline"
                      href={`/manager?run=${trace.id}`}
                    >
                      {trace.operationName}
                    </a>
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

          {selectedTrace ? (
            <div className="rounded-lg border border-neutral-300 bg-white p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Run detail
              </p>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-neutral-500">Question</dt>
                  <dd className="mt-1 font-medium text-neutral-900">{selectedTrace.question}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Timestamp</dt>
                  <dd className="mt-1 text-neutral-900">
                    {selectedTrace.createdAt.toLocaleString("en-GB")}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Validation</dt>
                  <dd className="mt-1 capitalize text-neutral-900">
                    {selectedTrace.validationStatus}
                  </dd>
                  {selectedTrace.validationErrors.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-red-700">
                      {selectedTrace.validationErrors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div>
                  <dt className="text-neutral-500">Rationale</dt>
                  <dd className="mt-1 leading-6 text-neutral-900">{selectedTraceRationale}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Recommended products</dt>
                  <dd className="mt-1 text-neutral-900">
                    {selectedTrace.recommendedProductIds
                      .map((productId) => recommendedProductsById.get(productId)?.name ?? productId)
                      .join(", ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Generated GraphQL</dt>
                  <dd className="mt-2 overflow-x-auto rounded-md bg-neutral-950 p-3">
                    <pre className="text-xs leading-5 text-neutral-50">{selectedTraceGraphql}</pre>
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          {selectedTrace && selectedTraceAnswer ? (
            <div className="rounded-lg border border-neutral-300 bg-white p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Saved-run comparison
              </p>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-md border border-neutral-200 p-3">
                  <p className="font-semibold text-neutral-900">Current draft</p>
                  <p className="mt-1 text-neutral-600">
                    {answer.chart.type} · {answer.recommendedProducts.length} products
                  </p>
                </div>
                <div className="rounded-md border border-neutral-200 p-3">
                  <p className="font-semibold text-neutral-900">Selected saved run</p>
                  <p className="mt-1 text-neutral-600">
                    {selectedTrace.chartType} · {selectedTrace.recommendedProductIds.length}{" "}
                    products
                  </p>
                  <p className="mt-2 text-neutral-700">
                    {selectedOverlapCount} products overlap with the current draft.
                  </p>
                  <p className="mt-2 text-neutral-600">{selectedTraceProductNames.join(", ")}</p>
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </AppChrome>
  );
}
