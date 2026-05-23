"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/app/auth/session";
import { requirePermission } from "@/domain/auth";
import { appendCodexRunEvent, createCodexRun } from "@/domain/codexRun";
import {
  answerAndSaveMetricsQuestion,
  approvedMetricsQuestions,
  canRunMetricsQuestion,
  isApprovedMetricsQuestion,
} from "@/domain/metricsCopilot";
import { commerceData } from "@/fixtures/commerce";
import { products } from "@/fixtures/products";
import { getCodexHarness } from "@/harness/codexHarness";
import { getAppDatabase } from "@/persistence/appDatabase";

export async function runMetricsQuestionAction(formData: FormData) {
  const user = await requireCurrentUser("ask_deep_metrics");

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
  const database = getAppDatabase();
  const createdAt = new Date();

  database.saveCodexRun(
    createCodexRun({
      id: traceId,
      question,
      createdByUserId: user.id,
      createdAt,
    }),
  );
  database.saveCodexRunEvent(
    appendCodexRunEvent(traceId, "starting", "Prompt prepared for Codex analytics run."),
  );
  database.saveCodexRunEvent(
    appendCodexRunEvent(traceId, "schema-sent", "Fixed commerce GraphQL schema attached."),
  );
  database.saveCodexRunEvent(
    appendCodexRunEvent(traceId, "codex-running", "Codex generating GraphQL and insight JSON."),
  );

  const answer = await answerAndSaveMetricsQuestion({
    id: traceId,
    question,
    harness: codexHarness,
    products,
    commerceData,
    createdByUserId: user.id,
    createdAt,
    traceStore: database,
  });

  database.saveCodexRunEvent(
    appendCodexRunEvent(
      traceId,
      answer.trace.validation.status === "valid" ? "validating" : "failed",
      answer.trace.validation.status === "valid"
        ? "Generated GraphQL passed server validation."
        : "Generated GraphQL failed server validation.",
      new Date(),
      answer.trace.validation.status === "invalid"
        ? { errors: answer.trace.validation.errors }
        : {},
    ),
  );
  database.saveCodexRunEvent(
    appendCodexRunEvent(
      traceId,
      "executing-query",
      `Commerce query returned ${answer.recommendedProducts.length} recommended products.`,
    ),
  );
  database.saveCodexRunEvent(
    appendCodexRunEvent(
      traceId,
      "complete",
      "Metrics trace saved for Manager review.",
      new Date(),
      {
        traceId,
      },
    ),
  );

  revalidatePath("/manager");
  redirect(`/manager?run=${traceId}`);
}
