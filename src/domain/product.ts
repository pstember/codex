import { z } from "zod";

export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
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
