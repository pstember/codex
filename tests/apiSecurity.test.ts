import { describe, expect, it, vi } from "vitest";

describe("API route security", () => {
  it("rejects anonymous Insight data-question requests before running Codex", async () => {
    vi.resetModules();
    const askDataQuestion = vi.fn();

    vi.doMock("@/app/auth/session", () => ({
      getCurrentUser: vi.fn(async () => null),
    }));
    vi.doMock("@/domain/dataQuestion", () => ({
      askDataQuestion,
    }));
    vi.doMock("@/fixtures/commerce", () => ({
      commerceData: {},
    }));
    vi.doMock("@/fixtures/products", () => ({
      products: [],
    }));
    vi.doMock("@/harness/codexAppServerClient", () => ({
      runCodexAppServerJsonPromptWithTrace: vi.fn(),
    }));

    const { POST } = await import("@/app/api/insights/data-question/route");
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/insights/data-question", {
        body: JSON.stringify({ message: "Which products should we feature?" }),
        headers: {
          "Content-Type": "application/json",
          Origin: "http://127.0.0.1:3000",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(askDataQuestion).not.toHaveBeenCalled();
  });

  it("rejects roles without Insight permission before running Codex", async () => {
    vi.resetModules();
    const askDataQuestion = vi.fn();

    vi.doMock("@/app/auth/session", () => ({
      getCurrentUser: vi.fn(async () => ({
        id: "demo-operator",
        email: "operator@demo.com",
        name: "Owen Patel",
        role: "operator",
        sessionId: "operator-session",
      })),
    }));
    vi.doMock("@/domain/dataQuestion", () => ({
      askDataQuestion,
    }));
    vi.doMock("@/fixtures/commerce", () => ({
      commerceData: {},
    }));
    vi.doMock("@/fixtures/products", () => ({
      products: [],
    }));
    vi.doMock("@/harness/codexAppServerClient", () => ({
      runCodexAppServerJsonPromptWithTrace: vi.fn(),
    }));

    const { POST } = await import("@/app/api/insights/data-question/route");
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/insights/data-question", {
        body: JSON.stringify({ message: "Which products should we feature?" }),
        headers: {
          "Content-Type": "application/json",
          Origin: "http://127.0.0.1:3000",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Permission denied." });
    expect(askDataQuestion).not.toHaveBeenCalled();
  });

  it("rejects anonymous Codex run-event streams before reading traces", async () => {
    vi.resetModules();
    const listCodexRunEvents = vi.fn();

    vi.doMock("@/app/auth/session", () => ({
      getCurrentUser: vi.fn(async () => null),
    }));
    vi.doMock("@/persistence/appDatabase", () => ({
      getAppDatabase: vi.fn(() => ({
        listCodexRunEvents,
      })),
    }));

    const { GET } = await import("@/app/api/codex-runs/[runId]/events/route");
    const response = await GET(new Request("http://127.0.0.1:3000/api/codex-runs/run-1/events"), {
      params: Promise.resolve({ runId: "run-1" }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(listCodexRunEvents).not.toHaveBeenCalled();
  });
});
