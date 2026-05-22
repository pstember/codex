"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, sessionCookieName } from "@/app/auth/session";
import { loginWithEmail, requirePermission } from "@/domain/auth";
import { getAppDatabase } from "@/persistence/appDatabase";

const routeByRole = {
  manager: "/manager",
  operator: "/operator",
  guest: "/store",
} as const;

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const user = loginWithEmail(getAppDatabase(), email);

  if (!user) {
    redirect("/");
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, user.sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect(routeByRole[user.role]);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(sessionCookieName)?.value;

  if (sessionId) {
    getAppDatabase().deleteSession(sessionId);
  }

  cookieStore.delete(sessionCookieName);
  redirect("/");
}

export async function saveInsightAction() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  requirePermission(user, "ask_deep_metrics");

  return {
    ok: true,
    savedBy: user.email,
  };
}

export async function publishStorefrontAction() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  requirePermission(user, "publish_storefront");

  return {
    ok: true,
    publishedBy: user.email,
  };
}
