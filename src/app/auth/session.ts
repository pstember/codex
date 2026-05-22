import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requirePermission } from "@/domain/auth";
import type { Permission } from "@/domain/roles";
import type { AuthenticatedUser } from "@/domain/users";
import { getAppDatabase } from "@/persistence/appDatabase";

export const sessionCookieName = "commerce_copilot_session";

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(sessionCookieName)?.value;

  if (!sessionId) {
    return null;
  }

  return getAppDatabase().findUserBySession(sessionId, new Date());
}

export async function requireCurrentUser(permission: Permission): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  requirePermission(user, permission);

  return user;
}
