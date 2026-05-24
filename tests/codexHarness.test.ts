import { describe, expect, it } from "vitest";
import { generatedQuerySchema, insightSummarySchema } from "@/domain/insight";
import { storefrontConfigSchema } from "@/domain/storefront";
import {
  type CodexAppServerJsonRunner,
  type CodexAppServerJsonTraceRunner,
  cliCodexHarness,
  createAppServerCodexHarness,
  getCodexHarness,
  staticCommerceHarness,
} from "@/harness/codexHarness";
import { fixtureCodexHarness } from "./support/fixtureCodexHarness";

describe("Codex harness", () => {
  it("returns valid query and insight fixtures for approved manager questions", async () => {
    const query = await fixtureCodexHarness.generateGraphQLQuery(
      "Which products have high inventory but are underexposed on the storefront?",
    );
    const insight = await fixtureCodexHarness.summarizeInsight(
      "Which products have high inventory but are underexposed on the storefront?",
    );

    expect(generatedQuerySchema.parse(query).operationName).toBe(
      "UnderexposedHighInventoryProducts",
    );
    expect(insightSummarySchema.parse(insight).recommendedProductIds).toContain(
      "desk-organizer-tray",
    );
  });

  it("derives adaptation drafts from the static and CLI harnesses", async () => {
    const staticDraft = await staticCommerceHarness.generateStorefrontAdaptation({
      eventName: "World Cup",
      operatorPrompt: "Make it feel match-day ready.",
      sourceStorefront: await fixtureCodexHarness.generateStorefrontAdaptation({
        eventName: "Baseline",
        operatorPrompt: "Keep it bright.",
        sourceStorefront: await fixtureCodexHarness.generateStorefrontAdaptation({
          eventName: "Seed",
          operatorPrompt: "Seed prompt.",
          sourceStorefront: {
            id: "baseline",
            campaignId: "evergreen",
            versionName: "Baseline",
            style: {
              theme: "basic",
              accentColor: "#2563eb",
              density: "comfortable",
              palette: {
                background: "#f9fbff",
                surface: "#ffffff",
                text: "#0b1020",
                muted: "#42526e",
                border: "#c7d7ff",
                accent: "#2563eb",
                secondaryAccent: "#22d3ee",
                button: "#0b1020",
                buttonText: "#ffffff",
              },
            },
            visualAsset: {
              id: "evergreen-hero-asset",
              campaignId: "evergreen",
              prompt: "Baseline prompt.",
              alt: "Baseline hero.",
              source: "static",
              path: "/static-assets/basic-hero.svg",
              composition: {
                slot: "storefrontHeroWide",
                aspectRatio: "14 / 9",
                focalPoint: "right-center",
                safeArea: "copy-left-half",
                objectPosition: "72% center",
              },
            },
            sections: [
              {
                id: "baseline-hero",
                type: "hero",
                sectionIntent: "heroProduct",
                title: "Baseline",
                body: "Baseline",
                productIds: ["pour-over-coffee-set"],
              },
              {
                id: "baseline-offer",
                type: "productRail",
                sectionIntent: "currentOffer",
                title: "Offer",
                body: "Offer body",
                productIds: ["wireless-charging-valet"],
              },
              {
                id: "baseline-spotlight",
                type: "featuredCollection",
                sectionIntent: "spotlight",
                title: "Spotlight",
                body: "Spotlight body",
                productIds: ["desk-organizer-tray"],
              },
            ],
          },
        }),
      }),
    });
    const cliDraft = await cliCodexHarness.generateStorefrontAdaptation({
      eventName: "Halloween",
      operatorPrompt: "Make it eerie and useful.",
      sourceStorefront: staticDraft,
    });

    expect(staticCommerceHarness.mode).toBe("static");
    expect(cliCodexHarness.mode).toBe("cli");
    expect(storefrontConfigSchema.parse(staticDraft).versionName).toBe("World Cup");
    expect(storefrontConfigSchema.parse(cliDraft).versionName).toBe("Halloween");
  });

  it("routes app-server storefront adaptation through JSON schema validation", async () => {
    const requestedSchemas: string[] = [];
    const requestedJsonSchemas: Record<string, Record<string, unknown>> = {};
    const requestedPrompts: Record<string, string> = {};

    const fakeJsonRunner: CodexAppServerJsonRunner = async <T>(input: {
      prompt: string;
      schemaName: string;
      jsonSchema: Record<string, unknown>;
    }) => {
      requestedSchemas.push(input.schemaName);
      requestedJsonSchemas[input.schemaName] = input.jsonSchema;
      requestedPrompts[input.schemaName] = input.prompt;
      return (await fixtureCodexHarness.generateStorefrontAdaptation({
        eventName: "World Cup",
        operatorPrompt: "Make it match-day ready.",
        sourceStorefront: await fixtureCodexHarness.generateStorefrontAdaptation({
          eventName: "Baseline",
          operatorPrompt: "Keep it bright.",
          sourceStorefront: {} as never,
        }),
      })) as T;
    };

    const fakeTraceRunner: CodexAppServerJsonTraceRunner = async <T>(input: {
      prompt: string;
      schemaName: string;
      jsonSchema: Record<string, unknown>;
    }) => {
      requestedSchemas.push(input.schemaName);
      requestedJsonSchemas[input.schemaName] = input.jsonSchema;
      requestedPrompts[input.schemaName] = input.prompt;

      return {
        harnessMode: "app-server",
        prompt: input.prompt,
        rawResponse: JSON.stringify(
          await fixtureCodexHarness.generateStorefrontAdaptation({
            eventName: "World Cup",
            operatorPrompt: "Make it match-day ready.",
            sourceStorefront: {} as never,
          }),
        ),
        schemaName: input.schemaName,
        value: (await fixtureCodexHarness.generateStorefrontAdaptation({
          eventName: "World Cup",
          operatorPrompt: "Make it match-day ready.",
          sourceStorefront: {} as never,
        })) as T,
      };
    };

    const appServerHarness = createAppServerCodexHarness(fakeJsonRunner, fakeTraceRunner);
    const draft = await appServerHarness.generateStorefrontAdaptation({
      eventName: "World Cup",
      operatorPrompt: "Make it match-day ready.",
      sourceStorefront: {} as never,
    });

    expect(appServerHarness.mode).toBe("app-server");
    expect(storefrontConfigSchema.parse(draft).versionName).toBe("World Cup");
    expect(requestedSchemas).toEqual(["StorefrontConfig"]);
    expect(requestedPrompts.StorefrontConfig).toContain("World Cup");
    expect(requestedPrompts.StorefrontConfig).toContain(
      "exact sections in order: Hero product, Current offer, Spotlight",
    );
    expectSchemaRequiredProperties(requestedJsonSchemas.StorefrontConfig);
  });

  it("routes app-server query and insight generation through compatible JSON schemas", async () => {
    const requestedJsonSchemas: Record<string, Record<string, unknown>> = {};
    const requestedPrompts: Record<string, string> = {};
    const fakeJsonRunner: CodexAppServerJsonRunner = async <T>(input: {
      prompt: string;
      schemaName: string;
      jsonSchema: Record<string, unknown>;
    }) => {
      requestedJsonSchemas[input.schemaName] = input.jsonSchema;
      requestedPrompts[input.schemaName] = input.prompt;

      if (input.schemaName === "GeneratedQuery") {
        return {
          question: "Which under £50 products should I feature?",
          operationName: "UnderFiftyProductCandidates",
          query: `query UnderFiftyProductCandidates {
  products(filter: { maxPrice: 50 }) {
    id
    name
  }
}`,
          rationale: "Fetch under-£50 product candidates.",
          recommendedChart: "productTable",
        } as T;
      }

      return {
        title: "Desk Organizer Tray is the strongest underexposed pick.",
        summary: "It has enough stock and margin to merit more storefront exposure.",
        recommendedProductIds: ["desk-organizer-tray"],
        risks: [],
      } as T;
    };
    const appServerHarness = createAppServerCodexHarness(fakeJsonRunner);

    const query = await appServerHarness.generateGraphQLQuery(
      "Which under £50 products should I feature?",
    );
    const insight = await appServerHarness.summarizeInsight(
      "Which products have high inventory but are underexposed on the storefront?",
    );

    expect(query.operationName).toBe("UnderFiftyProductCandidates");
    expect(insight.recommendedProductIds).toEqual(["desk-organizer-tray"]);
    expect(requestedPrompts.GeneratedQuery).toContain("Which under £50 products should I feature?");
    expect(requestedPrompts.InsightSummary).toContain("Seeded product ids:");
    expectSchemaRequiredProperties(requestedJsonSchemas.GeneratedQuery);
    expectSchemaRequiredProperties(requestedJsonSchemas.InsightSummary);
  });

  it("derives static Codex generation outputs across supported question branches", async () => {
    const underFiftyQuery = await staticCommerceHarness.generateGraphQLQuery(
      "Which under £50 products have the best margin?",
    );
    const knownQuery = await staticCommerceHarness.generateGraphQLQuery(
      "Which products should we avoid promoting because of low margin, low stock, or high returns?",
    );
    const defaultQuery =
      await staticCommerceHarness.generateGraphQLQuery("What should we feature?");

    const underFiftyInsight = await staticCommerceHarness.summarizeInsight(
      "Which under £50 products have the best margin?",
    );
    const riskInsight = await staticCommerceHarness.summarizeInsight(
      "Which products should we avoid promoting because of low margin, low stock, or high returns?",
    );
    const mobileInsight = await staticCommerceHarness.summarizeInsight(
      "Why did mobile conversion drop last week?",
    );
    const underexposedInsight = await staticCommerceHarness.summarizeInsight(
      "Which products have high inventory but are underexposed on the storefront?",
    );
    const defaultInsight = await staticCommerceHarness.summarizeInsight("What should we feature?");

    expect(underFiftyQuery.operationName).toBe("UnderFiftyProductCandidates");
    expect(knownQuery.operationName).toBe("PromotionRiskExclusions");
    expect(defaultQuery.operationName).toBe("FatherDayPromotionCandidates");
    expect(underFiftyInsight.recommendedProductIds.length).toBeGreaterThan(0);
    expect(riskInsight.recommendedProductIds.length).toBeGreaterThan(0);
    expect(mobileInsight.recommendedProductIds.length).toBeGreaterThan(0);
    expect(underexposedInsight.recommendedProductIds.length).toBeGreaterThan(0);
    expect(defaultInsight.recommendedProductIds.length).toBeGreaterThan(0);
  });

  it("exposes traced adaptation metadata in app-server mode", async () => {
    const rawResponse = JSON.stringify(
      await fixtureCodexHarness.generateStorefrontAdaptation({
        eventName: "World Cup",
        operatorPrompt: "Make it match-day ready.",
        sourceStorefront: {} as never,
      }),
    );
    const fakeTraceRunner: CodexAppServerJsonTraceRunner = async <T>(input: {
      prompt: string;
      schemaName: string;
      jsonSchema: Record<string, unknown>;
    }) => ({
      harnessMode: "app-server",
      prompt: input.prompt,
      rawResponse,
      schemaName: input.schemaName,
      value: JSON.parse(rawResponse) as T,
    });
    const appServerHarness = createAppServerCodexHarness(undefined, fakeTraceRunner);

    const trace = await appServerHarness.generateStorefrontAdaptationTrace({
      eventName: "World Cup",
      operatorPrompt: "Make it match-day ready.",
      sourceStorefront: {} as never,
    });

    expect(trace.harnessMode).toBe("app-server");
    expect(trace.schemaName).toBe("StorefrontConfig");
    expect(trace.prompt).toContain("World Cup");
    expect(trace.requestPayload).toContain('"schemaName": "StorefrontConfig"');
    expect(trace.requestPayload).toContain('"outputSchema"');
    expect(trace.requestPayload).toContain('"objectPosition"');
    expect(trace.rawResponse).toContain("event-world-cup");
  });

  it("uses app-server mode as the product harness default", () => {
    const originalMode = process.env.CODEX_HARNESS_MODE;

    delete process.env.CODEX_HARNESS_MODE;
    expect(getCodexHarness().mode).toBe("app-server");

    process.env.CODEX_HARNESS_MODE = "static";
    expect(getCodexHarness().mode).toBe("app-server");

    if (originalMode === undefined) {
      delete process.env.CODEX_HARNESS_MODE;
    } else {
      process.env.CODEX_HARNESS_MODE = originalMode;
    }
  });
});

function expectSchemaRequiredProperties(schema: Record<string, unknown>, path = "schema"): void {
  if (schema.additionalProperties === false && isRecord(schema.properties)) {
    expect(schema.required, `${path}.required`).toEqual(Object.keys(schema.properties));
  }

  if (isRecord(schema.properties)) {
    for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
      if (isRecord(propertySchema)) {
        expectSchemaRequiredProperties(propertySchema, `${path}.properties.${propertyName}`);
      }
    }
  }

  if (isRecord(schema.items)) {
    expectSchemaRequiredProperties(schema.items, `${path}.items`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
