# Progress

## Current Phase

Foundation and demo auth are complete. Current phase: Phase 1, Metrics Copilot with GraphQL validation, chart mapping, saved traces, Operator handoff, fixture-backed campaign proposal generation, and fixture-backed storefront config generation.

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
- Added the first fixture-backed Operator campaign proposal flow from a saved Metrics Copilot trace.
- Added SQLite persistence for validated Operator campaign proposals.
- Added an Operator page handoff picker, campaign proposal generator action, and proposal review panel.
- Added a Playwright e2e smoke for the Manager saved-run to Operator proposal path.
- Added a tested Operator storefront config generation flow from valid campaign proposals.
- Added server-side storefront config validation for schema, campaign linkage, approved sections, and product references.
- Added SQLite persistence for generated storefront configs.
- Updated the Operator page so a valid proposal can be approved into a fixture-backed storefront config and reviewed by section.
- Extended the Playwright e2e smoke through proposal approval and storefront config rendering.

## Test Status

- `npm run typecheck`: passing.
- `npm run lint`: passing.
- `npm test`: passing, 10 files and 36 tests.
- `npm run coverage`: passing, 89.88% statements, 90.2% lines, and 80% branches.
- `npm run build`: passing with `next build --webpack`.
- Playwright e2e smoke: passing for Manager login, saved-run creation, Operator login, handoff selection, fixture-backed proposal generation, proposal approval, and storefront config rendering.

## Dependency Status

- `npm run deps:outdated`: passing with no outdated dependencies reported.
- npm itself reports a newer minor global version, but global tooling was not changed.

## Security Status

- `npm run security:audit`: completed with 2 moderate advisories from Next's nested PostCSS dependency.
- The suggested force fix would downgrade Next to 9.3.3, so remediation is deferred and documented in `docs/security.md`.

## Known Gaps

- Codex App Server is available locally through `codex app-server`, but the app adapter remains stubbed and configuration-gated for future integration.
- UI is functional for auth/navigation and the first Manager Metrics Copilot slice, but not the final mission-control experience.
- Login failure currently redirects back home without a visible inline error.
- Phase 1 auth is demo-grade and intentionally not a production auth provider.
- Metrics Copilot traces persist for the approved Manager metric questions, with trace detail drilldown and saved-run comparison now available.
- Storefront remains baseline only; campaign publishing and Time Machine are future phases.
- Operator campaign proposals can be generated and reviewed, and valid proposals can now generate validated storefront configs; publishing, rollback, Guest version selection, and Time Machine remain future phases.

## Next Recommended Task

Continue Phase 1 by connecting validated Operator storefront configs to publishing controls, Guest storefront version rendering, and rollback/Time Machine groundwork.
