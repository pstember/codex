# Architecture

## App Surfaces

- `/`: Public Storefront for anonymous shoppers.
- `/admin`: Staff Admin login and workspace hub.
- `/admin/insights`: Insight workspace for commerce questions.
- `/admin/storefront`: Storefront Studio for event drafts, preview, publish, and comparison.
- `/api/insights/data-question`: authenticated SSE-style Insight route.
- `/api/admin/storefront/adapt`: authenticated Storefront Studio generation route.
- `/api/codex-runs/[runId]/events`: authenticated Codex run-event stream.

## Module Map

```text
src/app          Next.js UI, routes, route handlers, server actions
src/application  Use-case orchestration that calls Codex/image/persistence boundaries
src/domain       Pure contracts, validators, calculations, publishing rules
src/fixtures     Deterministic Atlas & Co. commerce source data
src/harness      Codex App Server JSON/image adapters
src/persistence  SQLite schema and repository-style access
```

Dependency direction should stay simple:

```text
app -> application -> domain
app -> persistence
application -> harness
application -> persistence contracts
persistence -> domain types
harness -> domain contracts
```

## Insight Flow

1. The browser posts a staff question to `/api/insights/data-question`.
2. The route checks authentication, role permission, same-origin, and JSON content type.
3. `askDataQuestion` classifies the prompt, asks Codex for GraphQL, and validates it against the fixed schema.
4. Valid GraphQL executes against TypeScript fixtures.
5. Backend metric helpers calculate deterministic evidence.
6. Codex receives only the compact evidence pack and returns a final answer.
7. Trace events stream to the UI and can be replayed through authenticated Codex run-event endpoints.

## Storefront Studio Flow

1. The Operator sends an event prompt from `/admin/storefront`.
2. The route checks authentication, role permission, same-origin, and JSON content type.
3. The application layer calls the Codex harness for a storefront config and the image harness for hero-image metadata.
4. The domain validates the storefront schema, section order, product references, campaign/image linkage, and style tokens.
5. Valid or invalid drafts are persisted for review; invalid drafts show validation errors instead of publishing.
6. Publishing creates a new active version and deactivates the previous active version transactionally.
7. Rollback creates a new active version from history rather than mutating older versions.

## Data And Persistence

TypeScript fixtures are the analytics source of truth. SQLite intentionally stores only runtime state:

- Users
- Sessions
- Storefront drafts
- Published storefront versions
- Codex runs
- Codex run events

Persisted storefront JSON is hydrated for known legacy shape differences and then validated or safely ignored on read.

## Codex Boundaries

Runtime generation uses Codex App Server over stdio. Each generated JSON result is treated as untrusted data:

- GraphQL must parse and validate before execution.
- Storefront config must pass Zod and product-reference validation.
- Image metadata must use allowed public paths.
- Generated image source files are checked before copying to `public/generated-assets/`.

The app never executes generated code.

## Security Boundaries

- Staff pages use server-side role checks.
- Codex and trace API routes also enforce route-level auth.
- State-changing JSON routes enforce same-origin and `application/json`.
- Session cookies are HTTP-only, SameSite Lax, and secure in production.
- Security headers are configured in `next.config.ts`.

The current auth model is demo-grade. Production use should replace it with a real identity provider, rate limiting, secret management, and a production image-retention/moderation policy.
