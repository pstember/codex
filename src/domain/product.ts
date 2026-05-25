import { z } from "zod";

export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  image: z.object({
    path: z.string().regex(/^\/static-assets\/products\/[a-z0-9-]+\.jpg$/),
    alt: z.string().min(1),
  }),
  price: z.number().positive(),
  marginPercent: z.number().min(0).max(100),
  inventory: z.number().int().min(0),
  conversionRate: z.number().min(0).max(1),
  returnRate: z.number().min(0).max(1),
  views: z.number().int().min(0),
  addToCartRate: z.number().min(0).max(1),
  purchaseCount: z.number().int().min(0),
  tags: z.array(z.string()),
});

export type Product = z.infer<typeof productSchema>;

export function findProductsOverPriceLimit(
  productIds: string[],
  products: Product[],
  priceLimit: number,
): Product[] {
  const productsById = new Map(products.map((product) => [product.id, product]));

  return productIds
    .map((productId) => productsById.get(productId))
    .filter((product): product is Product => product !== undefined)
    .filter((product) => product.price > priceLimit);
}
