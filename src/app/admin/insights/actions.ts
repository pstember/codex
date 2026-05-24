"use server";

import type { MetricEvidence } from "@/domain/commerceMetrics";
import { askDataQuestion } from "@/domain/dataQuestion";
import { commerceData } from "@/fixtures/commerce";
import { products } from "@/fixtures/products";
import { runCodexAppServerJsonPrompt } from "@/harness/codexAppServerClient";

export type TestChatState = {
  caveats?: string[];
  evidence?: string[];
  error?: string;
  evidencePack?: string;
  generatedGraphql?: string;
  followUpQuestions?: string[];
  message?: string;
  metricEvidence?: MetricEvidence;
  rawAnswerRequestPayload?: string;
  rawAnswerPrompt?: string;
  rawAnswerResponse?: string;
  rawCodexResponse?: string;
  rawQueryRequestPayload?: string;
  rawQueryPrompt?: string;
  rawQueryResponse?: string;
  rawPrompt?: string;
  reply?: string;
  status?: "answered" | "unsupported" | "validation-error";
  validationErrors?: string[];
};

export async function sendTestChatMessageAction(
  _previousState: TestChatState,
  formData: FormData,
): Promise<TestChatState> {
  const message = String(formData.get("message") ?? "");

  try {
    return await askDataQuestion({
      message,
      commerceData,
      products,
      runJsonPrompt: runCodexAppServerJsonPrompt,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Codex could not answer this message.",
      message: message.trim(),
    };
  }
}
