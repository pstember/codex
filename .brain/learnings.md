# Learnings

## 2026-05-22

- Playwright's npm package may be present while the browser binaries are missing; install the relevant browser when UI verification needs it.
- In this environment, launching Chromium for Playwright requires elevated execution because the macOS sandbox can block Chromium's Mach port registration.
- The Codex in-app browser can connect but may block localhost navigation with `ERR_BLOCKED_BY_CLIENT`; use the Playwright e2e smoke as the fallback verification path.

## 2026-05-23

- Codex App Server JSON schemas must list every key from `properties` in `required`; model-optional fields should be represented as required nullable fields instead of omitted from `required`.
- `/admin/insights` currently answers best when the prompt maps to product promotion/risk, return reasons/rates, conversion outliers, date-scoped order lookup, customer/segment lookup, promotions, email events, or stock positions. Broader strategy, external trends, mutations, and unsupported fields should remain scoped refusals.

## 2026-05-24

- Playwright storefront smoke tests that exercise live App Server generation need longer, semantic waits for saved replay controls instead of `networkidle`; observability streams and server-action redirects can keep the network busy after the useful UI state is ready.
- Codex App Server exposes `modelProvider/capabilities/read` with `imageGeneration: true`; image turns emit `imageGeneration` items with `revisedPrompt`, base64 `result`, and `savedPath` under `$CODEX_HOME/generated_images/`.
- App Server structured-output compatibility checks should recurse through nested object schemas. The storefront failure for `visualAsset.composition.objectPosition` happened because a nested property existed in `properties` but was omitted from that object's `required` array.
- The storefront draft state now mixes validation and approval in one persisted `validationStatus` field (`invalid`, `draft`, `ready`), which avoided a schema migration while still letting UI and publish rules model a real review step.

## 2026-05-24: Playwright Must Own Its Test Server

Do not run storefront e2e smoke tests with `PLAYWRIGHT_REUSE_SERVER=1`. Reusing an existing dev server can point tests at the normal `.data/commerce.db`, which pollutes the operator's real draft/gallery data with generated smoke-test entries. Playwright should always launch its own server with `COMMERCE_DATABASE_PATH=/private/tmp/commerce-copilot-e2e.db`.

## 2026-05-24

- Open-source fixture databases should be regenerated from a script instead of copied from `.data/commerce.db`; the local runtime DB can contain sessions, generated storefront drafts, obsolete campaign proposals, and Codex run logs from smoke tests.
- With local DB compatibility intentionally dropped, `storefront_configs.source_draft_key` should match the code-level `sourceDraftKey` name instead of preserving the old proposal-era `source_proposal_id` column.
