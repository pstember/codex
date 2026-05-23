"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireCurrentUser, sessionCookieName } from "@/app/auth/session";
import { loginWithPassword } from "@/domain/auth";
import { getAppDatabase } from "@/persistence/appDatabase";

const routeByRole = {
  manager: "/manager",
  operator: "/operator",
  guest: "/",
} as const;

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = loginWithPassword(getAppDatabase(), email, password);

  if (!user) {
    redirect("/admin?error=invalid");
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
  const user = await requireCurrentUser("ask_deep_metrics");

  return {
    ok: true,
    savedBy: user.email,
  };
}

export async function publishStorefrontAction() {
  const user = await requireCurrentUser("publish_storefront");

  return {
    ok: true,
    publishedBy: user.email,
  };
}
