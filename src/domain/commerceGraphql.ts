import { buildSchema, graphql, parse, validate } from "graphql";
import type {
  CommerceCustomer,
  CommerceData,
  CommerceOrder,
  CommerceReturn,
  EmailEvent,
  Promotion,
  StockPosition,
} from "@/domain/commerce";
import type { GeneratedQuery } from "@/domain/insight";
import type { Product } from "@/domain/product";

const commerceSchema = buildSchema(`
  type Product {
    id: ID!
    name: String!
    category: String!
    price: Float!
    marginPercent: Float!
    inventory: Int!
    conversionRate: Float!
    returnRate: Float!
    views: Int!
    addToCartRate: Float!
    purchaseCount: Int!
    tags: [String!]!
  }

  type Customer {
    id: ID!
    email: String!
    name: String!
    segment: String!
    borough: String!
    defaultAddressId: ID!
    lifetimeValue: Float!
    ordersCount: Int!
  }

  type OrderItem {
    id: ID!
    productId: ID!
    quantity: Int!
    unitPrice: Float!
    lineTotal: Float!
  }

  type Order {
    id: ID!
    customerId: ID!
    shippingAddressId: ID!
    channel: String!
    status: String!
    currency: String!
    orderedAt: String!
    subtotal: Float!
    discountTotal: Float!
    shippingTotal: Float!
    grandTotal: Float!
    items: [OrderItem!]!
  }

  type Promotion {
    id: ID!
    title: String!
    segmentIds: [String!]!
    productIds: [ID!]!
    discountPercent: Float!
    startsAt: String!
    endsAt: String!
    active: Boolean!
  }

  type Return {
    id: ID!
    orderId: ID!
    productId: ID!
    reason: String!
    status: String!
    requestedAt: String!
    refundAmount: Float!
  }

  type EmailEvent {
    id: ID!
    customerId: ID!
    campaignId: ID!
    eventType: String!
    occurredAt: String!
  }

  type StockPosition {
    productId: ID!
    locationId: ID!
    onHand: Int!
    reserved: Int!
    reorderPoint: Int!
  }

  input ProductFilter {
    tags: [String!]
    maxPrice: Float
  }

  input CustomerFilter {
    segment: String
    borough: String
  }

  input OrderFilter {
    channel: String
    minTotal: Float
    customerId: ID
    orderedFrom: String
    orderedTo: String
  }

  input PromotionFilter {
    segment: String
    productId: ID
    active: Boolean
  }

  input ReturnFilter {
    productId: ID
    reason: String
    status: String
    requestedFrom: String
    requestedTo: String
  }

  input EmailEventFilter {
    customerId: ID
    campaignId: ID
    eventType: String
  }

  input StockPositionFilter {
    productId: ID
    locationId: ID
  }

  type Query {
    products(filter: ProductFilter): [Product!]!
    customers(filter: CustomerFilter): [Customer!]!
    orders(filter: OrderFilter): [Order!]!
    promotions(filter: PromotionFilter): [Promotion!]!
    returns(filter: ReturnFilter): [Return!]!
    emailEvents(filter: EmailEventFilter): [EmailEvent!]!
    stockPositions(filter: StockPositionFilter): [StockPosition!]!
  }
`);

export type QueryValidationResult =
  | {
      status: "valid";
    }
  | {
      status: "invalid";
      errors: string[];
    };

export function validateCommerceQuery(generatedQuery: GeneratedQuery): QueryValidationResult {
  try {
    const document = parse(generatedQuery.query);
    const errors = validate(commerceSchema, document);

    if (errors.length > 0) {
      return {
        status: "invalid",
        errors: errors.map((error) => error.message),
      };
    }

    return { status: "valid" };
  } catch (error) {
    return {
      status: "invalid",
      errors: [error instanceof Error ? error.message : "Unknown GraphQL validation error."],
    };
  }
}

export async function executeCommerceQuery(input: {
  generatedQuery: GeneratedQuery;
  products: Product[];
  commerceData?: CommerceData;
}): Promise<CommerceQueryExecutionResult> {
  const validation = validateCommerceQuery(input.generatedQuery);

  if (validation.status === "invalid") {
    return commerceResult([], {});
  }

  const result = await graphql({
    schema: commerceSchema,
    source: input.generatedQuery.query,
    rootValue: {
      products: ({ filter }: { filter?: { maxPrice?: number; tags?: string[] } }) =>
        filterProducts(input.products, filter),
      customers: ({ filter }: { filter?: CustomerFilter }) =>
        filterCustomers(input.commerceData?.customers ?? [], filter),
      orders: ({ filter }: { filter?: OrderFilter }) =>
        filterOrders(input.commerceData?.orders ?? [], filter),
      promotions: ({ filter }: { filter?: PromotionFilter }) =>
        filterPromotions(input.commerceData?.promotions ?? [], filter),
      returns: ({ filter }: { filter?: ReturnFilter }) =>
        filterReturns(input.commerceData?.returns ?? [], filter),
      emailEvents: ({ filter }: { filter?: EmailEventFilter }) =>
        filterEmailEvents(input.commerceData?.emailEvents ?? [], filter),
      stockPositions: ({ filter }: { filter?: StockPositionFilter }) =>
        filterStockPositions(input.commerceData?.stockPositions ?? [], filter),
    },
  });

  if (result.errors?.length) {
    return commerceResult([], {});
  }

  const data = (result.data ?? {}) as CommerceQueryData;
  const resultProductIds = productIdsFromQueryData(data);
  const recommendedProducts = input.products.filter((product) => resultProductIds.has(product.id));

  return commerceResult(recommendedProducts, data);
}

function filterProducts(products: Product[], filter?: { maxPrice?: number; tags?: string[] }) {
  if (!filter) {
    return products;
  }

  return products
    .filter((product) => filter.maxPrice === undefined || product.price <= filter.maxPrice)
    .filter(
      (product) => !filter.tags?.length || filter.tags.every((tag) => product.tags.includes(tag)),
    );
}

export type CommerceQueryData = {
  products: Array<Partial<Product> & { id?: string | null }>;
  customers: Array<Partial<CommerceCustomer>>;
  orders: Array<
    Partial<CommerceOrder> & {
      items?: Array<Partial<CommerceOrder["items"][number]> & { productId?: string | null }>;
    }
  >;
  promotions: Array<Partial<Promotion> & { productIds?: string[] | null }>;
  returns: Array<Partial<CommerceReturn> & { productId?: string | null }>;
  emailEvents: Array<Partial<EmailEvent>>;
  stockPositions: Array<Partial<StockPosition> & { productId?: string | null }>;
  [key: string]: unknown;
};

export type CommerceQueryExecutionResult = Product[] & {
  data: CommerceQueryData;
  recommendedProductIds: string[];
};

type CustomerFilter = {
  segment?: string;
  borough?: string;
};

type OrderFilter = {
  channel?: CommerceOrder["channel"];
  orderedFrom?: string;
  orderedTo?: string;
  minTotal?: number;
  customerId?: string;
};

type PromotionFilter = {
  segment?: string;
  productId?: string;
  active?: boolean;
};

type ReturnFilter = {
  productId?: string;
  reason?: CommerceReturn["reason"];
  requestedFrom?: string;
  requestedTo?: string;
  status?: CommerceReturn["status"];
};

type EmailEventFilter = {
  customerId?: string;
  campaignId?: string;
  eventType?: EmailEvent["eventType"];
};

type StockPositionFilter = {
  productId?: string;
  locationId?: string;
};

function filterCustomers(
  customers: CommerceCustomer[],
  filter?: CustomerFilter,
): CommerceCustomer[] {
  if (!filter) {
    return customers;
  }

  return customers
    .filter((customer) => filter.segment === undefined || customer.segment === filter.segment)
    .filter((customer) => filter.borough === undefined || customer.borough === filter.borough);
}

function filterOrders(orders: CommerceOrder[], filter?: OrderFilter): CommerceOrder[] {
  if (!filter) {
    return orders;
  }

  return orders
    .filter((order) => filter.channel === undefined || order.channel === filter.channel)
    .filter(
      (order) =>
        filter.orderedFrom === undefined || order.orderedAt >= startOfUtcDay(filter.orderedFrom),
    )
    .filter(
      (order) => filter.orderedTo === undefined || order.orderedAt <= endOfUtcDay(filter.orderedTo),
    )
    .filter((order) => filter.minTotal === undefined || order.grandTotal >= filter.minTotal)
    .filter((order) => filter.customerId === undefined || order.customerId === filter.customerId);
}

function filterPromotions(promotions: Promotion[], filter?: PromotionFilter): Promotion[] {
  if (!filter) {
    return promotions;
  }

  return promotions
    .filter(
      (promotion) => filter.segment === undefined || promotion.segmentIds.includes(filter.segment),
    )
    .filter(
      (promotion) =>
        filter.productId === undefined || promotion.productIds.includes(filter.productId),
    )
    .filter((promotion) => filter.active === undefined || promotion.active === filter.active);
}

function filterReturns(commerceReturns: CommerceReturn[], filter?: ReturnFilter): CommerceReturn[] {
  if (!filter) {
    return commerceReturns;
  }

  return commerceReturns
    .filter(
      (commerceReturn) =>
        filter.productId === undefined || commerceReturn.productId === filter.productId,
    )
    .filter(
      (commerceReturn) => filter.reason === undefined || commerceReturn.reason === filter.reason,
    )
    .filter(
      (commerceReturn) =>
        filter.requestedFrom === undefined ||
        commerceReturn.requestedAt >= startOfUtcDay(filter.requestedFrom),
    )
    .filter(
      (commerceReturn) =>
        filter.requestedTo === undefined ||
        commerceReturn.requestedAt <= endOfUtcDay(filter.requestedTo),
    )
    .filter(
      (commerceReturn) => filter.status === undefined || commerceReturn.status === filter.status,
    );
}

function startOfUtcDay(date: string): string {
  return date.includes("T") ? date : `${date}T00:00:00.000Z`;
}

function endOfUtcDay(date: string): string {
  return date.includes("T") ? date : `${date}T23:59:59.999Z`;
}

function filterEmailEvents(emailEvents: EmailEvent[], filter?: EmailEventFilter): EmailEvent[] {
  if (!filter) {
    return emailEvents;
  }

  return emailEvents
    .filter((event) => filter.customerId === undefined || event.customerId === filter.customerId)
    .filter((event) => filter.campaignId === undefined || event.campaignId === filter.campaignId)
    .filter((event) => filter.eventType === undefined || event.eventType === filter.eventType);
}

function filterStockPositions(
  stockPositions: StockPosition[],
  filter?: StockPositionFilter,
): StockPosition[] {
  if (!filter) {
    return stockPositions;
  }

  return stockPositions
    .filter((position) => filter.productId === undefined || position.productId === filter.productId)
    .filter(
      (position) => filter.locationId === undefined || position.locationId === filter.locationId,
    );
}

function productIdsFromQueryData(data: CommerceQueryData): Set<string> {
  const productIds = new Set<string>();

  for (const product of data.products ?? []) {
    if (product.id) {
      productIds.add(product.id);
    }
  }

  for (const order of data.orders ?? []) {
    for (const item of order.items ?? []) {
      if (item.productId) {
        productIds.add(item.productId);
      }
    }
  }

  for (const promotion of data.promotions ?? []) {
    for (const productId of promotion.productIds ?? []) {
      productIds.add(productId);
    }
  }

  for (const commerceReturn of data.returns ?? []) {
    if (commerceReturn.productId) {
      productIds.add(commerceReturn.productId);
    }
  }

  for (const stockPosition of data.stockPositions ?? []) {
    if (stockPosition.productId) {
      productIds.add(stockPosition.productId);
    }
  }

  return productIds;
}

function commerceResult(
  products: Product[],
  data: Partial<CommerceQueryData>,
): CommerceQueryExecutionResult {
  const recommendedProductIds = products.map((product) => product.id);
  const resultProducts = [...products] as CommerceQueryExecutionResult;

  resultProducts.data = {
    ...data,
    products: data.products ?? [],
    customers: data.customers ?? [],
    orders: data.orders ?? [],
    promotions: data.promotions ?? [],
    returns: data.returns ?? [],
    emailEvents: data.emailEvents ?? [],
    stockPositions: data.stockPositions ?? [],
  };
  resultProducts.recommendedProductIds = recommendedProductIds;

  return resultProducts;
}
