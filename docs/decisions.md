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

Use `CODEX_HARNESS_MODE=app-server` to route Manager and Operator generation through a real `codex app-server` stdio session. Each request starts an ephemeral read-only thread, asks for JSON constrained by the target schema, and validates the result server-side.

Superseded on 2026-05-24: runtime Codex generation now always uses the App Server harness. Static and fixture harnesses remain for tests only.

## 2026-05-24: App Server Harness Is Required For Runtime Generation

All product Codex generation must use `codex app-server` through the App Server harness. If App Server is unavailable, generation should fail visibly instead of falling back to static catalog output.

This keeps the demo honest: prompts, raw responses, validated JSON, and image-harness metadata can be replayed in the Operator observability surface.

## 2026-05-24: Storefront Hero Images Use App Server Image Generation

Storefront editor hero regeneration uses Codex App Server's image-generation capability. The image harness asks App Server for one hero image, copies the saved PNG from `$CODEX_HOME/generated_images/` into ignored `public/generated-assets/`, and persists the public path in storefront visual asset metadata.

This avoids requiring a project `OPENAI_API_KEY` for the hackathon demo while still producing real generated images that the public storefront can render.

## 2026-05-23: Golden Queries Plus Live Custom Questions

Keep prebuilt Manager-style questions for rehearsal, but support custom Insight questions through the App Server path. Custom questions must be translated by Codex into the fixed commerce GraphQL schema, validated server-side, executed against the seeded catalog, and shown with streamed observability events rather than persisted metrics traces.

## 2026-05-23: Runtime Fixtures Are Test-Only

Runtime demo paths should use static raw catalog data or live Codex App Server output. Deterministic fixture harnesses stay in test support, and static visual assets live under `public/static-assets/` instead of being labeled as fixture output.

## 2026-05-23: Public Store And Staff Admin

Use `/` as the real anonymous storefront with fake cart behavior and persona-targeted promotions. Keep `/store` as a compatibility redirect. Use `/admin` as the staff login entry for Manager, Analyst, and Operator.

## 2026-05-23: Admin Workspace Menu

Keep staff login and post-login navigation on `/admin`. Remove `/manager`, `/test`, `/insights`, and `/operator` as product routes; use `/admin/insights` for the data-question workbench and `/admin/storefront` for storefront management. Disable greyed-out admin workspace buttons when the signed-in role lacks access.

## 2026-05-23: Staff Role Matrix

Managers can access both Insight and storefront management, Analysts can access only Insight, Operators can access only storefront management, and Guests remain anonymous storefront visitors.

## 2026-05-23: Rich Commerce GraphQL Data

Seed deterministic fictional London commerce data for customers, addresses, orders, inventory, returns, email events, and promotions. Extend the fixed GraphQL schema beyond products so live Codex questions can target customer/order/promotion context while still validating server-side.

## 2026-05-23: Codex Run Observability

Persist Codex run events in SQLite and show them in the Manager workspace. Treat the event stream as the live/demo observability surface instead of Mission Control replay.

## 2026-05-23: Storefront Visual Adaptation Studio

Use `/admin/storefront` for open-ended event visual adaptation. Codex can generate event copy, palette data, section structure, and image prompts/metadata, but the app saves the result as a validated storefront config so publishing, rollback, visitor preview, and Time Machine keep one version model.

## 2026-05-24: Fixed Storefront Merchandising Roles

Storefront configs must use exactly three configured section intents in order: Hero product, Current offer, and Spotlight. Current offer carries the active campaign or promotion, Spotlight owns the selected-product emphasis, and All products stays as the renderer-owned searchable catalog section.

This keeps Codex generation constrained to stable merchandising slots while making `/admin/storefront` use the same section language that shoppers see.

## 2026-05-21: Constrained Generation

Codex may generate GraphQL, storefront adaptation configs, copy, image prompts, and image metadata, but generated output must validate against schemas and approved component slots. Do not execute arbitrary generated code.

## 2026-05-21: SQLite

Use SQLite for local persistence because it is portable, easy to seed, and suitable for a demo that must resume across sessions.

## 2026-05-22: Lightweight Demo Auth

Use app-native demo login for backend staff accounts only: `manager@demo.com`, `analyst@demo.com`, and `operator@demo.com` authenticate with demo passwords stored as Node `scrypt` hashes in SQLite. Guests use the public storefront without accounts. Persist sessions in SQLite and protect staff routes and server actions with role permissions. External auth providers remain deferred to keep the hackathon demo reliable.

## 2026-05-22: Webpack Next Server For SQLite

Run `next dev --webpack` and `next build --webpack` because Next 16 Turbopack currently fails to load Node's built-in `node:sqlite` module in this app.

## 2026-05-22: Storefront Config Drafts Are Validated Before Review

Operator event prompts generate storefront configs through the Codex harness, then validate the config schema, approved section types, and product references before saving to SQLite.

## 2026-05-22: Published Storefront Versions Are Separate From Generated Drafts

Publishing a valid generated storefront config creates a published version row, deactivates the previous active version, and makes the new version the Guest storefront source. Rollback creates a new active version from a prior published version instead of mutating history.

## 2026-05-24: Remove Campaign Proposals And Shopper Promo Pricing

Use `/admin/storefront` as the only merchandising workflow. Operators now create generic event or theme drafts directly, while the public storefront cart totals items without shopper-targeted promotion pricing.

Promotion records may remain in seeded analytics data for reporting questions, but they no longer participate in shopper pricing or require a separate approval workflow.

## 2026-05-24: Narrow SQLite Persistence And Fixture Database

SQLite stores only runtime state that the app actually reads: demo users, sessions, storefront drafts, published versions, and Codex run events. Product, customer, order, return, email, inventory, and promotion analytics remain TypeScript fixture data because `/admin/insights` and GraphQL execute directly against those fixtures.

Use `npm run db:fixture` to generate the tracked clean fixture database. Keep `.data/commerce.db` and `public/generated-assets/` ignored as local runtime output; do not package session history, generated drafts, old proposal rows, or Codex trace logs as fixtures.
