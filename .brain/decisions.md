# Decisions

## 2026-05-21 - Project foundation

Use `AGENTS.md` as the canonical agent guide and `.brain/` as project memory.

Rationale: the project is starting from scratch, so durable collaboration context matters before product or stack choices are made.

## 2026-05-21 - Project-local skills

Keep skills under `.codex/skills/` instead of installing them globally.

Rationale: project-local skills make the working style portable and reviewable with the repo.

## 2026-05-21 - Test-first quality bar

Adopt a behavioral TDD skill that combines Red-Green-Refactor with KISS and DRY.

Rationale: tests should describe observable behavior, implementation should start simple, and refactoring should remove duplication once behavior is protected.

## 2026-05-22 - Metrics Copilot service boundary

Start Metrics Copilot as a server-side domain entry point, `answerMetricsQuestion`, that accepts a Codex harness and seeded products, validates generated GraphQL against a fixed commerce schema, and returns trace, chart, insight, and product recommendations.

Rationale: keeping the workflow behind a small domain service makes it testable before adding UI input, persistence, or live Codex integrations.

## 2026-05-22 - Metrics chart mapping lives in the domain

Map Metrics Copilot answer data into chart-ready rows and columns inside `answerMetricsQuestion`, then let the Manager UI render that public answer shape.

Rationale: chart/data-result mapping is durable product behavior, so it should be tested at the domain boundary and kept out of ad hoc page markup.

## 2026-05-22 - Metrics handoff data stays with the answer

Attach Operator handoff data and saved-run comparison rows to the Metrics Copilot domain answer instead of deriving campaign intent in page markup.

Rationale: the Manager-to-Operator handoff is durable product behavior, and keeping it in the domain makes it testable before the Operator campaign proposal flow is fully built.

## 2026-05-22 - Metrics traces in SQLite

Persist Metrics Copilot traces in SQLite through the same app database used for auth and products. The first Manager action only accepts approved fixture-backed questions and refreshes the Manager page after saving.

Rationale: saved traces are central to the demo story, but constraining input keeps generated output deterministic and server-validated while the workflow is still early.

## 2026-05-22 - Operator proposals from saved traces

Generate Operator campaign proposals from persisted Metrics Copilot traces and save the validated proposal back to SQLite for review.

Rationale: this keeps the Manager and Operator roles separated while preserving a traceable handoff from insight to campaign activation.

## 2026-05-22 - Storefront configs from approved proposals

Generate fixture-backed storefront configs only from valid Operator campaign proposals, validate section schema, campaign linkage, and product references server-side, then persist the generated config to SQLite for review.

Rationale: the storefront step must stay traceable and constrained before publishing exists, while still proving Codex can turn an approved campaign into renderable storefront structure.

## 2026-05-22 - Published storefront versions

Keep generated storefront configs as reviewable drafts and create separate published version records for Guest rendering. Publishing a valid draft deactivates the previous active version; rollback creates a new active version from a prior published version.

Rationale: version history should remain auditable and Time Machine-ready, while the Guest storefront has one clear active source.

## 2026-05-22 - Commit completed slices as checkpoints

Commit completed, tested slices as work progresses instead of letting large unstaged diffs accumulate.

Rationale: frequent checkpoints make it easier to inspect, bisect, or revert a specific change without discarding later useful work.

## 2026-05-22 - Webpack Next server for SQLite

Use `next dev --webpack` and `next build --webpack` while the app depends on Node's built-in `node:sqlite`.

Rationale: Next 16 Turbopack currently fails to load `node:sqlite` in this app, while the deterministic local demo needs SQLite persistence available during development and builds.

## 2026-05-22 - Secret Santa price limit validation

Enforce the under-£50 Secret Santa constraint at both campaign proposal validation and storefront config validation.

Rationale: the seasonal revamp is fixture-backed for now, but generated output must still be server-validated before persistence or publishing.

## 2026-05-22 - Storefront visual assets are validated config data

Storefront configs now carry validated hero visual asset metadata generated through the image harness, with fixture assets used for deterministic demo runs.

Rationale: Secret Santa needs a visible creative transformation, but visual output should remain traceable, server-validated data rather than ad hoc UI decoration or live generation.

## 2026-05-22 - Guest version previews are explicit query-state

Let the Guest storefront resolve `?version=baseline` or a published version id while `/store` continues to default to the active published version.

Rationale: Time Machine should be demoable from the customer-facing surface without changing publication history, and inactive versions should remain previewable by explicit, auditable URL state.
## 2026-05-23: Codex App Server Demo Path

The app now has a real, configuration-gated Codex App Server path via `CODEX_HARNESS_MODE=app-server`. Keep fixtures as the default for deterministic tests and rehearsal, but use the App Server mode for hackathon proof that Manager/Operator generation can call live Codex and still validate output server-side.
