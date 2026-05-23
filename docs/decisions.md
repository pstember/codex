# Decisions

## 2026-05-21: Full-Stack TypeScript

Use a full-stack TypeScript app so domain contracts, server actions, tests, and UI share types.

## 2026-05-21: Tailwind CSS v4

Use Tailwind CSS v4 with the CSS-first `@import "tailwindcss";` setup. Avoid v3 configuration assumptions unless a documented incompatibility appears.

## 2026-05-21: Fixture-First Codex Harness

Build `codexHarness` behind an interface with deterministic fixtures first, optional Codex CLI support second, and App Server support only when explicitly configured. Early phases must not depend on live Codex availability.

## 2026-05-22: Codex App Server Is Locally Available

The local Codex CLI includes `codex app-server`. By default it runs on `stdio://`; use `codex app-server --listen ws://127.0.0.1:4500` when a local WebSocket listener and `/readyz` or `/healthz` probes are useful. Keep the app-server harness optional and configuration-gated, with deterministic static data available for quick rehearsals.

## 2026-05-23: App Server Harness Is Gated But Real

Use `CODEX_HARNESS_MODE=app-server` to route Manager and Operator generation through a real `codex app-server` stdio session. Each request starts an ephemeral read-only thread, asks for JSON constrained by the target schema, and validates the result server-side. Static catalog mode remains the default so rehearsals stay deterministic without runtime fixtures.

## 2026-05-23: Golden Queries Plus Live Custom Questions

Keep the prebuilt Manager golden queries for a quick, reliable demo path, but allow custom Manager questions only in `CODEX_HARNESS_MODE=app-server`. Custom questions must be translated by Codex into the fixed commerce GraphQL schema, validated server-side, executed against the seeded catalog, and persisted as normal Metrics traces.

## 2026-05-23: Runtime Fixtures Are Test-Only

Runtime demo paths should use static raw catalog data or live Codex App Server output. Deterministic fixture harnesses stay in test support, and static visual assets live under `public/static-assets/` instead of being labeled as fixture output.

## 2026-05-23: Public Store And Staff Admin

Use `/` as the real anonymous storefront with fake cart behavior and persona-targeted promotions. Keep `/store` as a compatibility redirect. Use `/admin` as the staff login entry for Manager and Operator.

## 2026-05-23: Rich Commerce GraphQL Data

Seed deterministic fictional London commerce data for customers, addresses, orders, inventory, returns, email events, and promotions. Extend the fixed GraphQL schema beyond products so live Codex questions can target customer/order/promotion context while still validating server-side.

## 2026-05-23: Codex Run Observability

Persist Codex run events in SQLite and show them in the Manager workspace. Treat the event stream as the live/demo observability surface instead of Mission Control replay.

## 2026-05-21: Constrained Generation

Codex may generate GraphQL, campaign proposals, copy, image prompts, and storefront configs, but generated output must validate against schemas and approved component slots. Do not execute arbitrary generated code.

## 2026-05-21: SQLite

Use SQLite for local persistence because it is portable, easy to seed, and suitable for a demo that must resume across sessions.

## 2026-05-22: Lightweight Demo Auth

Use app-native demo login for backend staff accounts only: `manager@demo.com` and `operator@demo.com` authenticate with demo passwords stored as Node `scrypt` hashes in SQLite. Guests use the public storefront without accounts. Persist sessions in SQLite and protect Manager/Operator routes and server actions with role permissions. External auth providers remain deferred to keep the hackathon demo reliable.

## 2026-05-22: Webpack Next Server For SQLite

Run `next dev --webpack` and `next build --webpack` because Next 16 Turbopack currently fails to load Node's built-in `node:sqlite` module in this app.

## 2026-05-22: Storefront Config Drafts Are Validated Before Review

Operator-approved campaign proposals generate storefront configs through the Codex harness, then validate the config schema, campaign linkage, approved section types, and product references before saving to SQLite.

## 2026-05-22: Published Storefront Versions Are Separate From Generated Drafts

Publishing a valid generated storefront config creates a published version row, deactivates the previous active version, and makes the new version the Guest storefront source. Rollback creates a new active version from a prior published version instead of mutating history.
