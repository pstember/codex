import { buildSchema, graphql, parse, validate } from "graphql";
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

  input ProductFilter {
    tags: [String!]
    maxPrice: Float
  }

  type Query {
    products(filter: ProductFilter): [Product!]!
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
}): Promise<Product[]> {
  const validation = validateCommerceQuery(input.generatedQuery);

  if (validation.status === "invalid") {
    return [];
  }

  const result = await graphql({
    schema: commerceSchema,
    source: input.generatedQuery.query,
    rootValue: {
      products: ({ filter }: { filter?: { maxPrice?: number; tags?: string[] } }) =>
        filterProducts(input.products, filter),
    },
  });

  if (result.errors?.length) {
    return [];
  }

  const data = result.data as { products?: Array<{ id?: string }> } | undefined;
  const resultProductIds = new Set(data?.products?.map((product) => product.id).filter(Boolean));

  return input.products.filter((product) => resultProductIds.has(product.id));
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
