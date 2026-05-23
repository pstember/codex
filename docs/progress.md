# Progress

## Current Phase

Foundation and demo auth are complete. Current phase: Phase 1, Metrics Copilot with GraphQL validation, chart mapping, saved traces, Operator handoff, static-data campaign proposal generation, validated storefront config generation, publishing controls, Guest rendering, rollback groundwork, Storefront Time Machine comparison, Secret Santa visual prompts/assets, richer seasonal comparison, explicit Guest version selection, Mission Control Demo Mode replay polish, Loom capture hardening, and real Codex App Server custom-query support.

## Completed

- Created project memory docs.
- Updated `AGENTS.md` with session start docs and non-negotiables.
- Initialized the local git repository on `main` and configured `origin` as `https://github.com/pstember/codex.git`.
- Added initial TypeScript/Next.js scaffold files.
- Added seeded Atlas & Co. fixtures and harness contracts.
- Added initial SQLite persistence module backed by Node's built-in `node:sqlite`.
- Added initial tests for roles, Codex fixtures, campaign outputs, and storefront validation.
- Installed latest stable project dependencies via npm.
- Added Tailwind CSS v4, Biome, strict TypeScript, Vitest coverage, Playwright config, dependency freshness, and audit scripts.
- Added seeded demo users for Store Manager, Store Operator, and Guest.
- Added SQLite-backed sessions and demo auth service.
- Added protected Manager and Operator routes plus a public Guest storefront route.
- Added server actions for login, logout, and role-protected placeholder operations.
- Added an in-app manual route with demo account guidance.
- Added Phase 1 tests for login, session expiry, role authorization, user/session persistence, and SQLite-backed auth lookup.
- Started the Metrics Copilot workflow with a server-side `answerMetricsQuestion` entry point.
- Added fixed commerce GraphQL schema validation for generated analytics queries.
- Rendered the Father’s Day golden question, Codex trace status, chart mapping, recommendations, and risk exclusions on the Manager page.
- Added SQLite persistence for Metrics Copilot traces.
- Added a Manager `Run analysis` action that saves an approved golden-query trace and refreshes the saved-runs panel.
- Expanded the Manager Metrics Copilot form to the five approved metric golden questions.
- Added saved-run detail rendering with generated GraphQL, validation status/errors, rationale, recommended products, and timestamp.
- Switched local Next dev/build scripts to webpack because Turbopack currently fails to load `node:sqlite`.
- Added Metrics Copilot chart/data-result mapping for product-table and funnel answers.
- Updated the Manager page to render chart-ready rows from the answer shape and added a saved-run comparison panel.
- Installed the Playwright Chromium browser for local UI smoke verification when relevant.
- Added Metrics Copilot Operator handoff output with campaign season, proposal prompt, selected product IDs, and risk exclusions.
- Reworked the Manager saved-run comparison into a visual status-and-inventory view backed by a tested domain comparison model.
- Added the first deterministic Operator campaign proposal flow from a saved Metrics Copilot trace.
- Added SQLite persistence for validated Operator campaign proposals.
- Added an Operator page handoff picker, campaign proposal generator action, and proposal review panel.
- Added a Playwright e2e smoke for the Manager saved-run to Operator proposal path.
- Added a tested Operator storefront config generation flow from valid campaign proposals.
- Added server-side storefront config validation for schema, campaign linkage, approved sections, and product references.
- Added SQLite persistence for generated storefront configs.
- Updated the Operator page so a valid proposal can be approved into a validated storefront config and reviewed by section.
- Extended the Playwright e2e smoke through proposal approval and storefront config rendering.
- Added a tested storefront publishing domain model with valid-config enforcement and rollback version creation.
- Added SQLite persistence for published storefront versions, active-version tracking, and inactive rollback targets.
- Added Operator publish controls and a Storefront Time Machine panel with active-version status and rollback actions for inactive versions.
- Updated the Guest storefront to render the active published version with baseline fallback and product placement details.
- Extended the Playwright e2e smoke through publishing and Guest storefront rendering.
- Expanded Storefront Time Machine with baseline/published version selectors and a tested comparison model for campaign, style, section, and product deltas.
- Extended the Playwright e2e smoke to assert the visible Time Machine comparison panel after publishing.
- Added an Operator revamp workflow that rewrites a valid Father’s Day proposal into a Secret Santa proposal.
- Added server-side validation that Secret Santa campaign proposals and storefront configs only include products priced at £50 or below.
- Added an Operator `Revamp for Secret Santa` action and extended the Playwright smoke through Father’s Day publish, Secret Santa revamp, seasonal storefront config generation, publish, and Guest rendering.
- Allowed `127.0.0.1` as a Next dev origin for local Playwright runs.
- Added validated storefront visual asset metadata with static hero assets for baseline, Father’s Day, and Secret Santa storefronts.
- Wired storefront generation to use the image harness for campaign hero assets and backfill legacy persisted storefront versions without visual metadata.
- Rendered hero visual previews and prompts in Operator review, static hero visuals on Guest, and a richer Time Machine strategic readout for hero copy and creative asset changes.
- Extended the Playwright smoke to assert the new visual prompt/readout during the Father’s Day to Secret Santa workflow.
- Added explicit Guest version selection on the public storefront using `?version=baseline` or a published version id, including inactive version previews without changing publication history.
- Extended the Playwright smoke so Guest selects the inactive Father’s Day version after Secret Santa is active.
- Removed Mission Control replay as the main demo surface so the app opens on the real public storefront.
- Added a real, configuration-gated Codex App Server harness path using `CODEX_HARNESS_MODE=app-server`, `codex app-server` stdio, ephemeral read-only threads, JSON-schema-constrained turns, and server-side validation before app persistence/rendering.
- Added a live custom Manager question path for App Server mode while preserving golden queries over static catalog data for fast rehearsal. Custom questions are translated by Codex into the fixed GraphQL schema, validated, executed against the seeded Atlas catalog, rendered from real query results, and saved as normal Metrics traces.
- Moved deterministic Codex campaign/storefront fixtures into test support, changed the default runtime harness to static catalog derivation, and relabeled runtime hero media as static assets under `public/static-assets/`.
- Added anonymous storefront cart domain operations with persona-aware promotion pricing for demo-only carts.
- Added the Codex observability run-event foundation with persisted `codex_runs`, append-only `codex_run_events`, terminal summaries, and a basic SSE route for persisted run events.
- Added staff password auth for Manager and Operator, removed the seeded Guest account, added `/admin`, routed unauthenticated back-office access there, and kept Guests on the public storefront.
- Added deterministic London commerce source data for customers, addresses, orders, stock positions, returns, email events, and promotions.
- Expanded commerce GraphQL to validate and execute `customers`, `orders`, and `promotions` queries in addition to products.
- Moved the public storefront to `/`, kept `/store` as a compatibility redirect, and added a demo persona cart UI with targeted promotion totals.
- Added a Manager Codex live window backed by persisted run events for prompt/schema/generation/validation/query/save stages.

## Test Status

- `npm run typecheck`: passing.
- `npm run lint`: passing.
- `npm test`: passing, 15 files and 64 tests.
- `npm run coverage`: passing at 91.8% statements, 91.72% lines, 97.25% functions, and 85.71% branches.
- `npm run build`: passing with `next build --webpack`.
- Playwright e2e smoke: passing after sandbox escalation for `/admin` Manager login, saved-run creation with Codex live-window events, Operator login, handoff selection, Father’s Day proposal/config/publish, Secret Santa revamp/config/publish, root storefront rendering, inactive version preview, and anonymous cart interaction. The sandboxed attempt failed because the Next test server could not bind to `0.0.0.0:3000`; Playwright now uses a throwaway SQLite file under `/private/tmp` for isolated browser runs.
- Live Codex App Server smoke: passed after sandbox escalation; a direct `codex app-server` stdio turn returned `{"ok":true,"source":"codex-app-server"}`. The first sandboxed attempt failed because Codex could not write its normal state under `~/.codex`.
- Live custom query App Server smoke: passed after sandbox escalation; Codex translated “Which under £50 products have the best margin and enough inventory?” into a valid `products(filter: { maxPrice: 50 })` GraphQL query with product fields.
- Focused anonymous cart promotions test: passing for add/update/remove operations and coffee-regulars Father’s Day promotion pricing.
- Focused Codex run events test: passing for persisted ordering and terminal summary.
- Scoped Biome check for Codex run files: passing.
- Focused auth/database tests: passing for staff password login, failed login rejection, no Guest account, password hashes, sessions, and role permission boundaries.
- Scoped Biome check for auth/admin files: passing.
- Focused rich commerce data/GraphQL tests: passing for relationship integrity, SQLite seed counts, and customer/order/promotion GraphQL execution.
- Integrated lint, typecheck, and unit test suite: passing after the refocus.
- `npm run build`: passing with `next build --webpack` after the route refocus.
- `npm run coverage`: passing at 91.39% statements, 91.48% lines, 96.49% functions, and 80% branches.

## Dependency Status

- `npm run deps:outdated`: passing with no outdated dependencies reported.
- npm itself reports a newer minor global version, but global tooling was not changed.

## Security Status

- `npm run security:audit`: completed with 2 moderate advisories from Next's nested PostCSS dependency and exits non-zero because no safe current fix is available.
- The suggested force fix would downgrade Next to 9.3.3, so remediation is deferred and documented in `docs/security.md`.

## Known Gaps

- Codex App Server is available locally through `codex app-server`, and the app includes a configuration-gated `stdio://` adapter for real Manager/Operator generation with validated JSON output.
- UI is functional for public storefront/cart, staff auth/navigation, Manager Metrics Copilot, Codex run observability, and Operator publishing.
- Login failure redirects to `/admin?error=invalid` and renders an inline staff auth error.
- Phase 1 auth is demo-grade and intentionally not a production auth provider.
- Metrics Copilot traces persist for the approved Manager metric questions, with trace detail drilldown and saved-run comparison now available.
- `/` now renders the active published version with baseline fallback, static hero visuals, explicit baseline/published-version selection, anonymous cart behavior, and persona-targeted promotion pricing; `/store` redirects to `/`.
- Operator campaign proposals can be generated and reviewed, valid proposals can be revamped into Secret Santa, valid proposals can generate validated storefront configs, and valid configs can be published; rollback groundwork exists through published version history and Operator rollback actions.
- Mission Control/Loom replay has been removed from the product surface in favor of human-driven demo flow and Codex observability inside the Manager workspace.

## Next Recommended Task

Human testing of the live public-store to `/admin` to Manager/Operator publish path.
