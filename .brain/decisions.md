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

Persist Metrics Copilot traces in SQLite through the same app database used for auth and products. The first Manager action only accepts approved golden questions and refreshes the Manager page after saving.

Rationale: saved traces are central to the demo story, but constraining input keeps generated output deterministic and server-validated while the workflow is still early.

## 2026-05-22 - Operator proposals from saved traces

Generate Operator campaign proposals from persisted Metrics Copilot traces and save the validated proposal back to SQLite for review.

Rationale: this keeps the Manager and Operator roles separated while preserving a traceable handoff from insight to campaign activation.

## 2026-05-22 - Storefront configs from approved proposals

Generate storefront configs only from valid Operator campaign proposals, validate section schema, campaign linkage, and product references server-side, then persist the generated config to SQLite for review.

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

Rationale: the seasonal revamp must be server-validated before persistence or publishing, whether generated from static data or live Codex output.

## 2026-05-22 - Storefront visual assets are validated config data

Storefront configs now carry validated hero visual asset metadata generated through the image harness, with static assets used for deterministic demo runs.

Rationale: Secret Santa needs a visible creative transformation, but visual output should remain traceable, server-validated data rather than ad hoc UI decoration or live generation.

## 2026-05-22 - Guest version previews are explicit query-state

Let the Guest storefront resolve `?version=baseline` or a published version id while `/store` continues to default to the active published version.

Rationale: Time Machine should be demoable from the customer-facing surface without changing publication history, and inactive versions should remain previewable by explicit, auditable URL state.

## 2026-05-23: Codex App Server Demo Path

The app now has a real, configuration-gated Codex App Server path via `CODEX_HARNESS_MODE=app-server`. Keep fixtures for deterministic tests, but use static raw catalog data for rehearsal and App Server mode for hackathon proof that Manager/Operator generation can call live Codex and still validate output server-side.

## 2026-05-23: Real Manager Questions

The hackathon demo should not rely only on canned golden queries. Keep fixtures for tests, but in App Server mode allow custom Manager questions that Codex translates into the fixed commerce GraphQL schema, validates, executes against seeded Atlas data, and saves as normal traces.

## 2026-05-23: Fixtures Are Test-Only

Runtime demo paths should use static raw catalog data or live Codex App Server output. Deterministic campaign/storefront fixtures moved into test support, and runtime hero media is labeled as static assets.

Rationale: the hackathon demo must scale to new products or data without changing generated fixture content, while tests still need stable data.

## 2026-05-23: Codex Run Events Are Append-Only

Persist Codex observability runs separately from metrics traces, with append-only run events ordered by occurrence time and insertion sequence.

Rationale: the UI needs a traceable run-event stream that can later feed replay or live SSE without mutating historical generation events.

## 2026-05-23: Staff Auth Uses Passwords, Guests Stay Public

Seed Manager, Analyst, and Operator as backend staff users, store their demo passwords as Node `scrypt` hashes, and route unauthenticated back-office access to `/admin`. Guests do not have seeded accounts and use the public storefront directly.

Rationale: the demo should model a clearer staff security boundary while keeping the customer storefront frictionless and preserving the lightweight local auth architecture.

## 2026-05-23: Public Store Replaces Mission Control

Use `/` for the real anonymous storefront and keep `/store` as a compatibility redirect. Remove Mission Control and Loom replay as product surfaces.

Rationale: the demo should feel like a real commerce product that can be driven live by a human, with observability around Codex runs instead of a scripted capture checklist.

## 2026-05-23: Frontend Design Skill

Use the project-local `frontend-design` skill for frontend component, page, and app work that needs distinctive, production-grade interface direction.

Rationale: frontend work should avoid generic aesthetics and preserve a clear creative point of view while staying reviewable with the repo.

## 2026-05-23: Insight Analytics Command Center

Treat `/admin/insights` as the portfolio analytics workspace, not a single recommendation report. Keep Codex observability visible in a persistent rail while the main canvas exposes catalog KPIs, all-SKU metrics, opportunity/risk signals, saved-run comparison, and Operator handoff context.

Rationale: the Store Manager role needs credible exploration across the whole catalog, and the demo story depends on showing both business reasoning and the validated Codex run trail at the same time.

## 2026-05-23: Real End-User Product Copy and Clarifying Questions

All product copy must be written for realistic end users, not for the project owner, agents, demos, or hackathon judges. When instructions are unclear or the goal is uncertain, ask clarifying questions before choosing a direction.

Rationale: the app should feel like a real commerce product, and unclear goals can otherwise push the project further in the wrong direction.

## 2026-05-23: Data-Question Workbench

Use `/admin/insights` as the data-question workbench.

Rationale: a production-plausible surface with strict data-only intent gating, generated GraphQL, compact evidence, and live prompt/response traceability is clearer than a temporary test URL.

## 2026-05-23: Backend-Owned Metric Catalog

Keep commerce metric formulas, ranking, row caps, truncation notes, and evidence-pack construction in a backend `commerceMetrics` domain module. Codex may request known metric IDs, sorting, and limits, then phrase the final answer from the compact evidence pack.

Rationale: open business questions need flexible language, but factual calculations must stay deterministic, fixture-backed, and server-validated so answers remain auditable and short enough for reliable Codex turns.

## 2026-05-23: Codex Classifies Test Questions

Let Codex classify every non-empty `/admin/insights` message as either a data query or unsupported before GraphQL generation. Keep the server responsible for validating generated GraphQL, calculating backend metrics, and constraining final answers to supplied evidence.

Rationale: brittle local keyword gates can reject useful business prompts like campaign promotion questions, while server-side validation still preserves the data-only safety boundary.

## 2026-05-23: Secret Santa SMB Mock Data Should Feel Operational

Seed Atlas & Co. with enough office-gifting products, customers, orders, returns, promotions, and email events for `/admin/insights` questions to feel like a real small online retailer instead of a tiny fixture.

Rationale: the demo depends on credible Secret Santa and office-gift analysis, so the data needs seasonal volume, realistic under-£50 SKUs, return noise, campaign engagement, and date-scoped order history while remaining deterministic and server-validated.

## 2026-05-23: Prismatic D20 Visual Direction

Use a modern faceted d20-inspired visual language for the app shell, public storefront, and `/admin/insights` analytics workbench: ink-blue surfaces, prismatic cyan/lime/amber/coral accents, Poppins for headings, and Inter for body text.

Rationale: the previous beige/forest palette felt too muted for the hackathon “wow factor”; the refreshed system keeps the operational density while making the product more vivid and memorable.

## 2026-05-23: Admin Is The Staff Hub

Remove `/manager`, `/test`, `/insights`, and `/operator` as product routes. Keep staff login and post-login navigation on `/admin`, with two large workspace tiles: `/admin/insights` for commerce questions and `/admin/storefront` for storefront management.

Rationale: the old Manager surface and temporary test URL diluted the demo flow; a single admin hub makes the staff path clearer and keeps the insight workbench under a production-plausible route.

## 2026-05-23: Role-Gated Staff Workspaces

Managers can open both staff workspaces, Analysts can only open Insight, and Operators can only open storefront management. Disabled admin tiles stay visible but greyed out, and direct route access redirects back to `/admin?error=forbidden`.

Rationale: the staff hub should communicate available workflows without hiding product structure, while server-side permissions remain the real boundary.

## 2026-05-23: Storefront Visual Adaptation Studio

Use `/admin/storefront` as a chat-led visual adaptation studio where Operators can ask Codex to adapt the storefront for open-ended events such as Halloween or Valentine's Day. Generated drafts are saved as validated storefront configs with event copy, palette tokens, generated hero metadata, and normal publish/rollback/version behavior.

Rationale: event visual changes should be a first-class storefront workflow tied to observability and version history, not a separate mock surface or unvalidated UI decoration.

## 2026-05-23: Staff Shell Has Minimal Global Navigation

Keep staff workspace headers to Store, Admin, and Logout only. Workspace selection stays on `/admin`, and the manual route is removed until there is a real need to recreate it.

Rationale: the demo should keep top-level navigation simple and avoid duplicating workspace choices on every staff page.

## 2026-05-23: Config Workbench Saves To Selected Drafts

The `/admin/storefront` Config workbench uses the selected gallery draft as the save target. A master prompt can regenerate all editable copy at once, but the visual theme remains a draft/selection setting rather than generated copy.

Rationale: Operators need one obvious place to save text changes without losing track of which storefront draft will be published, and visual identity should stay anchored to the selected draft or gallery setting.

## 2026-05-23: Storefront Observability Replays All GPT Work

The `/admin/storefront` observability rail should replay every Codex/GPT generation path on the page, not only the top visual-adaptation stream. Storefront actions persist Codex run events for visual adaptations, hero image regeneration, master text regeneration, and per-section regeneration.

Rationale: Operators need one trustworthy audit surface for what GPT changed, which prompt produced it, what validation happened, and which selected draft received the saved result.

## 2026-05-23: Current Draft Is The Operator Preview

For logged-in storefront staff, generated and manually saved draft copy should become the current working draft on `/admin/storefront` until the Operator publishes it. The comparison surface defaults to active Guest storefront versus current working draft and shows copy diffs side by side.

Rationale: Operators need to edit and judge the draft they just generated without mentally switching between published versions, while still seeing exactly what will change for visitors when they activate it.

## 2026-05-23: Storefront Edit And Compare Are One Workbench

Merge the old Config workbench and Storefront Time Machine surfaces into a single `/admin/storefront` Edit and compare workbench with edit-current-draft and compare-with-active zones.

Rationale: editing, diff review, and publishing are one Operator decision loop. Keeping them in one card reduces navigation friction and makes it clearer that the current draft is the thing being compared before activation.

## 2026-05-24: Storefront Drafts Need Explicit Ready Approval

Keep generated storefront drafts separate from publish-ready drafts by using a three-state lifecycle: `invalid`, `draft`, and `ready`. Publishing requires `ready`, and any material draft edit resets approval back to `draft`.

Rationale: Operators needed a safer review step between editing and going live, and resetting readiness on change keeps approval tied to the exact reviewed content.

## 2026-05-24: One Canonical Hero Crop Contract

Use one canonical storefront hero image contract across generation and rendering: a `storefrontHeroWide` slot with a `14 / 9` aspect ratio, a protected left copy zone, and right-weighted product focus metadata stored on `visualAsset.composition`.

Rationale: the public storefront, admin previews, and Codex-generated hero prompts must agree on the same crop target or generated hero shots will place important content where the live UI trims it away.

## 2026-05-24: Storefront Images Use Codex App Server Image Generation

Use Codex App Server's `imageGeneration` capability for live storefront hero images, then copy the generated PNG into ignored `public/generated-assets/` files and persist that public path in the validated storefront visual asset.

Rationale: the local Codex account can generate images without a project `OPENAI_API_KEY`, and storing only public asset paths plus prompt metadata keeps the storefront renderer simple and traceable.

## 2026-05-24: Product Codex Generation Requires App Server

Use Codex App Server as the required product harness for runtime Codex generation. Static and fixture harnesses stay available for tests and deterministic support, but app routes should fail clearly if App Server is unavailable instead of silently falling back to static output.

Rationale: the demo is now meant to show the real wired App Server experience, with prompt/response observability and server validation, so runtime fallbacks would hide integration failures and make generation traces less trustworthy.

## 2026-05-24: Public Storefront Is A Smart Gift Catalog

Treat `/` as a public smart gift shop with searchable, category-filtered, paginated access to every seeded SKU and a top-menu local cart. Keep `/admin/storefront` and validated `StorefrontConfig` as the source of truth for hero copy, palette, hero asset metadata, section text, and product placements.

Rationale: the public shop should feel like a real dropshippable retail surface without forking Codex-generated storefront logic away from the Operator workflow.

## 2026-05-24: Storefront Admin Optimizes For One Draft Loop

Keep `/admin/storefront` focused on generate draft, tune visual/copy, compare with active, and publish. Hide internal fields and version rollback behind disclosures, remove campaign-approval/product-placement explainer cards, and keep publishing separate from saving edits.

Rationale: Operators should not have to scan duplicate publish/save actions or implementation-shaped config fields during the demo; advanced controls remain available without competing with the main decision loop.

## 2026-05-24: Product Images Are Static Catalog Assets

Store reusable compressed product presentation images under `public/static-assets/products/` and derive each fixture image path from the product id. Keep generated storefront hero images separate in `public/generated-assets/` because hero art is campaign/theme-specific.

Rationale: product-card imagery should persist across every storefront version, while spotlight and event hero visuals should remain adaptable per theme.

## 2026-05-24: Storefront Feature Drops Are Small

Storefront sections that place products are presented to Operators as feature drops, and each drop may include at most three product IDs. The same limit belongs in the Zod schema, App Server JSON schema, and Codex storefront-generation prompts.

Rationale: feature drops should feel intentional and scannable in the demo, and Codex should receive the product-count constraint before server validation enforces it.

Superseded on 2026-05-24: Operator-facing storefront sections now use fixed merchandising roles instead of feature-drop labels.

## 2026-05-24: Storefront Sections Have Fixed Merchandising Roles

Every generated storefront config must contain exactly three configured sections in this order: Hero product, Current offer, and Spotlight. All products remains a renderer-owned catalog section on the public storefront and is represented in admin as fixed, non-removable catalog behavior.

Rationale: fixed section roles make Codex output easier to validate, give Operators the same language shoppers see, and keep Spotlight as the single selected-product emphasis while Current offer carries the active campaign or promotion.

## 2026-05-24: Admin Observability Is A Removable Demo Shell

Use one shared admin observability rail shell for `/admin/insights` and `/admin/storefront`, with page-specific trace content passed in as children.

Rationale: Codex observability is useful for the demo story, but it should not define the core workspace layout. A shared shell keeps collapse/reopen behavior consistent and makes the demo layer easy to remove later.

## 2026-05-25: Admin Observability Docks Outside The Page

Treat admin observability as an app-level right dock with independent scrolling. The open dock reserves a full-width column, the collapsed handle reserves a narrow column, and page content should not sit underneath either state.

Rationale: trace review should behave like browser dev tooling: useful when open, easy to collapse, and isolated from the page's own scroll behavior.

## 2026-05-24: Storefront Preview Is Staff-Session Scoped

Keep `Preview for me` as a signed-in storefront-staff session override and `Publish for everyone` as the only action that changes the active visitor storefront. Model `Basic Atlas & Co.` as a virtual, non-deletable gallery entry derived from `baselineStorefront`, and publish it through the normal version-history path when it should become live.

Rationale: Operators need a reliable personal preview and a permanent recovery point without mutating draft history or surprising anonymous shoppers.

## 2026-05-24: Storefront Admin Uses A Full-Width Brand Kit

Keep `/admin/storefront` visually organized around a dark Event storefront studio, horizontal style gallery, and asymmetric Edit and compare workbench. The palette editor is a full-width Brand kit inside the studio, with primary swatches and advanced tokens visible by default instead of hidden in a narrow side rail.

Rationale: Operators need color decisions to feel visual and central to the storefront adaptation workflow, not like a cramped technical appendix under the preview.

## 2026-05-24: Storefront Adaptation Is The Only Merchandising Workflow

Remove the seasonal campaign proposal/revamp flow and remove shopper-facing cart promotion pricing. Keep one Operator flow: adapt the storefront for an event or theme, validate it, preview it, publish it, and compare versions.

Rationale: the previous campaign and cart-promotion layers added hidden rules and maintenance cost without a matching management surface.

## 2026-05-24: SQLite Stores Runtime State Only

Remove duplicated analytics fixture persistence, legacy metrics traces, and campaign proposals from the SQLite schema. Keep TypeScript fixtures as the analytics source of truth, and generate a clean packaged `fixtures/commerce.db` with demo users via `npm run db:fixture`.

Rationale: the local runtime database had accumulated sessions, generated drafts, old proposal rows, and Codex event logs, which made it risky fixture material. A narrow schema plus reproducible fixture build keeps the open-source package cleaner.
