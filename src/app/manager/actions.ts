"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/auth/session";
import { requirePermission } from "@/domain/auth";
import {
  answerAndSaveMetricsQuestion,
  approvedMetricsQuestions,
  canRunMetricsQuestion,
  isApprovedMetricsQuestion,
} from "@/domain/metricsCopilot";
import { products } from "@/fixtures/products";
import { getCodexHarness } from "@/harness/codexHarness";
import { getAppDatabase } from "@/persistence/appDatabase";

export async function runMetricsQuestionAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  requirePermission(user, "ask_deep_metrics");

  const codexHarness = getCodexHarness();
  const selectedQuestion = String(formData.get("question") ?? approvedMetricsQuestions[0]).trim();
  const customQuestion = String(formData.get("customQuestion") ?? "").trim();
  const question = customQuestion || selectedQuestion;

  if (!canRunMetricsQuestion(question, codexHarness.mode)) {
    throw new Error("Custom Metrics questions require CODEX_HARNESS_MODE=app-server.");
  }

  if (!customQuestion && !isApprovedMetricsQuestion(question)) {
    throw new Error("Metrics question is not approved for this demo.");
  }

  const traceId = randomUUID();

  await answerAndSaveMetricsQuestion({
    id: traceId,
    question,
    harness: codexHarness,
    products,
    createdByUserId: user.id,
    createdAt: new Date(),
    traceStore: getAppDatabase(),
  });

  revalidatePath("/manager");
  redirect(`/manager?run=${traceId}`);
}
