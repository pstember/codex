import type { CommerceData } from "@/domain/commerce";
import type { Product } from "@/domain/product";

export type CommerceMetricId =
  | "product_price"
  | "product_margin_percent"
  | "product_inventory"
  | "product_conversion_rate"
  | "product_return_rate"
  | "product_views"
  | "product_add_to_cart_rate"
  | "product_purchase_count"
  | "product_revenue"
  | "product_gross_profit"
  | "product_sell_through_pressure"
  | "product_exposure_gap"
  | "product_promotion_score"
  | "product_risk_score"
  | "product_giftability_score"
  | "order_count"
  | "gross_revenue"
  | "average_order_value"
  | "discount_rate"
  | "channel_mix"
  | "return_count"
  | "return_reason_share"
  | "refund_total"
  | "customer_segment_count"
  | "email_engagement_rate";

export type CommerceMetricDefinition = {
  id: CommerceMetricId;
  label: string;
  description: string;
  entity: "product" | "order" | "return" | "customer" | "campaign";
  format: "currency" | "integer" | "percent" | "score" | "text";
};

export type DashboardKpi = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "good" | "watch" | "risk" | "neutral";
};

export type RankedProductMetricRow = {
  id: string;
  name: string;
  category: string;
  rank: number;
  signal: "Promote" | "Monitor" | "Hold";
  metrics: Partial<Record<CommerceMetricId, number>>;
  reasons: string[];
};

export type ReturnReasonMetric = {
  reason: string;
  count: number;
  share: number;
};

export type ChannelMixMetric = {
  channel: string;
  count: number;
  share: number;
};

export type MetricDashboard = {
  kpis: DashboardKpi[];
  productCategories: string[];
  rankedProducts: RankedProductMetricRow[];
  riskRows: RankedProductMetricRow[];
  signalSummary: Record<RankedProductMetricRow["signal"], number>;
  returnReasons: ReturnReasonMetric[];
  channelMix: ChannelMixMetric[];
  conversionStrip: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
};

export type MetricEvidence = {
  status: "sufficient" | "partial" | "insufficient";
  requestedMetrics: CommerceMetricId[];
  sortBy: CommerceMetricId | null;
  limit: number;
  rows: RankedProductMetricRow[];
  riskRows: RankedProductMetricRow[];
  returnReasons: ReturnReasonMetric[];
  channelMix: ChannelMixMetric[];
  truncated: boolean;
  evidencePack: string;
};

type ProductMetricsInput = {
  commerceData: CommerceData;
  products: Product[];
};

export const commerceMetricCatalog: CommerceMetricDefinition[] = [
  metric("product_price", "Product price", "Current product selling price.", "product", "currency"),
  metric(
    "product_margin_percent",
    "Product margin",
    "Product gross margin percentage.",
    "product",
    "percent",
  ),
  metric(
    "product_inventory",
    "Inventory",
    "Units available across the catalog.",
    "product",
    "integer",
  ),
  metric(
    "product_conversion_rate",
    "Conversion rate",
    "Product purchase conversion rate.",
    "product",
    "percent",
  ),
  metric("product_return_rate", "Return rate", "Product return rate.", "product", "percent"),
  metric("product_views", "Views", "Product detail views.", "product", "integer"),
  metric(
    "product_add_to_cart_rate",
    "Add-to-cart rate",
    "Product add-to-cart rate.",
    "product",
    "percent",
  ),
  metric(
    "product_purchase_count",
    "Purchases",
    "Completed product purchases.",
    "product",
    "integer",
  ),
  metric(
    "product_revenue",
    "Revenue",
    "Product price multiplied by purchases.",
    "product",
    "currency",
  ),
  metric(
    "product_gross_profit",
    "Gross profit",
    "Product revenue multiplied by margin percentage.",
    "product",
    "currency",
  ),
  metric(
    "product_sell_through_pressure",
    "Sell-through pressure",
    "Inventory pressure relative to the largest stock position.",
    "product",
    "score",
  ),
  metric(
    "product_exposure_gap",
    "Exposure gap",
    "Relative gap between current product views and the most-viewed product.",
    "product",
    "score",
  ),
  metric(
    "product_promotion_score",
    "Promotion score",
    "Weighted product score for campaign readiness.",
    "product",
    "score",
  ),
  metric(
    "product_risk_score",
    "Risk score",
    "Promotion risk from margin, stock, returns, and conversion.",
    "product",
    "score",
  ),
  metric(
    "product_giftability_score",
    "Giftability score",
    "Gift fit from price, tags, stock, margin, and return risk.",
    "product",
    "score",
  ),
  metric("order_count", "Order count", "Number of matching orders.", "order", "integer"),
  metric("gross_revenue", "Gross revenue", "Total order grand value.", "order", "currency"),
  metric(
    "average_order_value",
    "Average order value",
    "Gross revenue divided by order count.",
    "order",
    "currency",
  ),
  metric(
    "discount_rate",
    "Discount rate",
    "Discount value as a share of order subtotal.",
    "order",
    "percent",
  ),
  metric("channel_mix", "Channel mix", "Order count by sales channel.", "order", "text"),
  metric("return_count", "Return count", "Number of return records.", "return", "integer"),
  metric(
    "return_reason_share",
    "Return reason share",
    "Return reason count as a share of returns.",
    "return",
    "percent",
  ),
  metric(
    "refund_total",
    "Refund total",
    "Total refund amount across returns.",
    "return",
    "currency",
  ),
  metric(
    "customer_segment_count",
    "Customer segment count",
    "Customer count by segment.",
    "customer",
    "integer",
  ),
  metric(
    "email_engagement_rate",
    "Email engagement rate",
    "Clicked or conversion email events as a share of sent/opened/clicked/conversion events.",
    "campaign",
    "percent",
  ),
];

const commerceMetricIds = new Set(
  commerceMetricCatalog.map((metricDefinition) => metricDefinition.id),
);

export function metricCatalogPrompt(): string {
  return commerceMetricCatalog
    .map((metricDefinition) => `${metricDefinition.id}: ${metricDefinition.description}`)
    .join("\n");
}

export function isCommerceMetricId(value: string): value is CommerceMetricId {
  return commerceMetricIds.has(value as CommerceMetricId);
}

export function buildMetricDashboard(input: ProductMetricsInput): MetricDashboard {
  const rankedProducts = rankProducts(input.products);
  const totalOrders = input.commerceData.orders.length;
  const grossRevenue = sumBy(input.commerceData.orders, (order) => order.grandTotal);
  const totalSubtotal = sumBy(input.commerceData.orders, (order) => order.subtotal);
  const totalDiscount = sumBy(input.commerceData.orders, (order) => order.discountTotal);
  const totalEmailEvents = input.commerceData.emailEvents.filter((event) =>
    ["sent", "opened", "clicked", "conversion"].includes(event.eventType),
  ).length;
  const engagedEmailEvents = input.commerceData.emailEvents.filter((event) =>
    ["clicked", "conversion"].includes(event.eventType),
  ).length;

  return {
    kpis: [
      kpi(
        "gross_revenue",
        "Gross revenue",
        formatCurrency(grossRevenue),
        `${totalOrders} orders`,
        "good",
      ),
      kpi(
        "average_order_value",
        "Average order value",
        formatCurrency(totalOrders > 0 ? grossRevenue / totalOrders : 0),
        "Across seeded orders",
        "neutral",
      ),
      kpi(
        "product_count",
        "Products",
        formatInteger(input.products.length),
        "Catalog SKUs",
        "neutral",
      ),
      kpi(
        "average_margin",
        "Average margin",
        formatPercent(average(input.products, (product) => product.marginPercent) / 100),
        "Simple product average",
        "good",
      ),
      kpi(
        "total_inventory",
        "Total inventory",
        formatInteger(sumBy(input.products, (product) => product.inventory)),
        "Catalog units",
        "neutral",
      ),
      kpi(
        "return_rate",
        "Return rate",
        formatPercent(input.commerceData.returns.length / Math.max(totalOrders, 1)),
        "Returns / orders",
        "watch",
      ),
      kpi(
        "email_engagement_rate",
        "Email engagement",
        formatPercent(engagedEmailEvents / Math.max(totalEmailEvents, 1)),
        "Clicked or converted",
        "good",
      ),
      kpi(
        "active_promotions",
        "Active promotions",
        formatInteger(input.commerceData.promotions.filter((promotion) => promotion.active).length),
        `Discount rate ${formatPercent(totalDiscount / Math.max(totalSubtotal, 1))}`,
        "watch",
      ),
    ],
    productCategories: [...new Set(input.products.map((product) => product.category))].sort(),
    rankedProducts,
    riskRows: rankedProducts.filter((row) => row.signal === "Hold"),
    signalSummary: summarizeSignals(rankedProducts),
    returnReasons: groupReturnReasons(input.commerceData),
    channelMix: groupChannelMix(input.commerceData),
    conversionStrip: [
      {
        label: "Views",
        value: formatInteger(sumBy(input.products, (product) => product.views)),
        detail: "Product detail visits",
      },
      {
        label: "Adds",
        value: formatInteger(
          Math.round(sumBy(input.products, (product) => product.views * product.addToCartRate)),
        ),
        detail: "Estimated add-to-carts",
      },
      {
        label: "Purchases",
        value: formatInteger(sumBy(input.products, (product) => product.purchaseCount)),
        detail: "Seeded product purchases",
      },
    ],
  };
}

function summarizeSignals(
  rows: RankedProductMetricRow[],
): Record<RankedProductMetricRow["signal"], number> {
  const summary: Record<RankedProductMetricRow["signal"], number> = {
    Hold: 0,
    Monitor: 0,
    Promote: 0,
  };

  for (const row of rows) {
    summary[row.signal] += 1;
  }

  return summary;
}

export function calculateMetricEvidence(input: {
  commerceData: CommerceData;
  products: Product[];
  requestedMetrics?: string[];
  sortBy?: string | null;
  limit?: number | null;
}): MetricEvidence {
  const requestedMetrics = normalizeMetricIds(input.requestedMetrics);
  const sortBy =
    input.sortBy && isCommerceMetricId(input.sortBy)
      ? input.sortBy
      : defaultSortMetric(requestedMetrics);
  const invalidSort = input.sortBy && !isCommerceMetricId(input.sortBy) ? [input.sortBy] : [];

  if (invalidSort.length > 0) {
    throw new Error(`Unsupported metric ids: ${invalidSort.join(", ")}`);
  }

  const dashboard = buildMetricDashboard(input);
  const rowLimit = Math.max(1, Math.min(input.limit ?? 5, 10));
  const sortedRows = sortMetricRows(dashboard.rankedProducts, sortBy);
  const rows = sortedRows.slice(0, rowLimit);
  const truncated = sortedRows.length > rows.length;
  const status = rows.length > 0 ? "sufficient" : "insufficient";

  return {
    status,
    requestedMetrics,
    sortBy,
    limit: rowLimit,
    rows,
    riskRows: dashboard.riskRows.slice(0, 5),
    returnReasons: dashboard.returnReasons,
    channelMix: dashboard.channelMix,
    truncated,
    evidencePack: buildPromotionEvidencePack({
      requestedMetrics,
      riskRows: dashboard.riskRows.slice(0, 5),
      rows,
      totalRows: sortedRows.length,
      truncated,
    }),
  };
}

function metric(
  id: CommerceMetricId,
  label: string,
  description: string,
  entity: CommerceMetricDefinition["entity"],
  format: CommerceMetricDefinition["format"],
): CommerceMetricDefinition {
  return { id, label, description, entity, format };
}

function kpi(
  id: string,
  label: string,
  value: string,
  detail: string,
  tone: DashboardKpi["tone"],
): DashboardKpi {
  return { id, label, value, detail, tone };
}

function normalizeMetricIds(metricIds: string[] | undefined): CommerceMetricId[] {
  if (!metricIds?.length) {
    return ["product_promotion_score"];
  }

  const invalidMetricIds = metricIds.filter((metricId) => !isCommerceMetricId(metricId));

  if (invalidMetricIds.length > 0) {
    throw new Error(`Unsupported metric ids: ${invalidMetricIds.join(", ")}`);
  }

  return [...new Set(metricIds)] as CommerceMetricId[];
}

function rankProducts(products: Product[]): RankedProductMetricRow[] {
  const maxInventory = Math.max(...products.map((product) => product.inventory), 1);
  const maxViews = Math.max(...products.map((product) => product.views), 1);

  return products
    .map((product) => productMetricRow(product, maxInventory, maxViews))
    .sort(
      (left, right) =>
        (right.metrics.product_promotion_score ?? 0) - (left.metrics.product_promotion_score ?? 0),
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function productMetricRow(
  product: Product,
  maxInventory: number,
  maxViews: number,
): RankedProductMetricRow {
  const revenue = product.price * product.purchaseCount;
  const grossProfit = revenue * (product.marginPercent / 100);
  const sellThroughPressure = product.inventory / maxInventory;
  const exposureGap = 1 - product.views / maxViews;
  const promotionScore =
    product.marginPercent * 0.32 +
    product.conversionRate * 240 +
    product.addToCartRate * 110 +
    sellThroughPressure * 18 +
    exposureGap * 12 -
    product.returnRate * 180;
  const riskScore =
    (product.marginPercent < 40 ? 35 : 0) +
    (product.inventory < 100 ? 30 : 0) +
    (product.returnRate > 0.055 ? 25 : 0) +
    (product.conversionRate < 0.075 ? 10 : 0);
  const giftabilityScore =
    (product.price <= 50 ? 25 : product.price <= 100 ? 12 : 2) +
    (product.tags.includes("giftable") || product.tags.includes("secret-santa") ? 25 : 0) +
    Math.min(20, product.inventory / 40) +
    product.marginPercent * 0.25 -
    product.returnRate * 120;
  const signal: RankedProductMetricRow["signal"] =
    riskScore >= 35 ? "Hold" : promotionScore >= 65 ? "Promote" : "Monitor";

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    rank: 0,
    signal,
    metrics: {
      product_price: product.price,
      product_margin_percent: product.marginPercent,
      product_inventory: product.inventory,
      product_conversion_rate: product.conversionRate,
      product_return_rate: product.returnRate,
      product_views: product.views,
      product_add_to_cart_rate: product.addToCartRate,
      product_purchase_count: product.purchaseCount,
      product_revenue: revenue,
      product_gross_profit: grossProfit,
      product_sell_through_pressure: sellThroughPressure,
      product_exposure_gap: exposureGap,
      product_promotion_score: promotionScore,
      product_risk_score: riskScore,
      product_giftability_score: giftabilityScore,
    },
    reasons: [
      `${formatPercent(product.marginPercent / 100)} margin`,
      `${formatInteger(product.inventory)} units`,
      `${formatPercent(product.conversionRate)} conversion`,
      `${formatPercent(product.returnRate)} returns`,
    ],
  };
}

function defaultSortMetric(metricIds: CommerceMetricId[]): CommerceMetricId {
  return metricIds.includes("product_promotion_score") ? "product_promotion_score" : metricIds[0];
}

function sortMetricRows(
  rows: RankedProductMetricRow[],
  sortBy: CommerceMetricId,
): RankedProductMetricRow[] {
  return [...rows].sort(
    (left, right) => (right.metrics[sortBy] ?? 0) - (left.metrics[sortBy] ?? 0),
  );
}

function buildPromotionEvidencePack(input: {
  requestedMetrics: CommerceMetricId[];
  rows: RankedProductMetricRow[];
  riskRows: RankedProductMetricRow[];
  totalRows: number;
  truncated: boolean;
}): string {
  return [
    "Promotion candidate summary",
    `requested metrics: ${input.requestedMetrics.join(", ")}`,
    `products analysed: ${input.totalRows}`,
    "ranking rule: backend promotion score from margin, inventory, conversion, add-to-cart, exposure gap, and return risk",
    `top candidates: ${input.rows.map(formatEvidenceRow).join("; ") || "none"}`,
    `risk exclusions: ${input.riskRows.map(formatRiskRow).join("; ") || "none"}`,
    input.truncated
      ? `rows truncated: showing ${input.rows.length} of ${input.totalRows}`
      : "rows truncated: no",
  ].join("\n");
}

function formatEvidenceRow(row: RankedProductMetricRow): string {
  return `${row.rank}. ${row.name} | score: ${formatScore(row.metrics.product_promotion_score)} | margin: ${formatPercent((row.metrics.product_margin_percent ?? 0) / 100)} | stock: ${formatInteger(row.metrics.product_inventory ?? 0)} | conversion: ${formatPercent(row.metrics.product_conversion_rate ?? 0)} | return: ${formatPercent(row.metrics.product_return_rate ?? 0)}`;
}

function formatRiskRow(row: RankedProductMetricRow): string {
  return `${row.name} | risk score: ${formatScore(row.metrics.product_risk_score)} | margin: ${formatPercent((row.metrics.product_margin_percent ?? 0) / 100)} | stock: ${formatInteger(row.metrics.product_inventory ?? 0)} | return: ${formatPercent(row.metrics.product_return_rate ?? 0)}`;
}

function groupReturnReasons(commerceData: CommerceData): ReturnReasonMetric[] {
  const totalReturns = commerceData.returns.length;
  const counts = new Map<string, number>();

  for (const commerceReturn of commerceData.returns) {
    counts.set(commerceReturn.reason, (counts.get(commerceReturn.reason) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([reason, count]) => ({
      reason,
      count,
      share: count / Math.max(totalReturns, 1),
    }))
    .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason));
}

function groupChannelMix(commerceData: CommerceData): ChannelMixMetric[] {
  const totalOrders = commerceData.orders.length;
  const counts = new Map<string, number>();

  for (const order of commerceData.orders) {
    counts.set(order.channel, (counts.get(order.channel) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([channel, count]) => ({
      channel,
      count,
      share: count / Math.max(totalOrders, 1),
    }))
    .sort((left, right) => right.count - left.count || left.channel.localeCompare(right.channel));
}

function average<T>(items: T[], readValue: (item: T) => number): number {
  return items.length > 0 ? sumBy(items, readValue) / items.length : 0;
}

function sumBy<T>(items: T[], readValue: (item: T) => number): number {
  return items.reduce((total, item) => total + readValue(item), 0);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    currency: "GBP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function formatScore(value: number | undefined): string {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value ?? 0);
}
