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

Both endpoints should return HTTP 200 when the WebSocket listener is ready. The App Server adapter should still be optional, with static raw catalog flows available for deterministic quick demos and fixtures kept to tests.

## Codex Harness Interface

The app should use a server-side harness with these capabilities:

- Generate GraphQL query from a business question and schema context.
- Summarize insight from query results and commerce context.
- Generate campaign proposal from insight and product context.
- Generate storefront section config from an approved campaign.
- Rewrite copy for a new seasonal audience.
- Generate image prompts for campaign visuals.

## Implementations

- `staticCommerceHarness`: default runtime harness that derives queries, insights, campaign proposals, and storefront configs from the seeded Atlas catalog rather than generated fixtures.
- `fixtureCodexHarness`: deterministic test-support harness only.
- `cliCodexHarness`: optional local Codex CLI integration where useful.
- `appServerCodexHarness`: optional adapter for the Codex App Server protocol. The app now supports a real `stdio://` path by spawning `codex app-server`, starting an ephemeral read-only thread, sending a JSON-schema-constrained turn, and validating the returned JSON before persistence or rendering. It is gated by `CODEX_HARNESS_MODE=app-server`; static catalog mode remains the default runtime mode.

To run a human demo with real Codex App Server usage:

```sh
CODEX_HARNESS_MODE=app-server npm run dev
```

Then use the normal Manager and Operator generation actions. If the Codex CLI is not authenticated or App Server is unavailable, omit `CODEX_HARNESS_MODE` to use static catalog mode.
- Storefront config generation enriches valid proposals with image-harness hero asset metadata before validation and persistence.
- Manager custom questions are enabled only in `CODEX_HARNESS_MODE=app-server`. They use Codex to translate natural language into the fixed GraphQL schema, validate the generated query, execute it against the seeded product catalog, and persist the run as a trace.

## Image Harness Interface

The image harness should:

- Return static visual assets for deterministic demo runs.
- Store prompts and asset metadata.
- Current static assets live under `public/static-assets/` for baseline, Father’s Day, and Secret Santa hero visuals.
- Later support live image generation or editing when the environment is ready.

## Validation Boundary

Harness output is data, not code. The app must validate GraphQL, campaign configs, storefront sections, copy payloads, and image metadata before persistence or rendering.
