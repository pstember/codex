import { assertSameOriginJsonRequest, authorizeApiRequest } from "@/app/auth/api";
import { askDataQuestion, type DataQuestionEvent } from "@/domain/dataQuestion";
import { commerceData } from "@/fixtures/commerce";
import { products } from "@/fixtures/products";
import { runCodexAppServerJsonPromptWithTrace } from "@/harness/codexAppServerClient";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestError = assertSameOriginJsonRequest(request);

  if (requestError) {
    return requestError;
  }

  const authorization = await authorizeApiRequest("ask_deep_metrics");

  if (authorization.response) {
    return authorization.response;
  }

  const body = (await request.json().catch(() => ({}))) as { message?: unknown };
  const message = typeof body.message === "string" ? body.message : "";
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send("trace", {
          stage: "request-received",
          title: "Request received",
          body: "The browser opened a live trace for this data question.",
        });

        const result = await askDataQuestion({
          message,
          commerceData,
          products,
          runJsonPrompt: runCodexAppServerJsonPromptWithTrace,
          onEvent: (traceEvent: DataQuestionEvent) => send("trace", traceEvent),
        });

        send("result", result);
      } catch (error) {
        send("error", {
          message: error instanceof Error ? error.message : "The data-question run failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}
