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

Both endpoints should return HTTP 200 when the WebSocket listener is ready. The App Server adapter should still be optional and fixture-backed flows must remain the default for deterministic tests and Loom replay.

## Codex Harness Interface

The app should use a server-side harness with these capabilities:

- Generate GraphQL query from a business question and schema context.
- Summarize insight from query results and commerce context.
- Generate campaign proposal from insight and product context.
- Generate storefront section config from an approved campaign.
- Rewrite copy for a new seasonal audience.
- Generate image prompts for campaign visuals.

## Implementations

- `fixtureCodexHarness`: deterministic outputs for tests, local development, and Loom replay.
- `cliCodexHarness`: optional local Codex CLI integration where useful.
- `appServerCodexHarness`: optional adapter for the Codex App Server protocol. The app now supports a real `stdio://` path by spawning `codex app-server`, starting an ephemeral read-only thread, sending a JSON-schema-constrained turn, and validating the returned JSON before persistence or rendering. It is gated by `CODEX_HARNESS_MODE=app-server`; fixture mode remains the default for deterministic tests and Loom replay.

To run a human demo with real Codex App Server usage:

```sh
CODEX_HARNESS_MODE=app-server npm run dev
```

Then use the normal Manager and Operator generation actions. If the Codex CLI is not authenticated or App Server is unavailable, switch back to fixture mode by omitting `CODEX_HARNESS_MODE`.
- Storefront config generation enriches valid proposals with image-harness hero asset metadata before validation and persistence.

## Image Harness Interface

The image harness should:

- Return fixture-backed visual assets for deterministic demo runs.
- Store prompts and asset metadata.
- Current fixture assets live under `public/fixtures/` for baseline, Father’s Day, and Secret Santa hero visuals.
- Later support live image generation or editing when the environment is ready.

## Validation Boundary

Harness output is data, not code. The app must validate GraphQL, campaign configs, storefront sections, copy payloads, and image metadata before persistence or rendering.
