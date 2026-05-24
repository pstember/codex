import { z } from "zod";
import { storefrontConfigSchema } from "@/domain/storefront";

export const generatedStorefrontConfigSchema = z.object({
  id: z.string().min(1),
  sourceDraftKey: z.string().min(1),
  config: storefrontConfigSchema,
  validationStatus: z.enum(["draft", "ready", "invalid"]),
  validationErrors: z.array(z.string()),
  createdByUserId: z.string().min(1),
  createdAt: z.date(),
});

export type GeneratedStorefrontConfig = z.infer<typeof generatedStorefrontConfigSchema>;

export interface StorefrontConfigStore {
  saveStorefrontConfig(storefrontConfig: GeneratedStorefrontConfig): void;
}
