/* v8 ignore start -- Live Codex App Server stdio boundary; public harness behavior is tested with a fake JSON runner. */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

type JsonRpcResponse = {
  id?: number | string;
  result?: unknown;
  error?: {
    message?: string;
  };
};

type JsonRpcNotification = {
  method?: string;
  params?: unknown;
};

export async function runCodexAppServerJsonPrompt<T>(input: {
  prompt: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
}): Promise<T> {
  const result = await runCodexAppServerJsonPromptWithTrace<T>(input);

  return result.value;
}

export async function runCodexAppServerJsonPromptWithTrace<T>(input: {
  prompt: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
}): Promise<{
  prompt: string;
  requestPayload: string;
  rawResponse: string;
  schemaName: string;
  value: T;
}> {
  const client = new CodexAppServerStdioClient();

  try {
    return await client.runJsonPromptWithTrace<T>(input);
  } finally {
    client.close();
  }
}

export type CodexAppServerImageResult = {
  prompt: string;
  revisedPrompt: string | null;
  savedPath: string;
};

export async function runCodexAppServerImagePrompt(input: {
  prompt: string;
}): Promise<CodexAppServerImageResult> {
  const client = new CodexAppServerStdioClient();

  try {
    return await client.runImagePrompt(input);
  } finally {
    client.close();
  }
}

class CodexAppServerStdioClient {
  private readonly child = spawn("codex", ["app-server"], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });
  private nextRequestId = 1;
  private stderr = "";
  private readonly pending = new Map<
    number,
    {
      reject: (error: Error) => void;
      resolve: (value: unknown) => void;
    }
  >();
  private readonly agentMessageDeltas: string[] = [];
  private completedTurnText = "";
  private completedImage: {
    revisedPrompt: string | null;
    savedPath: string | null;
  } | null = null;
  private turnCompleted: {
    reject: (error: Error) => void;
    resolve: () => void;
    turnId: string;
  } | null = null;

  constructor() {
    const stdout = createInterface({ input: this.child.stdout });
    stdout.on("line", (line) => this.handleLine(line));
    this.child.stderr.on("data", (chunk) => {
      this.stderr += String(chunk);
    });
    this.child.on("error", (error) => this.rejectAll(error));
    this.child.on("exit", (code, signal) => {
      if (this.pending.size === 0 && !this.turnCompleted) {
        return;
      }

      this.rejectAll(
        new Error(`Codex App Server exited before completing the request (${code ?? signal}).`),
      );
    });
  }

  async runJsonPrompt<T>(input: {
    prompt: string;
    schemaName: string;
    jsonSchema: Record<string, unknown>;
  }): Promise<T> {
    const result = await this.runJsonPromptWithTrace<T>(input);

    return result.value;
  }

  async runJsonPromptWithTrace<T>(input: {
    prompt: string;
    schemaName: string;
    jsonSchema: Record<string, unknown>;
  }): Promise<{
    prompt: string;
    requestPayload: string;
    rawResponse: string;
    schemaName: string;
    value: T;
  }> {
    this.agentMessageDeltas.length = 0;
    this.completedTurnText = "";

    const initializePayload = {
      clientInfo: {
        name: "commerce-copilot-studio",
        title: "Commerce Copilot Studio",
        version: "0.1.0",
      },
      capabilities: {
        experimentalApi: true,
        requestAttestation: false,
      },
    };

    await this.request("initialize", initializePayload);
    this.notify("initialized");

    const threadStartPayload = {
      cwd: process.cwd(),
      runtimeWorkspaceRoots: [process.cwd()],
      approvalPolicy: "never",
      sandbox: "read-only",
      ephemeral: true,
      experimentalRawEvents: false,
      persistExtendedHistory: false,
      baseInstructions:
        "You are embedded in Commerce Copilot Studio. Return only valid JSON for the requested schema.",
      developerInstructions:
        "Do not run commands, edit files, or use tools. Produce deterministic, concise JSON only.",
    };
    const threadStart = (await this.request("thread/start", threadStartPayload)) as {
      thread?: { id?: string };
    };
    const threadId = threadStart.thread?.id;

    if (!threadId) {
      throw new Error("Codex App Server did not return a thread id.");
    }

    const turnStartPayload = {
      threadId,
      input: [
        {
          type: "text",
          text: input.prompt,
          text_elements: [],
        },
      ],
      outputSchema: input.jsonSchema,
      approvalPolicy: "never",
    };
    const turnStart = (await this.request("turn/start", turnStartPayload)) as {
      turn?: { id?: string };
    };
    const turnId = turnStart.turn?.id;

    if (!turnId) {
      throw new Error("Codex App Server did not return a turn id.");
    }

    await this.waitForTurnCompletion(turnId);

    const rawResponse = this.agentMessageDeltas.join("") || this.completedTurnText;

    return {
      prompt: input.prompt,
      requestPayload: JSON.stringify(
        {
          initialize: initializePayload,
          initialized: {},
          threadStart: threadStartPayload,
          turnStart: turnStartPayload,
        },
        null,
        2,
      ),
      rawResponse,
      schemaName: input.schemaName,
      value: parseJsonFromAssistantText<T>(rawResponse),
    };
  }

  async runImagePrompt(input: { prompt: string }): Promise<CodexAppServerImageResult> {
    this.agentMessageDeltas.length = 0;
    this.completedTurnText = "";
    this.completedImage = null;

    await this.request("initialize", {
      clientInfo: {
        name: "commerce-copilot-studio",
        title: "Commerce Copilot Studio",
        version: "0.1.0",
      },
      capabilities: {
        experimentalApi: true,
        requestAttestation: false,
      },
    });
    this.notify("initialized");

    const threadStart = (await this.request("thread/start", {
      cwd: process.cwd(),
      runtimeWorkspaceRoots: [process.cwd()],
      approvalPolicy: "never",
      sandbox: "read-only",
      ephemeral: true,
      experimentalRawEvents: false,
      persistExtendedHistory: false,
      baseInstructions:
        "You are embedded in Commerce Copilot Studio. Generate exactly one image for the requested storefront hero.",
      developerInstructions:
        "Use image generation when the user asks for a hero image. Do not run commands, edit files, or call unrelated tools.",
    })) as { thread?: { id?: string } };
    const threadId = threadStart.thread?.id;

    if (!threadId) {
      throw new Error("Codex App Server did not return a thread id.");
    }

    const turnStart = (await this.request("turn/start", {
      threadId,
      input: [
        {
          type: "text",
          text: input.prompt,
          text_elements: [],
        },
      ],
      approvalPolicy: "never",
    })) as { turn?: { id?: string } };
    const turnId = turnStart.turn?.id;

    if (!turnId) {
      throw new Error("Codex App Server did not return a turn id.");
    }

    await this.waitForTurnCompletion(turnId);

    const completedImage = this.getCompletedImage();

    if (!completedImage?.savedPath) {
      throw new Error("Codex App Server did not return a generated image path.");
    }

    return {
      prompt: input.prompt,
      revisedPrompt: completedImage.revisedPrompt,
      savedPath: completedImage.savedPath,
    };
  }

  close() {
    this.child.stdin.destroy();
    this.child.stdout.destroy();
    this.child.stderr.destroy();
    this.child.kill();
  }

  private request(method: string, params: unknown): Promise<unknown> {
    const id = this.nextRequestId++;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.write({ jsonrpc: "2.0", id, method, params });
    });
  }

  private notify(method: string) {
    this.write({ jsonrpc: "2.0", method });
  }

  private getCompletedImage(): {
    revisedPrompt: string | null;
    savedPath: string | null;
  } | null {
    return this.completedImage;
  }

  private write(payload: unknown) {
    this.child.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  private handleLine(line: string) {
    if (!line.trim()) {
      return;
    }

    const message = JSON.parse(line) as JsonRpcResponse & JsonRpcNotification;

    if (message.id !== undefined) {
      this.handleResponse(message);
      return;
    }

    this.handleNotification(message);
  }

  private handleResponse(message: JsonRpcResponse) {
    const requestId = Number(message.id);
    const pendingRequest = this.pending.get(requestId);

    if (!pendingRequest) {
      return;
    }

    this.pending.delete(requestId);

    if (message.error) {
      pendingRequest.reject(new Error(message.error.message ?? "Codex App Server request failed."));
      return;
    }

    pendingRequest.resolve(message.result);
  }

  private handleNotification(message: JsonRpcNotification) {
    if (message.method === "item/agentMessage/delta") {
      const params = message.params as { delta?: string };

      if (params.delta) {
        this.agentMessageDeltas.push(params.delta);
      }
    }

    if (message.method === "item/completed") {
      const params = message.params as {
        item?: {
          phase?: string | null;
          revisedPrompt?: string | null;
          savedPath?: string | null;
          text?: string;
          type?: string;
        };
      };

      if (params.item?.type === "agentMessage" && params.item.phase !== "interim") {
        this.completedTurnText += params.item.text ?? "";
      }

      if (params.item?.type === "imageGeneration") {
        this.completedImage = {
          revisedPrompt: params.item.revisedPrompt ?? null,
          savedPath: params.item.savedPath ?? null,
        };
      }
    }

    if (message.method === "turn/completed" && this.turnCompleted) {
      const params = message.params as {
        turn?: {
          error?: unknown;
          id?: string;
          items?: Array<{
            phase?: string | null;
            text?: string;
            type?: string;
          }>;
          status?: string;
        };
      };

      if (params.turn?.id !== this.turnCompleted.turnId) {
        return;
      }

      const completion = this.turnCompleted;
      this.turnCompleted = null;

      if (params.turn.status === "failed") {
        completion.reject(
          new Error(`Codex App Server turn failed: ${JSON.stringify(params.turn.error)}`),
        );
        return;
      }

      const completedItemsText = readAgentMessageText(params.turn);

      if (completedItemsText) {
        this.completedTurnText = completedItemsText;
      }
      completion.resolve();
    }
  }

  private waitForTurnCompletion(turnId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.turnCompleted = { resolve, reject, turnId };
    });
  }

  private rejectAll(error: Error) {
    for (const pendingRequest of this.pending.values()) {
      pendingRequest.reject(error);
    }

    this.pending.clear();

    if (this.turnCompleted) {
      this.turnCompleted.reject(
        new Error(`${error.message}${this.stderr ? `\n${this.stderr}` : ""}`),
      );
      this.turnCompleted = null;
    }
  }
}

function parseJsonFromAssistantText<T>(text: string): T {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const rawJson = fenced ? fenced[1] : trimmed;

  if (!rawJson) {
    throw new Error("Codex App Server returned an empty response.");
  }

  return JSON.parse(rawJson) as T;
}

function readAgentMessageText(turn: {
  items?: Array<{
    phase?: string | null;
    text?: string;
    type?: string;
  }>;
}): string {
  return (
    turn.items
      ?.filter((item) => item.type === "agentMessage")
      .filter((item) => item.phase !== "interim")
      .map((item) => item.text ?? "")
      .join("") ?? ""
  );
}
