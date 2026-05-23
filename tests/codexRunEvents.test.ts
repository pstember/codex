import { describe, expect, it } from "vitest";
import { appendCodexRunEvent, createCodexRun, summarizeCodexRun } from "@/domain/codexRun";
import { createCommerceDatabase } from "@/persistence/database";

describe("Codex run observability", () => {
  it("orders persisted run events and exposes a terminal summary", () => {
    const database = createCommerceDatabase();

    try {
      const run = createCodexRun({
        id: "run-1",
        question: "Which coffee products should we promote?",
        createdByUserId: "demo-manager",
        createdAt: new Date("2026-05-23T10:00:00.000Z"),
      });

      database.saveCodexRun(run);
      database.saveCodexRunEvent(
        appendCodexRunEvent(
          run.id,
          "starting",
          "Prompt prepared",
          new Date("2026-05-23T10:00:01.000Z"),
        ),
      );
      database.saveCodexRunEvent(
        appendCodexRunEvent(
          run.id,
          "validating",
          "Generated GraphQL validated",
          new Date("2026-05-23T10:00:02.000Z"),
        ),
      );
      database.saveCodexRunEvent(
        appendCodexRunEvent(
          run.id,
          "complete",
          "Trace saved",
          new Date("2026-05-23T10:00:03.000Z"),
          {
            traceId: "trace-1",
          },
        ),
      );

      const events = database.listCodexRunEvents(run.id);
      expect(events.map((event) => event.stage)).toEqual(["starting", "validating", "complete"]);
      expect(summarizeCodexRun(run, events)).toEqual({
        id: "run-1",
        question: "Which coffee products should we promote?",
        status: "complete",
        latestMessage: "Trace saved",
        traceId: "trace-1",
      });
    } finally {
      database.close();
    }
  });
});
