"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import type { InsightChatState } from "@/app/admin/insights/actions";
import { AdminObservabilityRail } from "@/app/components/AdminObservabilityRail";
import type {
  CommerceMetricId,
  MetricDashboard,
  MetricEvidence,
  RankedProductMetricRow,
} from "@/domain/commerceMetrics";
import { commerceMetricCatalog } from "@/domain/commerceMetrics";
import type { DataQuestionEvent } from "@/domain/dataQuestion";
import type { SourceDataCatalog } from "@/domain/sourceDataCatalog";

const initialState: InsightChatState = {};
const exampleQuestions = [
  "Which item should I promote in my next campaign?",
  "Which products should we avoid promoting because of low margin, low stock, or high returns?",
  "Which returns were requested from June 1 to June 3?",
  "Which is my biggest return reason on items below £50?",
  "Is there any outlier in my conversion rate?",
];
const metricGroups = ["product", "order", "return", "customer", "campaign"].map((entity) => ({
  entity,
  metrics: commerceMetricCatalog.filter((metric) => metric.entity === entity),
}));
const productSortMetricIds: CommerceMetricId[] = [
  "product_promotion_score",
  "product_risk_score",
  "product_giftability_score",
  "product_margin_percent",
  "product_inventory",
  "product_conversion_rate",
  "product_return_rate",
  "product_exposure_gap",
];
const productMetricLabels = new Map(
  commerceMetricCatalog.map((metricDefinition) => [metricDefinition.id, metricDefinition.label]),
);
type RecentRun = {
  id: string;
  message: string;
  state: InsightChatState;
  status: InsightChatState["status"] | "error";
  traceEvents: DataQuestionEvent[];
};

export function InsightsChat({ dataCatalog }: { dataCatalog: SourceDataCatalog }) {
  const [state, setState] = useState<InsightChatState>(initialState);
  const [message, setMessage] = useState("");
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [traceEvents, setTraceEvents] = useState<DataQuestionEvent[]>([]);
  const [isObservabilityOpen, setIsObservabilityOpen] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const visibleEvidence = state.metricEvidence;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedMessage = message.trim();

    if (!submittedMessage) {
      setState({ error: "Enter a commerce data question before sending it to Codex." });
      return;
    }

    setIsPending(true);
    setTraceEvents([]);
    setState({ message: submittedMessage });
    const collectedTraceEvents: DataQuestionEvent[] = [];

    try {
      const response = await fetch("/api/insights/data-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: submittedMessage }),
      });

      if (!response.ok || !response.body) {
        throw new Error("The live data-question stream could not be opened.");
      }

      await readEventStream(response.body, {
        onTrace(traceEvent) {
          collectedTraceEvents.push(traceEvent);
          setTraceEvents((currentEvents) => [...currentEvents, traceEvent]);
          setState((currentState) => mergeTracePayload(currentState, traceEvent));
        },
        onResult(result) {
          setState(result);
          addRecentRun({
            message: submittedMessage,
            state: result,
            status: result.status ?? "answered",
            traceEvents: collectedTraceEvents,
          });
        },
        onError(errorMessage) {
          const errorState = { error: errorMessage, message: submittedMessage };
          setState(errorState);
          addRecentRun({
            message: submittedMessage,
            state: errorState,
            status: "error",
            traceEvents: collectedTraceEvents,
          });
        },
      });
    } catch (error) {
      const errorState = {
        error: error instanceof Error ? error.message : "The data-question run failed.",
        message: submittedMessage,
      };
      setState(errorState);
      addRecentRun({
        message: submittedMessage,
        state: errorState,
        status: "error",
        traceEvents: collectedTraceEvents,
      });
    } finally {
      setIsPending(false);
    }
  }

  function addRecentRun(run: Omit<RecentRun, "id">) {
    setRecentRuns((currentRuns) =>
      [
        {
          ...run,
          id: `${Date.now()}-${currentRuns.length}`,
        },
        ...currentRuns,
      ].slice(0, 5),
    );
  }

  function revisitRun(run: RecentRun) {
    setMessage(run.message);
    setState(run.state);
    setTraceEvents(run.traceEvents);
  }

  return (
    <div className="relative">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 xl:mx-auto xl:w-full xl:max-w-[1120px] xl:justify-self-center">
        <DashboardOverview dashboard={dataCatalog.dashboard} />

        <form
          onSubmit={handleSubmit}
          className="d20-card grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 rounded-lg border p-5 shadow-[0_22px_70px_rgba(8,13,31,0.14)] md:p-7"
        >
          <div className="flex flex-col gap-2 border-b border-[#d7e0f4] pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2563eb]">
                Conversation
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#0b1020]">Atlas data questions</h2>
            </div>
            <span className="w-fit rounded-md border border-[#b8c8ff] bg-[#eef5ff] px-3 py-1 text-xs font-bold text-[#2563eb]">
              Live stdio path
            </span>
          </div>

          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <label className="grid min-w-0 content-start gap-2" htmlFor="test-chat-message">
              <span className="text-sm font-bold text-[#17203a]">Message</span>
              <textarea
                className="min-h-72 w-full min-w-0 resize-y rounded-md border border-[#abc2ff] bg-[#fbfdff] px-4 py-3 text-base leading-7 text-[#0b1020] shadow-inner outline-none transition placeholder:text-[#8a96ad] focus:border-[#14213d] focus:ring-4 focus:ring-[#22d3ee]/25"
                id="test-chat-message"
                name="message"
                onChange={(changeEvent) => setMessage(changeEvent.target.value)}
                placeholder="Ask which return reason leads below £50, or whether conversion has outliers..."
                value={message}
              />
            </label>

            <aside className="border-[#cad8f2] lg:border-l lg:pl-5">
              <p className="text-sm font-bold text-[#17203a]">Try asking</p>
              <div className="mt-2 grid gap-2">
                {exampleQuestions.map((question) => (
                  <button
                    className="rounded-md border border-[#c7d7ff] bg-[#fbfdff] px-3 py-2.5 text-left text-sm leading-5 text-[#14213d] transition hover:border-[#2563eb] hover:bg-[#eef5ff] focus:outline-none focus:ring-4 focus:ring-[#22d3ee]/25"
                    key={question}
                    onClick={() => setMessage(question)}
                    type="button"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </aside>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-md bg-[#0b1020] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:cursor-wait disabled:bg-[#6f7d77]"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Running..." : "Ask data question"}
            </button>
            <p className="text-sm text-[#5b6883]">
              Streams the query, validation, evidence, and final answer as they happen.
            </p>
          </div>

          <section
            aria-live="polite"
            className="min-h-32 rounded-md border border-[#223b78]/15 bg-white p-5 shadow-[0_18px_60px_rgba(8,13,31,0.10)]"
          >
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2563eb]">Response</p>
            {state.error ? (
              <p className="mt-3 text-sm leading-6 text-[#be123c]">{state.error}</p>
            ) : (
              <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-[#14213d]">
                {state.reply ?? "Codex response will appear here after you send a message."}
              </p>
            )}
            {state.evidence?.length ? (
              <ul className="mt-4 grid gap-2 text-sm text-[#334155]">
                {state.evidence.map((evidence) => (
                  <li className="rounded-md bg-[#f1f6f1] px-3 py-2" key={evidence}>
                    {evidence}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </form>

        <MetricCoverage />

        <MetricLens evidence={visibleEvidence} isPending={isPending} />

        <SkuMetricExplorer dashboard={dataCatalog.dashboard} evidence={visibleEvidence} />

        <MetricVisuals dashboard={dataCatalog.dashboard} evidence={visibleEvidence} />

        <DataCatalogView catalog={dataCatalog} />
      </div>

      <AdminObservabilityRail
        isOpen={isObservabilityOpen}
        onToggle={() => setIsObservabilityOpen((current) => !current)}
        title="Codex exchange"
      >
        <RecentRunsPanel onRevisitRun={revisitRun} runs={recentRuns} />
        <TraceTimeline events={traceEvents} />
      </AdminObservabilityRail>
    </div>
  );
}

function MetricCoverage() {
  return (
    <section className="d20-card rounded-lg border p-5 shadow-[0_18px_60px_rgba(8,13,31,0.10)] md:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2563eb]">
        Metric coverage
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
        {metricGroups.map((group) => (
          <div className="min-w-0" key={group.entity}>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#64748b]">
              {group.entity}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.metrics.map((metric) => (
                <span
                  className="rounded-md border border-[#c7d7ff] bg-[#eef5ff] px-3 py-1.5 text-xs font-semibold text-[#2563eb]"
                  key={metric.id}
                  title={metric.description}
                >
                  {metric.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardOverview({ dashboard }: { dashboard: MetricDashboard }) {
  return (
    <section className="d20-ink overflow-hidden rounded-lg border border-white/10 p-4 text-[#f8fbff] shadow-[0_24px_80px_rgba(8,13,31,0.24)] md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
            Metric cockpit
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Atlas trading signals</h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-[#c7d2fe]">
          Backend-calculated KPIs from seeded commerce data before Codex writes the explanation.
        </p>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {dashboard.kpis.map((kpi) => (
          <div className={kpiCardClassName(kpi.tone)} key={kpi.id}>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#64748b]">
              {kpi.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#0b1020]">{kpi.value}</p>
            <p className="mt-1 text-xs leading-5 text-[#64748b]">{kpi.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetricLens({ evidence, isPending }: { evidence?: MetricEvidence; isPending: boolean }) {
  const requestedMetrics = evidence?.requestedMetrics ?? [];

  return (
    <section className="d20-card rounded-lg border p-5 shadow-[0_18px_60px_rgba(8,13,31,0.10)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2563eb]">
            Metric Lens
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#0b1020]">Calculated evidence</h2>
        </div>
        <span className={evidenceStatusClassName(evidence?.status, isPending)}>
          {isPending ? "Calculating" : (evidence?.status ?? "Waiting")}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {requestedMetrics.length > 0 ? (
          requestedMetrics.map((metricId) => (
            <span
              className="rounded-md border border-[#cad8f2] bg-[#eef5ff] px-2.5 py-1 text-xs font-bold text-[#2563eb]"
              key={metricId}
            >
              {formatMetricId(metricId)}
            </span>
          ))
        ) : (
          <p className="text-sm leading-6 text-[#64748b]">
            Ask a data question to see requested metrics, sort, limit, and evidence sufficiency.
          </p>
        )}
      </div>
      {evidence ? (
        <div className="mt-4 grid gap-2 text-sm text-[#334155] md:grid-cols-3">
          <MetricLensFact
            label="Sort"
            value={evidence.sortBy ? formatMetricId(evidence.sortBy) : "Default"}
          />
          <MetricLensFact label="Limit" value={String(evidence.limit)} />
          <MetricLensFact
            label="Rows"
            value={
              evidence.truncated
                ? `${evidence.rows.length} shown, truncated`
                : `${evidence.rows.length} shown`
            }
          />
        </div>
      ) : null}
    </section>
  );
}

function MetricLensFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#d7e0f4] bg-[#f5f8ff] px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">{label}</p>
      <p className="mt-1 font-semibold text-[#0b1020]">{value}</p>
    </div>
  );
}

function SkuMetricExplorer({
  dashboard,
  evidence,
}: {
  dashboard: MetricDashboard;
  evidence?: MetricEvidence;
}) {
  const [search, setSearch] = useState("");
  const [signalFilter, setSignalFilter] = useState<RankedProductMetricRow["signal"] | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortMetric, setSortMetric] = useState<CommerceMetricId>(
    evidence?.sortBy ?? "product_promotion_score",
  );
  const [selectedProductId, setSelectedProductId] = useState(dashboard.rankedProducts[0]?.id ?? "");
  const evidenceProductIds = useMemo(
    () => new Set((evidence?.rows ?? []).map((row) => row.id)),
    [evidence],
  );

  useEffect(() => {
    if (evidence?.sortBy && productSortMetricIds.includes(evidence.sortBy)) {
      setSortMetric(evidence.sortBy);
    }
  }, [evidence?.sortBy]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...dashboard.rankedProducts]
      .filter((row) => {
        const matchesSearch =
          !normalizedSearch ||
          row.name.toLowerCase().includes(normalizedSearch) ||
          row.category.toLowerCase().includes(normalizedSearch) ||
          row.id.toLowerCase().includes(normalizedSearch);
        const matchesSignal = signalFilter === "all" || row.signal === signalFilter;
        const matchesCategory = categoryFilter === "all" || row.category === categoryFilter;

        return matchesSearch && matchesSignal && matchesCategory;
      })
      .sort((left, right) => (right.metrics[sortMetric] ?? 0) - (left.metrics[sortMetric] ?? 0));
  }, [categoryFilter, dashboard.rankedProducts, search, signalFilter, sortMetric]);
  const selectedRow =
    filteredRows.find((row) => row.id === selectedProductId) ??
    filteredRows[0] ??
    dashboard.rankedProducts.find((row) => row.id === selectedProductId) ??
    dashboard.rankedProducts[0];
  const maxMetricValue = Math.max(...filteredRows.map((row) => row.metrics[sortMetric] ?? 0), 1);

  return (
    <section className="d20-card rounded-lg border p-5 shadow-[0_20px_70px_rgba(8,13,31,0.12)] md:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2563eb]">
            Product metric explorer
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[#0b1020]">
            Every SKU, not just the recommendation
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-[#5b6883]">
          Inspect the full catalog behind the answer. Filters are local, instant, and use the same
          backend-calculated product metrics that Codex receives as evidence.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ExplorerStat label="Promote" value={dashboard.signalSummary.Promote} tone="good" />
        <ExplorerStat label="Monitor" value={dashboard.signalSummary.Monitor} tone="neutral" />
        <ExplorerStat label="Hold" value={dashboard.signalSummary.Hold} tone="risk" />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_220px]">
        <label className="grid gap-1.5 text-sm font-semibold text-[#17203a]">
          Search SKUs
          <input
            className="min-w-0 rounded-md border border-[#abc2ff] bg-[#fbfdff] px-3 py-2 text-sm font-normal text-[#0b1020] outline-none transition placeholder:text-[#8a96ad] focus:border-[#14213d] focus:ring-4 focus:ring-[#22d3ee]/25"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Product, category, or id"
            type="search"
            value={search}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#17203a]">
          Signal
          <select
            className="rounded-md border border-[#abc2ff] bg-[#fbfdff] px-3 py-2 text-sm font-normal text-[#0b1020] outline-none transition focus:border-[#14213d] focus:ring-4 focus:ring-[#22d3ee]/25"
            onChange={(event) =>
              setSignalFilter(event.target.value as RankedProductMetricRow["signal"] | "all")
            }
            value={signalFilter}
          >
            <option value="all">All signals</option>
            <option value="Promote">Promote</option>
            <option value="Monitor">Monitor</option>
            <option value="Hold">Hold</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#17203a]">
          Category
          <select
            className="rounded-md border border-[#abc2ff] bg-[#fbfdff] px-3 py-2 text-sm font-normal text-[#0b1020] outline-none transition focus:border-[#14213d] focus:ring-4 focus:ring-[#22d3ee]/25"
            onChange={(event) => setCategoryFilter(event.target.value)}
            value={categoryFilter}
          >
            <option value="all">All categories</option>
            {dashboard.productCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#17203a]">
          Sort by
          <select
            className="rounded-md border border-[#abc2ff] bg-[#fbfdff] px-3 py-2 text-sm font-normal text-[#0b1020] outline-none transition focus:border-[#14213d] focus:ring-4 focus:ring-[#22d3ee]/25"
            onChange={(event) => setSortMetric(event.target.value as CommerceMetricId)}
            value={sortMetric}
          >
            {productSortMetricIds.map((metricId) => (
              <option key={metricId} value={metricId}>
                {productMetricLabels.get(metricId) ?? formatMetricId(metricId)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="font-semibold text-[#17203a]">
              {filteredRows.length} of {dashboard.rankedProducts.length} SKUs shown
            </p>
            {evidence ? (
              <span className="rounded-md border border-[#c7d7ff] bg-[#eef5ff] px-2.5 py-1 text-xs font-bold text-[#2563eb]">
                {evidence.rows.length} in current evidence
              </span>
            ) : null}
          </div>
          <div className="max-h-[520px] overflow-auto rounded-md border border-[#d7e0f4] bg-white">
            <table className="w-full min-w-[840px] border-separate border-spacing-0 text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#14213d] text-[#f8fbff]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Product</th>
                  <th className="px-3 py-2 font-semibold">Sort metric</th>
                  <th className="px-3 py-2 font-semibold">Margin</th>
                  <th className="px-3 py-2 font-semibold">Stock</th>
                  <th className="px-3 py-2 font-semibold">Conversion</th>
                  <th className="px-3 py-2 font-semibold">Returns</th>
                  <th className="px-3 py-2 font-semibold">Signal</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <SkuMetricRow
                    isEvidenceRow={evidenceProductIds.has(row.id)}
                    isSelected={row.id === selectedRow?.id}
                    key={row.id}
                    maxMetricValue={maxMetricValue}
                    onSelect={() => setSelectedProductId(row.id)}
                    row={row}
                    sortMetric={sortMetric}
                  />
                ))}
              </tbody>
            </table>
            {filteredRows.length === 0 ? (
              <p className="px-4 py-6 text-sm leading-6 text-[#64748b]">
                No SKUs match those local filters.
              </p>
            ) : null}
          </div>
        </div>

        {selectedRow ? (
          <SelectedSkuDetail
            isEvidenceRow={evidenceProductIds.has(selectedRow.id)}
            row={selectedRow}
            sortMetric={sortMetric}
          />
        ) : null}
      </div>
    </section>
  );
}

function ExplorerStat({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "good" | "neutral" | "risk";
  value: number;
}) {
  return (
    <div className={explorerStatClassName(tone)}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748b]">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-[#0b1020]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#64748b]">Catalog signal count</p>
    </div>
  );
}

function SkuMetricRow({
  isEvidenceRow,
  isSelected,
  maxMetricValue,
  onSelect,
  row,
  sortMetric,
}: {
  isEvidenceRow: boolean;
  isSelected: boolean;
  maxMetricValue: number;
  onSelect: () => void;
  row: RankedProductMetricRow;
  sortMetric: CommerceMetricId;
}) {
  const metricValue = row.metrics[sortMetric] ?? 0;

  return (
    <tr className={isSelected ? "bg-[#eef5ff]" : "bg-white"}>
      <td className="border-t border-[#e2e8f8] px-3 py-3">
        <button
          className="block text-left outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee]"
          onClick={onSelect}
          type="button"
        >
          <span className="font-semibold text-[#0b1020]">{row.name}</span>
          <span className="mt-1 block text-xs text-[#64748b]">{row.category}</span>
        </button>
      </td>
      <td className="border-t border-[#e2e8f8] px-3 py-3">
        <div className="flex min-w-36 items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#dbe7ff]">
            <div
              className="h-full rounded-full bg-[#2563eb]"
              style={{ width: `${Math.max(5, (metricValue / maxMetricValue) * 100)}%` }}
            />
          </div>
          <span className="font-semibold tabular-nums text-[#0b1020]">
            {formatMetricValue(sortMetric, metricValue)}
          </span>
        </div>
      </td>
      <td className="border-t border-[#e2e8f8] px-3 py-3 tabular-nums text-[#334155]">
        {formatPercent((row.metrics.product_margin_percent ?? 0) / 100)}
      </td>
      <td className="border-t border-[#e2e8f8] px-3 py-3 tabular-nums text-[#334155]">
        {formatInteger(row.metrics.product_inventory ?? 0)}
      </td>
      <td className="border-t border-[#e2e8f8] px-3 py-3 tabular-nums text-[#334155]">
        {formatPercent(row.metrics.product_conversion_rate ?? 0)}
      </td>
      <td className="border-t border-[#e2e8f8] px-3 py-3 tabular-nums text-[#334155]">
        {formatPercent(row.metrics.product_return_rate ?? 0)}
      </td>
      <td className="border-t border-[#e2e8f8] px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={signalClassName(row.signal)}>{row.signal}</span>
          {isEvidenceRow ? (
            <span className="rounded-full bg-[#eef5ff] px-2 py-1 text-[11px] font-bold text-[#2563eb]">
              Evidence
            </span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function SelectedSkuDetail({
  isEvidenceRow,
  row,
  sortMetric,
}: {
  isEvidenceRow: boolean;
  row: RankedProductMetricRow;
  sortMetric: CommerceMetricId;
}) {
  return (
    <aside className="rounded-md border border-[#d7e0f4] bg-[#f8fbff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2563eb]">
            Selected SKU
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[#0b1020]">{row.name}</h3>
          <p className="mt-1 text-sm text-[#64748b]">{row.category}</p>
        </div>
        <span className={signalClassName(row.signal)}>{row.signal}</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <MetricLensFact
          label={productMetricLabels.get(sortMetric) ?? "Sort metric"}
          value={formatMetricValue(sortMetric, row.metrics[sortMetric] ?? 0)}
        />
        <MetricLensFact
          label="Risk score"
          value={formatNumber(row.metrics.product_risk_score ?? 0)}
        />
        <MetricLensFact label="Revenue" value={formatCurrency(row.metrics.product_revenue ?? 0)} />
        <MetricLensFact
          label="Gross profit"
          value={formatCurrency(row.metrics.product_gross_profit ?? 0)}
        />
      </dl>

      <div className="mt-4 rounded-md border border-[#cad8f2] bg-white px-3 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#64748b]">
          Why it is here
        </p>
        <p className="mt-2 text-sm leading-6 text-[#334155]">{row.reasons.join(" · ")}</p>
        <p className="mt-3 text-xs font-semibold text-[#2563eb]">
          {isEvidenceRow
            ? "Included in the current Codex evidence pack."
            : "Visible in the full catalog, outside the current capped evidence rows."}
        </p>
      </div>
    </aside>
  );
}

function MetricVisuals({
  dashboard,
  evidence,
}: {
  dashboard: MetricDashboard;
  evidence?: MetricEvidence;
}) {
  const rankedRows = evidence?.rows.length ? evidence.rows : dashboard.rankedProducts.slice(0, 5);
  const riskRows = evidence?.riskRows.length ? evidence.riskRows : dashboard.riskRows;
  const maxScore = Math.max(
    ...rankedRows.map((row) => row.metrics.product_promotion_score ?? 0),
    1,
  );
  const topCandidate = rankedRows[0];

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
      <div className="d20-card rounded-lg border p-5 shadow-[0_18px_60px_rgba(8,13,31,0.10)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2563eb]">
              Top candidates
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#0b1020]">Focused shortlist</h2>
          </div>
          <span className="rounded-md bg-[#0b1020] px-3 py-1 text-xs font-bold text-[#f8fbff]">
            Backend scored
          </span>
        </div>
        {topCandidate ? (
          <CampaignActionReadout dashboard={dashboard} topCandidate={topCandidate} />
        ) : null}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-[#64748b]">
              <tr>
                <th className="pb-2">Rank</th>
                <th className="pb-2">Product</th>
                <th className="pb-2">Score</th>
                <th className="pb-2">Margin</th>
                <th className="pb-2">Stock</th>
                <th className="pb-2">Signal</th>
              </tr>
            </thead>
            <tbody>
              {rankedRows.map((row) => (
                <RankedProductRow key={row.id} maxScore={maxScore} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4">
        <RiskPanel rows={riskRows} />
        <ReturnReasonPanel dashboard={dashboard} />
        <ChannelMixPanel dashboard={dashboard} />
        <ConversionStrip dashboard={dashboard} />
      </div>
    </section>
  );
}

function RankedProductRow({ maxScore, row }: { maxScore: number; row: RankedProductMetricRow }) {
  const score = row.metrics.product_promotion_score ?? 0;

  return (
    <tr className="border-t border-[#e2e8f8]">
      <td className="border-t border-[#e2e8f8] py-3 pr-3 font-semibold tabular-nums text-[#0b1020]">
        {row.rank}
      </td>
      <td className="border-t border-[#e2e8f8] py-3 pr-3">
        <p className="font-semibold text-[#0b1020]">{row.name}</p>
        <p className="mt-1 text-xs text-[#64748b]">{row.category}</p>
      </td>
      <td className="border-t border-[#e2e8f8] py-3 pr-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-[#dbe7ff]">
            <div
              className="h-full rounded-full bg-[#2563eb]"
              style={{ width: `${Math.max(6, (score / maxScore) * 100)}%` }}
            />
          </div>
          <span className="font-semibold tabular-nums text-[#0b1020]">{formatNumber(score)}</span>
        </div>
      </td>
      <td className="border-t border-[#e2e8f8] py-3 pr-3 tabular-nums text-[#334155]">
        {formatPercent((row.metrics.product_margin_percent ?? 0) / 100)}
      </td>
      <td className="border-t border-[#e2e8f8] py-3 pr-3 tabular-nums text-[#334155]">
        {formatInteger(row.metrics.product_inventory ?? 0)}
      </td>
      <td className="border-t border-[#e2e8f8] py-3 pr-3">
        <span className={signalClassName(row.signal)}>{row.signal}</span>
      </td>
    </tr>
  );
}

function CampaignActionReadout({
  dashboard,
  topCandidate,
}: {
  dashboard: MetricDashboard;
  topCandidate: RankedProductMetricRow;
}) {
  return (
    <div className="mt-4 grid gap-3 rounded-md border border-[#cad8f2] bg-[#f8fbff] p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)]">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2563eb]">
          Campaign action readout
        </p>
        <h3 className="mt-2 text-lg font-semibold text-[#0b1020]">Lead with {topCandidate.name}</h3>
        <p className="mt-2 text-sm leading-6 text-[#475569]">
          {topCandidate.reasons.join(" · ")}. Use the SKU explorer above to check adjacent
          candidates before this becomes an Operator handoff.
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-md border border-[#a7f3d0] bg-[#ecfff7] px-2 py-2">
          <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#157f5b]">
            Promote
          </dt>
          <dd className="mt-1 text-xl font-semibold text-[#0b1020]">
            {dashboard.signalSummary.Promote}
          </dd>
        </div>
        <div className="rounded-md border border-[#d7e0f4] bg-white px-2 py-2">
          <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748b]">
            Monitor
          </dt>
          <dd className="mt-1 text-xl font-semibold text-[#0b1020]">
            {dashboard.signalSummary.Monitor}
          </dd>
        </div>
        <div className="rounded-md border border-[#fed7aa] bg-[#fff7ed] px-2 py-2">
          <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#b45309]">Hold</dt>
          <dd className="mt-1 text-xl font-semibold text-[#0b1020]">
            {dashboard.signalSummary.Hold}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function RiskPanel({ rows }: { rows: RankedProductMetricRow[] }) {
  return (
    <MiniPanel eyebrow="Risk holds" title="Do not push blindly">
      <div className="grid gap-2">
        {rows.slice(0, 4).map((row) => (
          <div className="rounded-md border border-[#fecdd3] bg-[#fff1f2] px-3 py-2" key={row.id}>
            <p className="font-semibold text-[#be123c]">{row.name}</p>
            <p className="mt-1 text-xs text-[#9f4a28]">{row.reasons.join(" · ")}</p>
          </div>
        ))}
      </div>
    </MiniPanel>
  );
}

function ReturnReasonPanel({ dashboard }: { dashboard: MetricDashboard }) {
  const maxCount = Math.max(...dashboard.returnReasons.map((reason) => reason.count), 1);

  return (
    <MiniPanel eyebrow="Returns" title="Reason distribution">
      <div className="grid gap-2">
        {dashboard.returnReasons.map((reason) => (
          <MetricBar
            key={reason.reason}
            label={reason.reason}
            value={`${reason.count} · ${formatPercent(reason.share)}`}
            width={(reason.count / maxCount) * 100}
          />
        ))}
      </div>
    </MiniPanel>
  );
}

function ChannelMixPanel({ dashboard }: { dashboard: MetricDashboard }) {
  return (
    <MiniPanel eyebrow="Orders" title="Channel mix">
      <div className="grid gap-2">
        {dashboard.channelMix.map((channel) => (
          <MetricBar
            key={channel.channel}
            label={channel.channel}
            value={`${channel.count} · ${formatPercent(channel.share)}`}
            width={channel.share * 100}
          />
        ))}
      </div>
    </MiniPanel>
  );
}

function ConversionStrip({ dashboard }: { dashboard: MetricDashboard }) {
  return (
    <MiniPanel eyebrow="Conversion" title="Catalog strip">
      <div className="grid grid-cols-3 gap-2">
        {dashboard.conversionStrip.map((step) => (
          <div className="rounded-md border border-[#d7e0f4] bg-[#f5f8ff] p-2" key={step.label}>
            <p className="text-xs font-semibold text-[#64748b]">{step.label}</p>
            <p className="mt-1 font-semibold tabular-nums text-[#0b1020]">{step.value}</p>
            <p className="mt-1 text-[11px] leading-4 text-[#64748b]">{step.detail}</p>
          </div>
        ))}
      </div>
    </MiniPanel>
  );
}

function MiniPanel({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="d20-card rounded-lg border p-4 shadow-[0_16px_50px_rgba(8,13,31,0.09)]">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2563eb]">{eyebrow}</p>
      <h3 className="mt-1 text-base font-semibold text-[#0b1020]">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MetricBar({ label, value, width }: { label: string; value: string; width: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold capitalize text-[#334155]">{label}</span>
        <span className="tabular-nums text-[#64748b]">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#dbe7ff]">
        <div
          className="h-full rounded-full bg-[#22d3ee]"
          style={{ width: `${Math.max(4, width)}%` }}
        />
      </div>
    </div>
  );
}

function explorerStatClassName(tone: "good" | "neutral" | "risk"): string {
  const base = "rounded-md border px-4 py-3 shadow-sm";

  if (tone === "good") {
    return `${base} border-[#a7f3d0] bg-[#ecfff7]`;
  }

  if (tone === "risk") {
    return `${base} border-[#fed7aa] bg-[#fff7ed]`;
  }

  return `${base} border-[#d7e0f4] bg-white`;
}

function mergeTracePayload(
  currentState: InsightChatState,
  traceEvent: DataQuestionEvent,
): InsightChatState {
  if (!traceEvent.payload) {
    return currentState;
  }

  if (traceEvent.stage === "query-prompt-prepared") {
    return { ...currentState, rawQueryPrompt: traceEvent.payload };
  }

  if (traceEvent.stage === "query-response-received") {
    return { ...currentState, rawQueryResponse: traceEvent.payload };
  }

  if (traceEvent.stage === "answer-prompt-prepared") {
    return { ...currentState, rawAnswerPrompt: traceEvent.payload };
  }

  if (traceEvent.stage === "answer-response-received") {
    return { ...currentState, rawAnswerResponse: traceEvent.payload };
  }

  return currentState;
}

function RecentRunsPanel({
  onRevisitRun,
  runs,
}: {
  onRevisitRun: (run: RecentRun) => void;
  runs: RecentRun[];
}) {
  return (
    <section className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#22d3ee]">Recent runs</p>
      {runs.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {runs.map((run) => (
            <button
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-left transition hover:border-[#22d3ee]/60 hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-[#22d3ee]/50"
              key={run.id}
              onClick={() => onRevisitRun(run)}
              type="button"
            >
              <span className="line-clamp-2 text-sm font-semibold leading-5 text-[#f8fbff]">
                {run.message}
              </span>
              <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#67e8f9]">
                {recentRunStatusLabel(run.status)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[#cbd5e1]">
          Completed questions will appear here for quick review.
        </p>
      )}
    </section>
  );
}

function TraceTimeline({ events }: { events: DataQuestionEvent[] }) {
  return (
    <section className="min-h-24 rounded-md border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#22d3ee]">Live trace</p>
      {events.length > 0 ? (
        <ol className="mt-3 grid gap-2">
          {events.map((event, index) => (
            <li
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2"
              key={`${event.stage}-${event.title}-${event.body}`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#d7ff3f] text-[10px] font-bold text-[#0b1020]">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#f8fbff]">{event.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[#cbd5e1]">{event.body}</p>
                  {event.payload ? (
                    <details className="mt-2 rounded-md border border-white/10 bg-black/20">
                      <summary className="cursor-pointer list-none px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#67e8f9]">
                        {tracePayloadLabel(event)}
                      </summary>
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap border-t border-white/10 p-2 text-[11px] leading-5 text-[#d7ff3f]">
                        {event.payload}
                      </pre>
                    </details>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[#cbd5e1]">
          Submit a data question to watch each exchange step populate here.
        </p>
      )}
    </section>
  );
}

function tracePayloadLabel(event: DataQuestionEvent): string {
  if (event.payloadKind === "app-server-request") {
    return "App Server request JSON";
  }

  if (event.payloadKind === "app-server-response") {
    return "App Server response JSON";
  }

  if (event.payloadKind === "prompt") {
    return "Prompt text";
  }

  if (event.payloadKind === "graphql") {
    return "Generated GraphQL";
  }

  if (event.payloadKind === "evidence") {
    return "Evidence detail";
  }

  return "Trace detail";
}

function DataCatalogView({ catalog }: { catalog: SourceDataCatalog }) {
  return (
    <section className="d20-card min-w-0 overflow-hidden rounded-lg border p-5 shadow-[0_18px_60px_rgba(8,13,31,0.10)] md:p-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2563eb]">
            Data browser
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[#0b1020]">All seeded data</h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-[#5b6883]">
          Every fixture-backed collection in one place for rebuilding the copilot against visible
          source data.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-5">
        {catalog.summary.map((metric) => (
          <div className="rounded-md border border-[#d7e0f4] bg-[#f5f8ff] p-3" key={metric.label}>
            <p className="text-xs font-semibold text-[#64748b]">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#0b1020]">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
        {catalog.tables.map((table) => (
          <DataTable key={table.id} table={table} />
        ))}
      </div>
    </section>
  );
}

function DataTable({ table }: { table: SourceDataCatalog["tables"][number] }) {
  return (
    <details
      className="min-w-0 overflow-hidden rounded-md border border-[#d7e0f4] bg-white"
      open={table.id === "products"}
    >
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#0b1020]">{table.title}</h3>
            <p className="mt-1 text-sm leading-5 text-[#64748b]">{table.description}</p>
          </div>
          <span className="w-fit rounded-md bg-[#eef5ff] px-2 py-1 text-xs font-bold text-[#2563eb]">
            {table.rows.length} rows
          </span>
        </div>
      </summary>
      <div className="min-w-0 border-t border-[#d7e0f4]">
        <div className="max-h-[420px] max-w-full overflow-auto">
          <table className="w-max min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#14213d] text-[#f8fbff]">
              <tr>
                {table.columns.map((column) => (
                  <th className="whitespace-nowrap px-3 py-2 font-semibold" key={column}>
                    {formatColumnName(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, index) => (
                <tr
                  className={index % 2 === 0 ? "bg-white" : "bg-[#f8fbff]"}
                  key={rowKey(row, index)}
                >
                  {table.columns.map((column) => (
                    <td
                      className="max-w-72 border-t border-[#e2e8f8] px-3 py-2 align-top text-[#17203a]"
                      key={column}
                    >
                      <span className="line-clamp-3 break-words">{String(row[column])}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

function kpiCardClassName(tone: MetricDashboard["kpis"][number]["tone"]): string {
  const base = "rounded-md border p-3 shadow-sm";

  if (tone === "good") {
    return `${base} border-[#a7f3d0] bg-[#ecfff7]`;
  }

  if (tone === "watch") {
    return `${base} border-[#fde68a] bg-[#fef3c7]`;
  }

  if (tone === "risk") {
    return `${base} border-[#fed7aa] bg-[#fff7ed]`;
  }

  return `${base} border-[#d7e0f4] bg-[#ffffff]`;
}

function evidenceStatusClassName(status: MetricEvidence["status"] | undefined, isPending: boolean) {
  const base = "w-fit rounded-md px-3 py-1 text-xs font-bold capitalize";

  if (isPending) {
    return `${base} bg-[#fef3c7] text-[#92400e]`;
  }

  if (status === "sufficient") {
    return `${base} bg-[#dcfff0] text-[#157f5b]`;
  }

  if (status === "partial") {
    return `${base} bg-[#fef3c7] text-[#92400e]`;
  }

  if (status === "insufficient") {
    return `${base} bg-[#ffedd5] text-[#b45309]`;
  }

  return `${base} bg-[#eef4ff] text-[#42526e]`;
}

function signalClassName(signal: RankedProductMetricRow["signal"]): string {
  if (signal === "Promote") {
    return "rounded-full bg-[#dcfff0] px-2.5 py-1 text-xs font-bold text-[#157f5b]";
  }

  if (signal === "Hold") {
    return "rounded-full bg-[#ffedd5] px-2.5 py-1 text-xs font-bold text-[#b45309]";
  }

  return "rounded-full bg-[#eef4ff] px-2.5 py-1 text-xs font-bold text-[#42526e]";
}

function recentRunStatusLabel(status: RecentRun["status"]): string {
  if (status === "answered") {
    return "Answered";
  }

  if (status === "unsupported") {
    return "Unsupported";
  }

  if (status === "validation-error") {
    return "Validation issue";
  }

  return "Error";
}

function formatMetricId(metricId: string): string {
  return metricId.replaceAll("_", " ");
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value);
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

function formatMetricValue(metricId: CommerceMetricId, value: number): string {
  if (
    metricId === "product_price" ||
    metricId === "product_revenue" ||
    metricId === "product_gross_profit"
  ) {
    return formatCurrency(value);
  }

  if (metricId === "product_inventory" || metricId === "product_views") {
    return formatInteger(value);
  }

  if (metricId === "product_purchase_count") {
    return formatInteger(value);
  }

  if (metricId === "product_margin_percent") {
    return formatPercent(value / 100);
  }

  if (
    metricId === "product_conversion_rate" ||
    metricId === "product_return_rate" ||
    metricId === "product_add_to_cart_rate"
  ) {
    return formatPercent(value);
  }

  return formatNumber(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

async function readEventStream(
  stream: ReadableStream<Uint8Array>,
  handlers: {
    onTrace: (event: DataQuestionEvent) => void;
    onResult: (result: InsightChatState) => void;
    onError: (errorMessage: string) => void;
  },
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const eventType = chunk
        .split("\n")
        .find((line) => line.startsWith("event: "))
        ?.slice("event: ".length);
      const dataLine = chunk
        .split("\n")
        .find((line) => line.startsWith("data: "))
        ?.slice("data: ".length);

      if (!eventType || !dataLine) {
        continue;
      }

      const parsedData = JSON.parse(dataLine) as unknown;

      if (eventType === "trace") {
        handlers.onTrace(parsedData as DataQuestionEvent);
      }

      if (eventType === "result") {
        handlers.onResult(parsedData as InsightChatState);
      }

      if (eventType === "error") {
        const error = parsedData as { message?: string };
        handlers.onError(error.message ?? "The data-question run failed.");
      }
    }
  }
}

function formatColumnName(column: string) {
  return column.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function rowKey(row: Record<string, string | number | boolean>, index: number) {
  return String(row.id ?? `${row.orderId ?? "row"}-${index}`);
}
