import { randomUUID } from "node:crypto";

export type CodexRun = {
  id: string;
  question: string;
  createdByUserId: string;
  createdAt: Date;
};

export type CodexRunEvent = {
  runId: string;
  stage: string;
  message: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
};

export type CodexRunSummary = {
  id: string;
  question: string;
  status: string;
  latestMessage: string | null;
  traceId: string | null;
};

export function createCodexRun(input: {
  id?: string;
  question: string;
  createdByUserId: string;
  createdAt?: Date;
}): CodexRun {
  return {
    id: input.id ?? randomUUID(),
    question: input.question,
    createdByUserId: input.createdByUserId,
    createdAt: input.createdAt ?? new Date(),
  };
}

export function appendCodexRunEvent(
  runId: string,
  stage: string,
  message: string,
  occurredAt = new Date(),
  payload: Record<string, unknown> = {},
): CodexRunEvent {
  return {
    runId,
    stage,
    message,
    occurredAt,
    payload,
  };
}

export function summarizeCodexRun(run: CodexRun, events: CodexRunEvent[]): CodexRunSummary {
  const latestEvent = events.at(-1);
  const traceId = latestEvent?.payload.traceId;

  return {
    id: run.id,
    question: run.question,
    status: latestEvent?.stage ?? "pending",
    latestMessage: latestEvent?.message ?? null,
    traceId: typeof traceId === "string" ? traceId : null,
  };
}
