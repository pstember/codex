# User Manual

## Public Storefront

The Public Storefront at `/` is the shopper-facing Atlas & Co. experience. Visitors can browse the active published storefront, search the full product catalog, filter by category, paginate products, and use the local cart.

The storefront combines two sources:

- The active published `StorefrontConfig` controls hero copy, palette, hero image, and curated sections.
- TypeScript product fixtures provide the full searchable catalog.

`/store` redirects to `/` for compatibility.

## Staff Admin

Staff start at `/admin`.

- Manager: can use Insight and Storefront Studio.
- Analyst: can use Insight only.
- Operator: can use Storefront Studio only.
- Guest: anonymous storefront visitor, no account.

Demo credentials are local-only and shown on the login page only when `DEMO_SHOW_CREDENTIALS=true`.

## Insight

Insight at `/admin/insights` is the commerce analytics workspace.

1. Enter a commerce data question.
2. Codex classifies whether the question is answerable from the seeded data.
3. Codex proposes GraphQL for the fixed commerce schema.
4. The server validates and executes the query.
5. The server builds compact evidence and deterministic metric calculations.
6. Codex writes a final answer using only that evidence.
7. The observability rail shows prompt, response, validation, execution, and evidence steps.

While Codex is working, Insight shows a compact generation animation in the response area and trace rail so staff can tell the run is still active.

Good questions include product promotion, stock risk, return reasons, conversion outliers, customer segments, email performance, order dates, and stock positions.

Unsupported questions should receive a scoped refusal rather than an invented answer.

## Storefront Studio

Storefront Studio at `/admin/storefront` is the Operator workflow for event storefronts.

1. Enter an event or seasonal brief.
2. Codex generates an event draft with copy, palette, product placement, and hero-image direction.
3. The image harness requests a hero image through Codex App Server and stores validated local asset metadata.
4. The server validates storefront structure, section order, product references, palette values, and visual metadata.
5. Staff can edit copy, change palette tokens, regenerate text or image blocks, and compare the current draft with the active storefront.
6. Staff can use `Preview for me` for a session-scoped private preview.
7. A valid draft must be marked ready before it can be published.
8. Publishing creates a new active published version and keeps prior versions available in version history.

While Codex is working, Storefront Studio shows the shared generation animation near the draft controls and in the trace rail until run events arrive.

The fixed storefront roles are:

- Hero product
- Current offer
- Spotlight
- All products, which is renderer-owned and always available in the public catalog

## Demo Data And Runtime State

Fixture data lives in TypeScript files under `src/fixtures/` and represents the analytics source of truth: products, customers, orders, inventory, returns, email events, promotions, and baseline storefronts.

SQLite stores runtime state only:

- Demo staff users
- Sessions
- Storefront drafts
- Published storefront versions
- Codex run events

Local generated assets and `.data/commerce.db` are ignored runtime output.
