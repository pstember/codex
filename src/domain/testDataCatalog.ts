import type { CommerceData } from "@/domain/commerce";
import { buildMetricDashboard, type MetricDashboard } from "@/domain/commerceMetrics";
import type { Product } from "@/domain/product";
import type { StorefrontConfig } from "@/domain/storefront";

export type DataCatalogMetric = {
  label: string;
  value: number;
};

export type DataCatalogTable = {
  id: string;
  title: string;
  description: string;
  columns: string[];
  rows: Array<Record<string, string | number | boolean>>;
};

export type TestDataCatalog = {
  dashboard: MetricDashboard;
  summary: DataCatalogMetric[];
  tables: DataCatalogTable[];
};

export function buildTestDataCatalog(input: {
  commerceData: CommerceData;
  products: Product[];
  storefronts: StorefrontConfig[];
}): TestDataCatalog {
  const orderItems = input.commerceData.orders.flatMap((order) =>
    order.items.map((item) => ({
      orderId: order.id,
      ...item,
    })),
  );
  const storefrontSections = input.storefronts.flatMap((storefront) =>
    storefront.sections.map((section) => ({
      storefrontId: storefront.id,
      campaignId: storefront.campaignId,
      ...section,
    })),
  );

  return {
    dashboard: buildMetricDashboard({
      commerceData: input.commerceData,
      products: input.products,
    }),
    summary: [
      { label: "Products", value: input.products.length },
      { label: "Customers", value: input.commerceData.customers.length },
      { label: "Orders", value: input.commerceData.orders.length },
      { label: "Order items", value: orderItems.length },
      { label: "Stock rows", value: input.commerceData.stockPositions.length },
      { label: "Returns", value: input.commerceData.returns.length },
      { label: "Email events", value: input.commerceData.emailEvents.length },
      { label: "Promotions", value: input.commerceData.promotions.length },
      { label: "Storefronts", value: input.storefronts.length },
    ],
    tables: [
      table(
        "products",
        "Products",
        "Seeded Atlas catalog and merchandising signals.",
        [
          "id",
          "name",
          "category",
          "price",
          "marginPercent",
          "inventory",
          "conversionRate",
          "returnRate",
          "views",
          "addToCartRate",
          "purchaseCount",
          "tags",
        ],
        input.products,
      ),
      table(
        "customers",
        "Customers",
        "Demo customers and segmentation context.",
        [
          "id",
          "name",
          "email",
          "segment",
          "borough",
          "lifetimeValue",
          "ordersCount",
          "defaultAddressId",
        ],
        input.commerceData.customers,
      ),
      table(
        "addresses",
        "Addresses",
        "London delivery addresses for demo customers.",
        ["id", "customerId", "line1", "borough", "postcode", "city", "country"],
        input.commerceData.addresses,
      ),
      table(
        "orders",
        "Orders",
        "Seeded order history for analytics questions.",
        [
          "id",
          "customerId",
          "shippingAddressId",
          "channel",
          "status",
          "currency",
          "orderedAt",
          "subtotal",
          "discountTotal",
          "shippingTotal",
          "grandTotal",
        ],
        input.commerceData.orders,
      ),
      table(
        "order-items",
        "Order items",
        "Line-level product purchases from seeded orders.",
        ["orderId", "id", "productId", "quantity", "unitPrice", "lineTotal"],
        orderItems,
      ),
      table(
        "inventory-locations",
        "Inventory locations",
        "Fulfilment, warehouse, and inbound stock nodes.",
        ["id", "name", "kind", "city"],
        input.commerceData.inventoryLocations,
      ),
      table(
        "stock-positions",
        "Stock positions",
        "Product inventory by location.",
        ["productId", "locationId", "onHand", "reserved", "reorderPoint"],
        input.commerceData.stockPositions,
      ),
      table(
        "returns",
        "Returns",
        "Return records used for promotion risk analysis.",
        ["id", "orderId", "productId", "reason", "status", "requestedAt", "refundAmount"],
        input.commerceData.returns,
      ),
      table(
        "email-events",
        "Email events",
        "Seeded lifecycle and campaign engagement events.",
        ["id", "customerId", "campaignId", "eventType", "occurredAt"],
        input.commerceData.emailEvents,
      ),
      table(
        "promotions",
        "Promotions",
        "Seeded promotion records available for analytics questions.",
        [
          "id",
          "title",
          "segmentIds",
          "productIds",
          "discountPercent",
          "startsAt",
          "endsAt",
          "active",
        ],
        input.commerceData.promotions,
      ),
      table(
        "storefronts",
        "Storefronts",
        "Baseline and generated storefront configurations.",
        [
          "id",
          "campaignId",
          "versionName",
          "theme",
          "accentColor",
          "density",
          "visualAssetId",
          "visualAssetPath",
        ],
        input.storefronts.map((storefront) => ({
          id: storefront.id,
          campaignId: storefront.campaignId,
          versionName: storefront.versionName,
          theme: storefront.style.theme,
          accentColor: storefront.style.accentColor,
          density: storefront.style.density,
          visualAssetId: storefront.visualAsset.id,
          visualAssetPath: storefront.visualAsset.path,
        })),
      ),
      table(
        "storefront-sections",
        "Storefront sections",
        "Composable storefront blocks and product placements.",
        [
          "storefrontId",
          "campaignId",
          "id",
          "type",
          "sectionIntent",
          "title",
          "body",
          "productIds",
        ],
        storefrontSections,
      ),
    ],
  };
}

function table<T extends Record<string, unknown>>(
  id: string,
  title: string,
  description: string,
  columns: string[],
  rows: T[],
): DataCatalogTable {
  return {
    id,
    title,
    description,
    columns,
    rows: rows.map((row) => normalizeRow(row, columns)),
  };
}

function normalizeRow(
  row: Record<string, unknown>,
  columns: string[],
): Record<string, string | number | boolean> {
  return Object.fromEntries(columns.map((column) => [column, normalizeValue(row[column])]));
}

function normalizeValue(value: unknown): string | number | boolean {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value === undefined || value === null) {
    return "";
  }

  return JSON.stringify(value);
}
