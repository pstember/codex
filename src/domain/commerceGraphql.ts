import { buildSchema, parse, validate } from "graphql";
import type { GeneratedQuery } from "@/domain/insight";

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
