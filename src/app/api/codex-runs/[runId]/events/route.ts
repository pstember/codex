import { authorizeApiRequest } from "@/app/auth/api";
import { getAppDatabase } from "@/persistence/appDatabase";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ runId: string }>;
  },
) {
  const authorization = await authorizeApiRequest("view_codex_traces");

  if (authorization.response) {
    return authorization.response;
  }

  const { runId } = await params;
  const events = getAppDatabase().listCodexRunEvents(runId);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      for (const [index, event] of events.entries()) {
        controller.enqueue(
          encoder.encode(
            [
              `id: ${index + 1}`,
              "event: codex-run-event",
              `data: ${JSON.stringify({
                ...event,
                occurredAt: event.occurredAt.toISOString(),
              })}`,
              "",
              "",
            ].join("\n"),
          ),
        );
      }

      controller.enqueue(encoder.encode("event: codex-run-end\ndata: {}\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}
