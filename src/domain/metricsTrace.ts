import { z } from "zod";

export const metricsTraceSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  operationName: z.string().min(1),
  validationStatus: z.enum(["valid", "invalid"]),
  chartType: z.enum(["kpiCards", "line", "bar", "funnel", "productTable"]),
  recommendedProductIds: z.array(z.string().min(1)),
  createdByUserId: z.string().min(1),
  createdAt: z.date(),
});

export type MetricsTrace = z.infer<typeof metricsTraceSchema>;
