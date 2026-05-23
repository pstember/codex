import { requireCurrentUser } from "@/app/auth/session";
import { AppChrome } from "@/app/components/AppChrome";
import { runMetricsQuestionAction } from "@/app/manager/actions";
import {
  answerMetricsQuestion,
  approvedMetricsQuestions,
  compareMetricsRuns,
  isApprovedMetricsQuestion,
} from "@/domain/metricsCopilot";
import type { Product } from "@/domain/product";
import { commerceData } from "@/fixtures/commerce";
import { products } from "@/fixtures/products";
import { isCodexAppServerMode, staticCommerceHarness } from "@/harness/codexHarness";
import { getAppDatabase } from "@/persistence/appDatabase";

type ProductMetricRow = {
  product: Product;
  isRecommended: boolean;
  opportunityScore: number;
  revenue: number;
  addToCarts: number;
  sellThroughPressure: number;
  exposureGap: number;
  signal: "Promote" | "Monitor" | "Hold";
};

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
  const metricRows = buildProductMetricRows(products, answer.recommendedProducts);
  const recommendedMetricRows = metricRows.filter((row) => row.isRecommended);
  const holdRows = metricRows.filter((row) => row.signal === "Hold");
  const scoreMax = Math.max(...metricRows.map((row) => row.opportunityScore), 1);
  const totalInventory = sumBy(products, (product) => product.inventory);
  const totalRevenue = sumBy(products, (product) => product.price * product.purchaseCount);
  const weightedConversion = weightedAverage(
    products,
    (product) => product.conversionRate,
    (product) => product.views,
  );
  const averageMargin = average(products, (product) => product.marginPercent);
  const strongestCategory = findStrongestCategory(products);

  return (
    <AppChrome eyebrow="Store Manager" title="Metrics command center" user={user}>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-[#1d332d]/15 bg-[#fdfcf7] shadow-[0_24px_80px_rgba(28,42,37,0.10)]">
            <div className="border-b border-[#1d332d]/10 bg-[#243b35] px-5 py-5 text-white md:px-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#9de0c0]">
                    Current analysis
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#fff9e8] md:text-4xl">
                    {answer.question}
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-[#d8e6dc]">
                    {answer.insight.summary}
                  </p>
                </div>
                <div className="grid min-w-64 grid-cols-2 gap-2 text-sm">
                  <MetricPill label="Catalog SKUs" value={products.length.toString()} />
                  <MetricPill label="Saved traces" value={savedTraces.length.toString()} />
                  <MetricPill label="Validation" value={answer.trace.validation.status} />
                  <MetricPill label="Chart" value={answer.chart.type} />
                </div>
              </div>
            </div>

            <div className="grid items-start gap-4 px-5 py-5 md:px-7 lg:grid-cols-[1fr_260px]">
              <form action={runMetricsQuestionAction} className="rounded-md bg-white p-4 shadow-sm">
                <label
                  className="text-xs font-bold uppercase tracking-[0.22em] text-[#476058]"
                  htmlFor="metrics-question"
                >
                  Guided metric question
                </label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <select
                    className="min-w-0 flex-1 rounded-md border border-[#c9d3cc] bg-[#fbfaf5] px-3 py-2 text-sm text-[#18241f]"
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
                    className="rounded-md bg-[#17241f] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2c473c]"
                    type="submit"
                  >
                    Run analysis
                  </button>
                </div>
              </form>

              <form action={runMetricsQuestionAction} className="rounded-md bg-[#edf4ef] p-4">
                <label
                  className="text-xs font-bold uppercase tracking-[0.22em] text-[#476058]"
                  htmlFor="custom-metrics-question"
                >
                  Live Codex question
                </label>
                <textarea
                  className="mt-3 min-h-20 w-full resize-y rounded-md border border-[#bdcec4] bg-white px-3 py-2 text-sm text-[#18241f] disabled:bg-[#e7e8e3] disabled:text-[#78827d]"
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
                  <p className="max-w-sm text-xs leading-5 text-[#51635c]">
                    {customQuestionsEnabled
                      ? "Natural language becomes validated GraphQL before Atlas data is queried."
                      : "Static golden queries stay available for fast rehearsal."}
                  </p>
                  <button
                    className="rounded-md bg-[#d7ff63] px-4 py-2 text-sm font-bold text-[#18241f] disabled:bg-[#cfd3c9] disabled:text-[#6b736e]"
                    disabled={!customQuestionsEnabled}
                    type="submit"
                  >
                    Run live query
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              accent="bg-[#d7ff63]"
              label="Total stock"
              value={formatInteger(totalInventory)}
              detail={`${formatInteger(recommendedStock(recommendedMetricRows))} units in current picks`}
            />
            <KpiCard
              accent="bg-[#75d9c6]"
              label="Weighted conversion"
              value={formatPercent(weightedConversion)}
              detail={`${formatPercent(average(products, (product) => product.addToCartRate))} avg add-to-cart`}
            />
            <KpiCard
              accent="bg-[#ffb45b]"
              label="Average margin"
              value={`${averageMargin.toFixed(1)}%`}
              detail={`${formatCurrency(totalRevenue)} seeded sales value`}
            />
            <KpiCard
              accent="bg-[#ef7c8e]"
              label="Strongest category"
              value={strongestCategory.name}
              detail={`${strongestCategory.count} SKUs · ${strongestCategory.averageMargin.toFixed(1)}% margin`}
            />
          </section>

          <section className="rounded-lg border border-[#1d332d]/15 bg-[#fffef9] p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#476058]">
                  Product metric explorer
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[#17241f]">
                  Every SKU, not just the recommendation
                </h3>
              </div>
              <p className="max-w-md text-sm leading-6 text-[#5f6d67]">
                Opportunity blends margin, conversion, inventory depth, return risk, and exposure.
              </p>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.18em] text-[#66746e]">
                    <th className="border-b border-[#d8ded8] px-3 py-3 font-bold">Product</th>
                    <th className="border-b border-[#d8ded8] px-3 py-3 font-bold">Score</th>
                    <th className="border-b border-[#d8ded8] px-3 py-3 font-bold">Margin</th>
                    <th className="border-b border-[#d8ded8] px-3 py-3 font-bold">Stock</th>
                    <th className="border-b border-[#d8ded8] px-3 py-3 font-bold">Conversion</th>
                    <th className="border-b border-[#d8ded8] px-3 py-3 font-bold">Returns</th>
                    <th className="border-b border-[#d8ded8] px-3 py-3 font-bold">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {metricRows.map((row) => (
                    <tr className="group" key={row.product.id}>
                      <td className="border-b border-[#edf0ea] px-3 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={
                              row.isRecommended
                                ? "h-2.5 w-2.5 rounded-full bg-[#d7ff63]"
                                : "h-2.5 w-2.5 rounded-full bg-[#c8d2cb]"
                            }
                          />
                          <div>
                            <p className="font-semibold text-[#17241f]">{row.product.name}</p>
                            <p className="mt-0.5 text-xs text-[#6b7771]">{row.product.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-[#edf0ea] px-3 py-3">
                        <div className="flex min-w-36 items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e5eae3]">
                            <div
                              className="h-full rounded-full bg-[#243b35]"
                              style={{
                                width: `${Math.max(8, (row.opportunityScore / scoreMax) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="font-mono text-xs text-[#45534d]">
                            {Math.round(row.opportunityScore)}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-[#edf0ea] px-3 py-3 font-medium text-[#17241f]">
                        {row.product.marginPercent}%
                      </td>
                      <td className="border-b border-[#edf0ea] px-3 py-3 text-[#45534d]">
                        {formatInteger(row.product.inventory)}
                      </td>
                      <td className="border-b border-[#edf0ea] px-3 py-3 text-[#45534d]">
                        {formatPercent(row.product.conversionRate)}
                      </td>
                      <td className="border-b border-[#edf0ea] px-3 py-3 text-[#45534d]">
                        {formatPercent(row.product.returnRate)}
                      </td>
                      <td className="border-b border-[#edf0ea] px-3 py-3">
                        <span className={signalClassName(row.signal)}>{row.signal}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-lg border border-[#1d332d]/15 bg-[#fffef9] p-5 shadow-sm md:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#476058]">
                {answer.chart.title}
              </p>
              <div className="mt-4 overflow-hidden rounded-md border border-[#d8ded8]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#edf4ef] text-[#45534d]">
                    <tr>
                      {answer.chart.columns.map((column) => (
                        <th className="px-4 py-3 font-bold" key={column}>
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6ebe5]">
                    {answer.chart.rows.map((row) => (
                      <tr key={row.productId ?? row.label}>
                        <td className="px-4 py-3 font-semibold text-[#17241f]">{row.label}</td>
                        {row.values.map((value, index) => (
                          <td
                            className="px-4 py-3 text-[#45534d]"
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

            <div className="rounded-lg border border-[#b9d7c5] bg-[#edf8ef] p-5 shadow-sm md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2d6d53]">
                    Operator handoff
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-[#17241f]">
                    {answer.operatorHandoff.proposalPrompt}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#45534d]">
                    {answer.operatorHandoff.insightTitle}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#276044]">
                  {answer.operatorHandoff.campaignSeason}
                </span>
              </div>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <InfoStat
                  label="Proposal picks"
                  value={`${answer.operatorHandoff.productIds.length} products`}
                />
                <InfoStat
                  label="Guardrails"
                  value={`${answer.operatorHandoff.excludedProductIds.length} exclusions`}
                />
              </dl>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-[#1d332d]/15 bg-[#fffef9] p-5 shadow-sm md:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#476058]">
                Risk and hold list
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#4b5a54]">
                {answer.insight.risks.map((risk) => (
                  <li className="rounded-md bg-[#fbf2df] px-3 py-2" key={risk}>
                    {risk}
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-2 text-sm">
                {holdRows.map((row) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-md border border-[#ead9be] px-3 py-2"
                    key={row.product.id}
                  >
                    <span className="font-medium text-[#17241f]">{row.product.name}</span>
                    <span className="text-xs text-[#77614b]">
                      {formatPercent(row.product.returnRate)} returns
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[#1d332d]/15 bg-[#fffef9] p-5 shadow-sm md:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#476058]">
                Saved-run comparison
              </p>
              {selectedTrace && comparison ? (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <InfoStat
                      label="Shared products"
                      value={comparison.sharedProductCount.toString()}
                    />
                    <InfoStat
                      label="Changed picks"
                      value={comparison.changedProductCount.toString()}
                    />
                  </div>
                  <div className="mt-5 space-y-3 text-sm">
                    {comparison.productRows.map((row) => (
                      <div key={row.productId}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-[#17241f]">{row.label}</p>
                          <span
                            className={
                              row.status === "shared"
                                ? "rounded-full bg-[#dff6df] px-2 py-1 text-xs font-bold text-[#23623f]"
                                : "rounded-full bg-[#fff0c9] px-2 py-1 text-xs font-bold text-[#765315]"
                            }
                          >
                            {row.status}
                          </span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e5eae3]">
                          <div
                            className={
                              row.status === "shared"
                                ? "h-full bg-[#2aa36b]"
                                : "h-full bg-[#e6a92f]"
                            }
                            style={{
                              width: `${Math.max(8, (row.inventory / maxComparisonInventory) * 100)}%`,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-[#66746e]">
                          {row.inventory} units · {row.marginPercent}% margin
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 border-t border-[#d8ded8] pt-4 text-sm text-[#5f6d67]">
                    <p>
                      {comparison.currentLabel}: {answer.recommendedProducts.length} products
                    </p>
                    <p className="mt-1">
                      {comparison.savedLabel}: {selectedTraceProductNames.join(", ")}
                    </p>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[#5f6d67]">
                  Save a run to compare product movement against the current analysis.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto xl:pr-1">
          <section className="rounded-lg border border-[#d7ff63]/35 bg-[#17241f] p-5 text-white shadow-[0_20px_60px_rgba(23,36,31,0.24)] md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d7ff63]">
                  Codex live window
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#fff9e8]">Run observability</h3>
              </div>
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs font-bold text-[#d8e6dc]">
                {selectedTraceCodexEvents.length} events
              </span>
            </div>
            {selectedTraceCodexEvents.length > 0 ? (
              <ol className="mt-5 space-y-3 text-sm">
                {selectedTraceCodexEvents.map((event, index) => (
                  <li
                    className="grid grid-cols-[28px_1fr] gap-3 rounded-md border border-white/10 bg-white/[0.06] p-3"
                    key={`${event.stage}-${event.occurredAt.toISOString()}`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d7ff63] font-mono text-xs font-bold text-[#17241f]">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[#fff9e8]">{event.stage}</p>
                        <time className="text-xs text-[#9aaba3]">
                          {event.occurredAt.toLocaleTimeString("en-GB")}
                        </time>
                      </div>
                      <p className="mt-1 leading-6 text-[#cbd8d0]">{event.message}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm leading-6 text-[#cbd8d0]">
                Run an analysis to show prompt preparation, schema attachment, generation,
                validation, query execution, and persistence events.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-[#1d332d]/15 bg-[#fffef9] p-5 shadow-sm md:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#476058]">
              Saved runs
            </p>
            {savedTraces.length > 0 ? (
              <ol className="mt-4 space-y-3 text-sm">
                {savedTraces.map((trace) => (
                  <li
                    className={
                      trace.id === selectedTrace?.id
                        ? "rounded-md border border-[#243b35] bg-[#edf4ef] p-3"
                        : "rounded-md border border-[#d8ded8] p-3"
                    }
                    key={trace.id}
                  >
                    <a
                      className="font-semibold text-[#17241f] underline-offset-4 hover:underline"
                      href={`/manager?run=${trace.id}`}
                    >
                      {trace.operationName}
                    </a>
                    <p className="mt-1 text-[#5f6d67]">
                      {trace.validationStatus} · {trace.chartType} ·{" "}
                      {trace.recommendedProductIds.length} products
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm leading-6 text-[#5f6d67]">
                Run the analysis to save the first trace.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-[#1d332d]/15 bg-[#fffef9] p-5 shadow-sm md:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#476058]">
              Codex trace
            </p>
            <dl className="mt-4 grid gap-3 text-sm">
              <InfoStat label="Operation" value={answer.trace.generatedQuery.operationName} />
              <InfoStat label="Validation" value={answer.trace.validation.status} />
              <InfoStat
                label="Recommended"
                value={`${answer.recommendedProducts.length} products`}
              />
            </dl>
          </section>

          {selectedTrace ? (
            <section className="rounded-lg border border-[#1d332d]/15 bg-[#fffef9] p-5 shadow-sm md:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#476058]">
                Run detail
              </p>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-[#66746e]">Question</dt>
                  <dd className="mt-1 font-semibold text-[#17241f]">{selectedTrace.question}</dd>
                </div>
                <div>
                  <dt className="text-[#66746e]">Timestamp</dt>
                  <dd className="mt-1 text-[#17241f]">
                    {selectedTrace.createdAt.toLocaleString("en-GB")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#66746e]">Rationale</dt>
                  <dd className="mt-1 leading-6 text-[#17241f]">{selectedTraceRationale}</dd>
                </div>
                <div>
                  <dt className="text-[#66746e]">Recommended products</dt>
                  <dd className="mt-1 text-[#17241f]">
                    {selectedTrace.recommendedProductIds
                      .map((productId) => recommendedProductsById.get(productId)?.name ?? productId)
                      .join(", ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#66746e]">Generated GraphQL</dt>
                  <dd className="mt-2 overflow-x-auto rounded-md bg-[#17241f] p-3">
                    <pre className="text-xs leading-5 text-[#eef8ef]">{selectedTraceGraphql}</pre>
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}
        </aside>
      </section>
    </AppChrome>
  );
}

function KpiCard({
  accent,
  label,
  value,
  detail,
}: {
  accent: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-[#1d332d]/15 bg-[#fffef9] p-5 shadow-sm">
      <span className={`block h-1.5 w-12 rounded-full ${accent}`} />
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-[#66746e]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#17241f]">{value}</p>
      <p className="mt-2 text-sm leading-5 text-[#5f6d67]">{detail}</p>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9aaba3]">{label}</p>
      <p className="mt-1 truncate font-semibold text-[#fff9e8]">{value}</p>
    </div>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#d8ded8] bg-white/70 px-3 py-2">
      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-[#66746e]">{label}</dt>
      <dd className="mt-1 font-semibold text-[#17241f]">{value}</dd>
    </div>
  );
}

function buildProductMetricRows(
  catalogProducts: Product[],
  recommendedProducts: Product[],
): ProductMetricRow[] {
  const recommendedIds = new Set(recommendedProducts.map((product) => product.id));
  const maxInventory = Math.max(...catalogProducts.map((product) => product.inventory), 1);
  const maxViews = Math.max(...catalogProducts.map((product) => product.views), 1);

  return catalogProducts
    .map((product) => {
      const exposureGap = 1 - product.views / maxViews;
      const sellThroughPressure = product.inventory / maxInventory;
      const opportunityScore =
        product.marginPercent * 0.32 +
        product.conversionRate * 240 +
        product.addToCartRate * 110 +
        sellThroughPressure * 18 +
        exposureGap * 12 -
        product.returnRate * 180;
      const signal: ProductMetricRow["signal"] =
        product.marginPercent < 40 || product.inventory < 100 || product.returnRate > 0.055
          ? "Hold"
          : opportunityScore > 65
            ? "Promote"
            : "Monitor";

      return {
        product,
        isRecommended: recommendedIds.has(product.id),
        opportunityScore,
        revenue: product.price * product.purchaseCount,
        addToCarts: Math.round(product.views * product.addToCartRate),
        sellThroughPressure,
        exposureGap,
        signal,
      };
    })
    .sort((left, right) => {
      if (left.isRecommended !== right.isRecommended) {
        return left.isRecommended ? -1 : 1;
      }

      return right.opportunityScore - left.opportunityScore;
    });
}

function signalClassName(signal: ProductMetricRow["signal"]): string {
  if (signal === "Promote") {
    return "rounded-full bg-[#dff6df] px-2.5 py-1 text-xs font-bold text-[#23623f]";
  }

  if (signal === "Hold") {
    return "rounded-full bg-[#ffe2d5] px-2.5 py-1 text-xs font-bold text-[#8b3b24]";
  }

  return "rounded-full bg-[#edf0f7] px-2.5 py-1 text-xs font-bold text-[#44526c]";
}

function recommendedStock(rows: ProductMetricRow[]): number {
  return sumBy(
    rows.map((row) => row.product),
    (product) => product.inventory,
  );
}

function findStrongestCategory(catalogProducts: Product[]): {
  name: string;
  count: number;
  averageMargin: number;
} {
  const categoryMap = new Map<string, Product[]>();

  for (const product of catalogProducts) {
    categoryMap.set(product.category, [...(categoryMap.get(product.category) ?? []), product]);
  }

  const categories = [...categoryMap.entries()].map(([name, categoryProducts]) => ({
    name,
    count: categoryProducts.length,
    averageMargin: average(categoryProducts, (product) => product.marginPercent),
    conversion: average(categoryProducts, (product) => product.conversionRate),
  }));

  return categories.sort(
    (left, right) =>
      right.averageMargin * 0.65 +
      right.conversion * 100 -
      (left.averageMargin * 0.65 + left.conversion * 100),
  )[0];
}

function average(catalogProducts: Product[], readValue: (product: Product) => number): number {
  return catalogProducts.length > 0
    ? sumBy(catalogProducts, readValue) / catalogProducts.length
    : 0;
}

function weightedAverage(
  catalogProducts: Product[],
  readValue: (product: Product) => number,
  readWeight: (product: Product) => number,
): number {
  const totalWeight = sumBy(catalogProducts, readWeight);

  return totalWeight > 0
    ? sumBy(catalogProducts, (product) => readValue(product) * readWeight(product)) / totalWeight
    : 0;
}

function sumBy(catalogProducts: Product[], readValue: (product: Product) => number): number {
  return catalogProducts.reduce((total, product) => total + readValue(product), 0);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    currency: "GBP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}
