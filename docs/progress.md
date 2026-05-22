# Progress

## Current Phase

Foundation and demo auth are complete. Current phase: Phase 1, Metrics Copilot with GraphQL validation, chart mapping, saved traces, and fixture-backed Codex query generation.

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

## Test Status

- `npm run typecheck`: passing.
- `npm run lint`: passing.
- `npm test`: passing, 8 files and 24 tests.
- `npm run coverage`: passing, 85.18% lines and 85.61% statements.
- `npm run build`: passing.
- Browser smoke test: passing for Manager Metrics Copilot content and saved-run creation at `http://localhost:3000/manager`.

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
- Metrics Copilot traces persist, but there is only one approved question and no saved-run detail drilldown yet.
- Storefront remains baseline only; campaign publishing and Time Machine are future phases.

## Next Recommended Task

Continue Phase 1 by expanding the Manager question form to the remaining approved golden queries and rendering per-run trace details.
