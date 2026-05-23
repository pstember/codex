import { buildSchema, graphql, parse, validate } from "graphql";
import type { CommerceCustomer, CommerceData, CommerceOrder, Promotion } from "@/domain/commerce";
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
  }

  input PromotionFilter {
    segment: String
    productId: ID
    active: Boolean
  }

  type Query {
    products(filter: ProductFilter): [Product!]!
    customers(filter: CustomerFilter): [Customer!]!
    orders(filter: OrderFilter): [Order!]!
    promotions(filter: PromotionFilter): [Promotion!]!
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
  minTotal?: number;
  customerId?: string;
};

type PromotionFilter = {
  segment?: string;
  productId?: string;
  active?: boolean;
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
  };
  resultProducts.recommendedProductIds = recommendedProductIds;

  return resultProducts;
}
