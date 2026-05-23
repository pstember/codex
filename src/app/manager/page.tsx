import { requireCurrentUser } from "@/app/auth/session";
import { AppChrome } from "@/app/components/AppChrome";
import { runMetricsQuestionAction } from "@/app/manager/actions";
import {
  answerMetricsQuestion,
  approvedMetricsQuestions,
  compareMetricsRuns,
  isApprovedMetricsQuestion,
} from "@/domain/metricsCopilot";
import { commerceData } from "@/fixtures/commerce";
import { products } from "@/fixtures/products";
import { isCodexAppServerMode, staticCommerceHarness } from "@/harness/codexHarness";
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
    harness: staticCommerceHarness,
    products,
    commerceData,
  });
  const database = getAppDatabase();
  const savedTraces = database.listRecentMetricsTraces();
  const selectedTrace =
    (params?.run ? database.findMetricsTraceById(params.run) : null) ?? savedTraces[0] ?? null;
  const selectedTraceAnswer = selectedTrace
    ? await answerMetricsQuestion({
        question: selectedTrace.question,
        harness: staticCommerceHarness,
        products,
        commerceData,
      })
    : null;
  const selectedTraceCodexEvents = selectedTrace
    ? database.listCodexRunEvents(selectedTrace.id)
    : [];
  const customQuestionsEnabled = isCodexAppServerMode();
  const selectedTraceGraphql =
    selectedTrace?.generatedGraphql || selectedTraceAnswer?.trace.generatedQuery.query || "";
  const selectedTraceRationale =
    selectedTrace?.rationale || selectedTraceAnswer?.trace.generatedQuery.rationale || "";
  const recommendedProductsById = new Map(products.map((product) => [product.id, product]));
  const selectedTraceProductNames =
    selectedTrace?.recommendedProductIds.map(
      (productId) => recommendedProductsById.get(productId)?.name ?? productId,
    ) ?? [];
  const comparison = selectedTraceAnswer
    ? compareMetricsRuns({ current: answer, saved: selectedTraceAnswer })
    : null;
  const maxComparisonInventory = comparison
    ? Math.max(...comparison.productRows.map((row) => row.inventory), 1)
    : 1;

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

          <form
            action={runMetricsQuestionAction}
            className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-4"
          >
            <label
              className="text-sm font-semibold uppercase tracking-wide text-neutral-600"
              htmlFor="custom-metrics-question"
            >
              Ask your own question
            </label>
            <textarea
              className="mt-3 min-h-24 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm disabled:bg-neutral-100 disabled:text-neutral-500"
              disabled={!customQuestionsEnabled}
              id="custom-metrics-question"
              name="customQuestion"
              placeholder={
                customQuestionsEnabled
                  ? "Example: Which under £50 products have the best margin and enough inventory?"
                  : "Start with CODEX_HARNESS_MODE=app-server to unlock live Codex translation."
              }
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-5 text-neutral-600">
                {customQuestionsEnabled
                  ? "Codex translates this into GraphQL, the server validates it, then Atlas data is queried."
                  : "Golden queries stay available from static catalog data for quick rehearsal."}
              </p>
              <button
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-neutral-300 disabled:text-neutral-600"
                disabled={!customQuestionsEnabled}
                type="submit"
              >
                Run live Codex query
              </button>
            </div>
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

          <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
                  Operator handoff
                </p>
                <h3 className="mt-2 text-lg font-semibold text-neutral-950">
                  {answer.operatorHandoff.proposalPrompt}
                </h3>
                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  {answer.operatorHandoff.insightTitle}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                {answer.operatorHandoff.campaignSeason}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-neutral-900">Proposal products</dt>
                <dd className="mt-1 text-neutral-700">
                  {answer.operatorHandoff.productIds.length} validated picks
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-neutral-900">Guardrails</dt>
                <dd className="mt-1 text-neutral-700">
                  Exclude {answer.operatorHandoff.excludedProductIds.length} risky products
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-lg border border-neutral-300 bg-neutral-950 p-6 text-white">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
              Codex live window
            </p>
            {selectedTraceCodexEvents.length > 0 ? (
              <ol className="mt-4 space-y-3 text-sm">
                {selectedTraceCodexEvents.map((event) => (
                  <li
                    className="rounded-md border border-white/10 bg-white/5 p-3"
                    key={`${event.stage}-${event.occurredAt.toISOString()}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-neutral-50">{event.stage}</p>
                      <time className="text-xs text-neutral-400">
                        {event.occurredAt.toLocaleTimeString("en-GB")}
                      </time>
                    </div>
                    <p className="mt-1 leading-6 text-neutral-300">{event.message}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm leading-6 text-neutral-300">
                Run an analysis to show Codex prompt, schema, validation, query execution, and save
                events.
              </p>
            )}
          </div>

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

          {selectedTrace && comparison ? (
            <div className="rounded-lg border border-neutral-300 bg-white p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Saved-run comparison
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-2xl font-semibold text-neutral-950">
                    {comparison.sharedProductCount}
                  </p>
                  <p className="mt-1 text-neutral-600">shared products</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-neutral-950">
                    {comparison.changedProductCount}
                  </p>
                  <p className="mt-1 text-neutral-600">changed picks</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm">
                {comparison.productRows.map((row) => (
                  <div key={row.productId}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-neutral-900">{row.label}</p>
                      <span
                        className={
                          row.status === "shared"
                            ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800"
                            : "rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800"
                        }
                      >
                        {row.status}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={
                          row.status === "shared" ? "h-full bg-emerald-500" : "h-full bg-amber-500"
                        }
                        style={{
                          width: `${Math.max(8, (row.inventory / maxComparisonInventory) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      {row.inventory} units · {row.marginPercent}% margin
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-neutral-200 pt-4 text-sm text-neutral-600">
                <p>
                  {comparison.currentLabel}: {answer.recommendedProducts.length} products
                </p>
                <p className="mt-1">
                  {comparison.savedLabel}: {selectedTraceProductNames.join(", ")}
                </p>
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </AppChrome>
  );
}
