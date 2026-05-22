import { z } from "zod";
import { roles } from "@/domain/roles";

export const userSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  name: z.string().min(1),
  role: z.enum(roles),
});

export type User = z.infer<typeof userSchema>;

export const sessionSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  expiresAt: z.date(),
});

export type Session = z.infer<typeof sessionSchema>;

export interface AuthenticatedUser extends User {
  sessionId: string;
}
