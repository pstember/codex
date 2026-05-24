# Commerce Copilot Studio Master Plan

## North Star

Commerce Copilot Studio is an eCommerce OS demo for a fictional shop called Atlas & Co. It shows Codex driving the loop from store insight to storefront action: a Store Manager asks metric questions, a Store Operator adapts the storefront, and a Guest sees the published storefront.

The hackathon story must satisfy the project rubric: a polished working app, a creative visual wow factor, maintainable open-source-quality code, and a live demo that explains the technical idea clearly.

## Shop

- Store: Atlas & Co.
- Positioning: curated lifestyle and gifting goods for home, travel, outdoor, grooming, coffee, tech accessories, apparel basics, and small gifts.
- Main demo act: insight to storefront adaptation.
- Second act: open event storefront adaptation with rewritten copy, validated palette changes, saved generated hero metadata, and visitor-selectable published versions.

## Roles

- Store Manager: deep metrics, product insights, saved questions, Codex traces.
- Store Analyst: product insights and Codex traces without storefront publishing access.
- Store Operator: storefront adaptation, visual approval, publish and rollback.
- Guest: anonymous public storefront browsing, fake cart interaction, and published storefront updates.

## Golden Queries

- What should we feature next based on margin, inventory, and conversion?
- Which products have high inventory but are underexposed on the storefront?
- Why did mobile conversion drop last week?
- What bundle would increase average order value for Father’s Day shoppers?
- Which products should we avoid promoting because of low margin, low stock, or high returns?
- Which products make the best event-ready gifts by margin, stock, and giftability?
- Rewrite the landing page for a playful office gifting audience.
- Create a holiday storefront using only products with healthy inventory.
- What changed between the baseline and the latest storefront version?

## Product Scope

- Public storefront at `/` with anonymous cart behavior and published storefront versions.
- Staff back office at `/admin` for Manager, Analyst, and Operator workflows, with `/admin/insights` and `/admin/storefront` as role-gated workspaces.
- Fixed GraphQL commerce analytics schema over seeded Atlas & Co. product, customer, order, inventory, return, marketing, and promotion data, with golden queries for the rehearsed path and live Manager questions translated by Codex App Server into validated GraphQL for the real demo path.
- Codex observability window that streams and persists run events for generated storefront work.
- Codex harness for query generation, insight answers, storefront event adaptations, copy rewrites, palettes, and image prompts.
- Image harness for deterministic static visuals in tests and live generated assets for event storefronts.
- Composable storefront renderer using approved style tokens plus fixed Hero product, Current offer, Spotlight, and All products merchandising sections.
- Storefront Time Machine for baseline, Father’s Day, and Secret Santa versions inside the Operator workspace.

## Phases

1. Project memory, scaffold, guardrails, seeded domain model, and initial tests.
2. Role auth, persistence, and protected routes/actions.
3. Insight workbench with GraphQL validation, metric evidence, and streamed Codex traceability.
4. Generic event storefront draft generation and storefront config validation.
5. Storefront publishing, rollback, Guest view, and Time Machine.
6. Secret Santa revamp with copy rewrite, product reselection, visual prompts/assets, and seasonal layout.
7. Real-experience polish: storefront cart, staff admin, Codex observability, richer data, visual QA, and documentation hardening.

## Build Rules

- Use Tailwind CSS v4 for styling.
- Use latest stable dependencies unless an incompatibility is recorded in `docs/decisions.md`.
- Use deterministic seeded commerce data for rehearsals and human demo retries; keep generated fixture harnesses inside tests.
- Keep golden queries for fast rehearsal, but do not let the demo depend only on mocks: live Codex App Server mode must support custom Manager questions that generate, validate, and execute real GraphQL against seeded commerce data.
- Keep TypeScript fixture data as the analytics source of truth. SQLite stores auth, storefront drafts/versions, and Codex run events; packaged fixture databases are generated with `npm run db:fixture` and must not contain sessions or runtime traces.
- Validate all generated artifacts server-side.
- Never execute arbitrary code from generated output.
- Every phase ends with tests, coverage status, dependency freshness status, audit status, and updated progress notes.
