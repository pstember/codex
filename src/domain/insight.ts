import { z } from "zod";

export const generatedQuerySchema = z.object({
  question: z.string().min(1),
  operationName: z.string().min(1),
  query: z.string().min(1),
  rationale: z.string().min(1),
  recommendedChart: z.enum(["kpiCards", "line", "bar", "funnel", "productTable"]),
});

export const insightSummarySchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  recommendedProductIds: z.array(z.string()),
  risks: z.array(z.string()),
});

export type GeneratedQuery = z.infer<typeof generatedQuerySchema>;
export type InsightSummary = z.infer<typeof insightSummarySchema>;
