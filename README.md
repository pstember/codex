# Commerce Copilot Studio

Commerce Copilot Studio is an open-source ecommerce demo showing how Codex can help a retail team move from data insight to storefront action.

The fictional shop is Atlas & Co., a curated gift and lifestyle store. Staff can ask commerce questions in natural language, inspect the validated evidence trail, and then use Codex to create seasonal or event-specific storefront drafts with adapted copy, product placement, palette choices, and generated hero-image metadata.

## What It Demonstrates

- **Insight for ecommerce operators:** Codex translates staff questions into a fixed GraphQL commerce schema, the server validates the query, executes it against seeded data, and asks Codex to answer only from supplied evidence.
- **Faster temporary storefront creation:** Storefront Studio turns an event prompt such as `Halloween storefront for cosy office gifts` into a reviewable event draft.
- **Human approval before publishing:** Operators can edit copy, tune the brand kit, regenerate hero imagery, preview privately, mark a draft ready, and publish a version for visitors.
- **Traceable AI work:** Codex run events expose prompts, responses, validation steps, and saved draft activity in the staff observability rail.
- **Constrained generation:** Generated GraphQL, storefront config, image metadata, and product references are validated server-side. Generated output is never executed as code.

## Quickstart

```sh
npm install
npm run db:fixture
DEMO_SHOW_CREDENTIALS=true npm run dev
```

Open:

- Public Storefront: <http://127.0.0.1:3000/>
- Staff Admin: <http://127.0.0.1:3000/admin>

The local demo expects the Codex CLI to be authenticated and able to run `codex app-server` for live generation. See [Quickstart](docs/quickstart.md) for setup and troubleshooting.

## Demo Flow

1. Browse the Public Storefront and add a product to the local cart.
2. Open Staff Admin and sign in as a Manager.
3. Open Insight and ask a commerce question, such as `Which products should we avoid promoting because of low margin, low stock, or high returns?`
4. Review the generated GraphQL, evidence, and Codex run events.
5. Sign in as an Operator and open Storefront Studio.
6. Generate an event draft, review copy/palette/product choices, preview privately, mark ready, and publish.
7. Return to the Public Storefront to see the published version.

## Project Structure

```text
src/app          Next.js routes, server actions, route handlers, and UI
src/application  Use-case orchestration for Codex-backed workflows
src/domain       Business contracts, validation, scoring, publishing rules
src/fixtures     Deterministic Atlas & Co. commerce data
src/harness      Codex App Server and image-generation adapters
src/persistence  SQLite runtime persistence
tests            Vitest unit/integration tests and Playwright specs
docs             Open-source setup, manual, architecture, testing, security
```

## Useful Scripts

```sh
npm run dev              # Start Next.js with webpack
npm run build            # Production build
npm run start            # Start built app
npm run lint             # Biome check
npm run typecheck        # Strict TypeScript check
npm test                 # Vitest suite
npm run coverage         # Coverage with thresholds
npm run test:e2e         # Playwright e2e smoke
npm run db:fixture       # Rebuild the clean fixture SQLite DB
npm run deps:outdated    # Dependency freshness check
npm run security:audit   # npm audit
```

## Documentation

- [Quickstart](docs/quickstart.md)
- [User Manual](docs/user-manual.md)
- [Architecture](docs/architecture.md)
- [Testing](docs/testing.md)
- [Security](docs/security.md)

## Demo Limitations

This is a polished demo, not production SaaS. Auth is local demo auth, data is deterministic fixture data, generated hero files are local runtime assets, and production deployment would need a real auth provider, rate limiting, moderation/storage policy for generated images, and managed secrets.

## Contributing

Use test-first development for behavior changes. Keep generated Codex output server-validated, avoid committing runtime state or secrets, and update public docs when behavior, setup, architecture, or security posture changes.
