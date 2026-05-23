# Commerce Copilot Studio Master Plan

## North Star

Commerce Copilot Studio is an eCommerce OS demo for a fictional shop called Atlas & Co. It shows Codex driving the loop from store insight to storefront action: a Store Manager asks metric questions, a Store Operator turns insights into campaigns, and a Guest sees the published storefront.

The hackathon story must satisfy the project rubric: a polished working app, a creative visual wow factor, maintainable open-source-quality code, and a Loom demo that explains the technical idea clearly.

## Shop

- Store: Atlas & Co.
- Positioning: curated lifestyle and gifting goods for home, travel, outdoor, grooming, coffee, tech accessories, apparel basics, and small gifts.
- Main demo act: Father’s Day insight to campaign.
- Second act: Secret Santa seasonal revamp with rewritten copy, new product selection, layout changes, and generated or static visuals.

## Roles

- Store Manager: deep metrics, product insights, saved questions, Codex traces.
- Store Operator: product placement, campaign approval, visual approval, publish and rollback.
- Guest: public storefront preview and version viewing.

## Golden Queries

- What should we promote for Father’s Day based on margin, inventory, and conversion?
- Which products have high inventory but are underexposed on the storefront?
- Why did mobile conversion drop last week?
- What bundle would increase average order value for Father’s Day shoppers?
- Which products should we avoid promoting because of low margin, low stock, or high returns?
- Turn the Father’s Day campaign into a Secret Santa campaign under £50.
- Which products make the best Secret Santa gifts by margin, stock, and giftability?
- Rewrite the landing page for a playful office Secret Santa audience.
- Create a holiday storefront using only products with healthy inventory.
- What changed between the Father’s Day and Secret Santa campaign versions?

## Product Scope

- Back-office mission control for Manager and Operator workflows.
- Fixed GraphQL commerce analytics schema over seeded Atlas & Co. data, with golden queries for the rehearsed path and live Manager questions translated by Codex App Server into validated GraphQL for the real demo path.
- Codex harness for query generation, insight summaries, campaign proposals, storefront configs, copy rewrites, and image prompts.
- Image harness for deterministic static visuals now and live generated assets later.
- Composable storefront renderer using approved sections and style tokens.
- Storefront Time Machine for baseline, Father’s Day, and Secret Santa versions.
- Loom Demo Mode with split-screen command center, live storefront preview, run trace, and replayable workflow.

## Phases

1. Project memory, scaffold, guardrails, seeded domain model, and initial tests.
2. Role auth, persistence, protected routes/actions, and in-app manual.
3. Metrics copilot with GraphQL validation, chart mapping, and saved traces.
4. Father’s Day campaign proposal and storefront config validation.
5. Storefront publishing, rollback, Guest view, and Time Machine.
6. Secret Santa revamp with copy rewrite, product reselection, visual prompts/assets, and seasonal layout.
7. Mission Control Demo Mode, replay run, Loom polish, visual QA, and documentation hardening.

## Build Rules

- Use Tailwind CSS v4 for styling.
- Use latest stable dependencies unless an incompatibility is recorded in `docs/decisions.md`.
- Use static raw catalog data for deterministic quick-demo and Loom replay paths; keep fixtures inside tests.
- Keep golden queries for fast rehearsal, but do not let the demo depend only on mocks: live Codex App Server mode must support custom Manager questions that generate, validate, and execute real GraphQL against seeded commerce data.
- Validate all generated artifacts server-side.
- Never execute arbitrary code from generated output.
- Every phase ends with tests, coverage status, dependency freshness status, audit status, and updated progress notes.
