# Security

## Baseline

This is a local demo app, but it should model real security boundaries clearly.

## Requirements

- Role authorization must be tested for Manager, Analyst, and Operator staff; Guests stay anonymous on the public storefront.
- Server-side validation is required for all Codex and image harness outputs.
- Generated output must never be executed as arbitrary code.
- Secrets must not be stored in Codex traces, image metadata, fixtures, or client bundles.
- Dependency advisories must be tracked with `npm audit`; low-risk issues can be deferred only when documented here.

## Current Status

- Phase 1 added lightweight demo auth with HTTP-only session cookies, SQLite-backed sessions, and Node `scrypt` password hashes for seeded Manager, Analyst, and Operator staff users.
- Guests do not have accounts; `/` is the public storefront and `/store` redirects there for compatibility.
- Staff routes/actions are protected by server-side permission checks.
- Codex App Server is available through the local Codex CLI. Default `stdio://` use requires no localhost listener; optional `ws://127.0.0.1:<port>` development mode should bind to loopback only unless a separate security review approves remote access.
- Runtime Codex generation uses a spawned `codex app-server` stdio process with ephemeral read-only threads, `approvalPolicy: "never"`, and server-side schema validation of generated JSON before persistence/rendering. Static and fixture harnesses are reserved for tests.
- Custom Manager questions run only through the fixed GraphQL schema; generated GraphQL is parsed and validated before execution against seeded commerce data.
- No live App Server integration secrets are required yet.
- `npm run security:audit` was rerun on 2026-05-23.
- Audit currently reports 2 moderate advisories from Next's nested `postcss@8.4.31`.
- `npm audit fix --force` would install `next@9.3.3`, which is a breaking downgrade, so this is documented and deferred rather than applied.
- Storefront visual adaptation outputs are still validated as data: Codex-generated copy, palette, section config, and image metadata must pass server-side schema/product-reference checks before publishing.
- Live storefront images are generated through Codex App Server and copied into ignored `public/generated-assets/`; the app persists only prompt/alt/source metadata and the public asset path.

## Deferred Concerns

- Production-grade auth provider selection remains intentionally deferred. The current role-based demo auth is not intended as production auth.
- Production image-generation policy, moderation, retention, and storage review remains deferred; current live generation is local-demo scoped through Codex App Server.
- Next/PostCSS audit remediation is deferred until a compatible current Next release updates its nested PostCSS dependency or a safe override strategy is confirmed.
