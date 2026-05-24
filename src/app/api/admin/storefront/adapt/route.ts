import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/app/auth/session";
import { appendCodexRunEvent, createCodexRun } from "@/domain/codexRun";
import { adaptStorefrontForEvent } from "@/domain/storefrontAdaptation";
import { products } from "@/fixtures/products";
import { baselineStorefront } from "@/fixtures/storefront";
import { getCodexHarness } from "@/harness/codexHarness";
import { generatedEventImageHarness } from "@/harness/imageHarness";
import { getAppDatabase } from "@/persistence/appDatabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireCurrentUser("publish_storefront");
  const body = (await request.json().catch(() => ({}))) as {
    eventName?: unknown;
    operatorPrompt?: unknown;
    sourceVersionId?: unknown;
  };
  const eventName = typeof body.eventName === "string" ? body.eventName : "";
  const operatorPrompt = typeof body.operatorPrompt === "string" ? body.operatorPrompt : "";
  const sourceVersionId = typeof body.sourceVersionId === "string" ? body.sourceVersionId : "";
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const database = getAppDatabase();
      const traceEvents: Array<{
        stage: string;
        title: string;
        body: string;
        payload?: string;
        payloadKind?: string;
      }> = [];
      let replayRunId: string | null = null;
      const sendTrace = (traceEvent: {
        stage: string;
        title: string;
        body: string;
        payload?: string;
        payloadKind?: string;
      }) => {
        traceEvents.push(traceEvent);
        if (replayRunId) {
          database.saveCodexRunEvent(
            appendCodexRunEvent(replayRunId, traceEvent.stage, traceEvent.body, new Date(), {
              title: traceEvent.title,
              payload: traceEvent.payload,
            }),
          );
        }
        send("trace", traceEvent);
      };

      try {
        const sourceVersion =
          sourceVersionId && sourceVersionId !== "baseline"
            ? database.findPublishedStorefrontVersionById(sourceVersionId)
            : null;
        const sourceStorefront =
          sourceVersion?.config ??
          database.findActiveStorefrontVersion()?.config ??
          baselineStorefront;
        const replayRun = createCodexRun({
          id: randomUUID(),
          question: `Storefront visual adaptation: ${eventName || "Untitled event"}`,
          createdByUserId: user.id,
          createdAt: new Date(),
        });

        database.saveCodexRun(replayRun);
        replayRunId = replayRun.id;

        sendTrace({
          stage: "request-received",
          title: "Request received",
          body: "The Operator opened a live storefront adaptation run.",
        });
        sendTrace({
          stage: "prompt-prepared",
          title: "Codex prompt prepared",
          body: `Adapting ${sourceStorefront.versionName} for ${eventName}.`,
          payload: JSON.stringify(
            {
              requestBody: {
                eventName,
                operatorPrompt,
                sourceVersionId,
              },
              resolvedSourceStorefront: sourceStorefront,
            },
            null,
            2,
          ),
          payloadKind: "prompt-context",
        });

        const draft = await adaptStorefrontForEvent({
          id: randomUUID(),
          eventName,
          operatorPrompt,
          sourceStorefront,
          harness: getCodexHarness(),
          imageHarness: generatedEventImageHarness,
          products,
          createdByUserId: user.id,
          createdAt: new Date(),
          storefrontStore: database,
        });

        const requestPayload =
          draft.generationTrace.requestPayload ??
          JSON.stringify(
            {
              schemaName: draft.generationTrace.schemaName,
              prompt: draft.generationTrace.prompt,
            },
            null,
            2,
          );

        sendTrace({
          stage: "generation-request-sent",
          title: "Codex request sent",
          body: "The backend sent this JSON envelope to Codex App Server for storefront generation.",
          payload: JSON.stringify(
            {
              schemaName: draft.generationTrace.schemaName,
              sentToCodexAppServer: parseJsonOrText(requestPayload),
            },
            null,
            2,
          ),
          payloadKind: "app-server-request",
        });

        sendTrace({
          stage: "generation-response",
          title: "Codex response received",
          body: `Storefront config returned by ${draft.generationTrace.harnessMode} harness.`,
          payload: JSON.stringify(
            {
              receivedFromCodexAppServer: draft.generationTrace.rawResponse,
              parsedResponse: draft.generationTrace.value,
              schemaName: draft.generationTrace.schemaName,
            },
            null,
            2,
          ),
          payloadKind: "app-server-response",
        });
        sendTrace({
          stage: "draft-validated",
          title: draft.validationStatus === "invalid" ? "Draft needs review" : "Draft validated",
          body:
            draft.validationErrors.length > 0
              ? draft.validationErrors.join("\n")
              : "Copy, palette, product references, and visual metadata passed validation.",
          payload: JSON.stringify(draft.config, null, 2),
        });
        sendTrace({
          stage: "image-generated",
          title: "Hero image saved",
          body: `${draft.config.visualAsset.source} asset: ${draft.config.visualAsset.path}`,
          payload: JSON.stringify(
            {
              imageHarnessMode: generatedEventImageHarness.mode,
              input: {
                campaignId: draft.config.campaignId,
                eventName,
                visualDirection: draft.config.visualAsset.prompt,
              },
              visualAsset: draft.config.visualAsset,
            },
            null,
            2,
          ),
        });

        revalidatePath("/admin/storefront");
        revalidatePath("/");
        send("result", {
          draftId: draft.id,
          status: draft.validationStatus,
          versionName: draft.config.versionName,
          validationErrors: draft.validationErrors,
          traceEvents,
        });
      } catch (error) {
        if (replayRunId) {
          database.saveCodexRunEvent(
            appendCodexRunEvent(
              replayRunId,
              "failed",
              error instanceof Error ? error.message : "The storefront adaptation run failed.",
              new Date(),
            ),
          );
        }
        send("error", {
          message: error instanceof Error ? error.message : "The storefront adaptation run failed.",
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

function parseJsonOrText(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
