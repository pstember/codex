import { z } from "zod";

export const campaignSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  season: z.enum(["fathers-day", "secret-santa"]),
  summary: z.string().min(1),
  audience: z.string().min(1),
  productIds: z.array(z.string()).min(1),
  expectedImpact: z.string().min(1),
  storefrontAngle: z.string().min(1),
});

export type Campaign = z.infer<typeof campaignSchema>;
