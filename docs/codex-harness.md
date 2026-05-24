# Codex And Image Harness

## Current Local Reality

Codex CLI is available locally, and the CLI includes the experimental Codex App Server.

Protocol reference: <https://developers.openai.com/codex/app-server#protocol>

The default command:

```sh
codex app-server
```

uses the `stdio://` transport. This is suitable for a parent process that spawns Codex and speaks the App Server JSONL protocol over stdin/stdout, but it does not expose a localhost port.

For local development with probeable health endpoints, run:

```sh
codex app-server --listen ws://127.0.0.1:4500
```

Then verify:

```sh
curl http://127.0.0.1:4500/readyz
curl http://127.0.0.1:4500/healthz
```

Both endpoints should return HTTP 200 when the WebSocket listener is ready. Runtime generation uses the App Server adapter; static and fixture harnesses are reserved for tests and deterministic development checks.

## Codex Harness Interface

The app should use a server-side harness with these capabilities:

- Generate GraphQL query from a business question and schema context.
- Summarize insight from query results and commerce context.
- Generate storefront event adaptations using the fixed Hero product, Current offer, and Spotlight roles.
- Rewrite copy for a new audience or event.
- Generate image prompts for storefront visuals.

## Implementations

- `staticCommerceHarness`: test-support harness that derives queries, insights, and storefront configs from the seeded Atlas catalog rather than generated fixtures.
- `fixtureCodexHarness`: deterministic test-support harness only.
- `cliCodexHarness`: optional local Codex CLI integration where useful.
- `appServerCodexHarness`: required runtime adapter for the Codex App Server protocol. The app uses a real `stdio://` path by spawning `codex app-server`, starting an ephemeral read-only thread, sending a JSON-schema-constrained turn, and validating the returned JSON before persistence or rendering. Product generation fails clearly if App Server is unavailable instead of falling back to static output.

To run a human demo with real Codex App Server usage:

```sh
npm run dev
```

Then use the normal Manager and Operator generation actions. The Codex CLI must be authenticated and able to run `codex app-server`.
- Storefront config generation enriches valid event drafts with image-harness hero asset metadata before validation and persistence.
- Manager custom questions use Codex to translate natural language into the fixed GraphQL schema, validate the generated query, execute it against the seeded product catalog, and stream the run events in the Insight workspace.
- `/admin/insights` is a strict data-question harness. It sends non-empty prompts to Codex for query-vs-unsupported classification, asks Codex for one JSON-schema-constrained GraphQL query when the prompt is data-driven, validates and executes the query server-side, reduces raw rows into a compact evidence pack, then asks Codex for a final JSON answer that may only cite supplied evidence. The right-side traceability window streams each step in real time through `/api/insights/data-question`.
- `/admin/insights` also exposes a backend-owned metric catalog. Codex can request approved metric IDs plus `sortBy` and `limit`, but the server validates those IDs and calculates scores, rankings, risk exclusions, caps, and truncation notes before the final-answer turn. The UI renders the same calculated evidence as KPI tiles, a metric lens, ranked promotion candidates, return distribution, conversion outliers, channel mix, source-data drilldown, and a metric coverage list beside the chat input.
- Return data questions support requested return date ranges through `ReturnFilter.requestedFrom` and `ReturnFilter.requestedTo`; return-rate evidence is computed as matching requested returns divided by the order rows supplied in the validated query result.
- Order data questions support placed-order date ranges through `OrderFilter.orderedFrom` and `OrderFilter.orderedTo`, which lets the `/admin/insights` harness answer period questions such as Secret Santa launch-week order volume.
- `/admin/storefront` now includes an event adaptation studio. Operators can send an open event prompt, the harness generates a storefront config with event copy and palette data, the image harness supplies generated hero metadata, and the server validates the config before saving it as a normal draft for preview, publishing, rollback, and Time Machine comparison.
- Generated storefront configs must include exactly three configured sections in order: Hero product, Current offer, and Spotlight. The public All products catalog is renderer-owned and cannot be removed by Codex output.

## Image Harness Interface

The image harness should:

- Return static visual assets for deterministic tests.
- Store prompts and asset metadata.
- Current static assets live under `public/static-assets/` for baseline, Father’s Day, and Secret Santa hero visuals.
- Event adaptations use a generated-image harness boundary that calls Codex App Server image generation, copies the saved PNG into ignored `public/generated-assets/`, and stores generated hero metadata on the storefront config.
- Static and injected image harnesses remain available for tests and deterministic local verification.

## Validation Boundary

Harness output is data, not code. The app must validate GraphQL, storefront section roles/order, copy payloads, and image metadata before persistence or rendering.

## Fixture And Runtime State

- TypeScript fixtures under `src/fixtures/` are the analytics source for products, customers, orders, returns, promotions, and email events.
- SQLite runtime state is intentionally narrow: demo users, sessions, storefront drafts, published versions, and Codex run events.
- Build the tracked clean fixture database with `npm run db:fixture`; it should contain demo users only unless a canonical storefront baseline is intentionally added.
- `.data/commerce.db` and `public/generated-assets/` remain ignored local runtime output and should not be packaged as demo fixtures.
