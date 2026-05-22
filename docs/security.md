# Security

## Baseline

This is a local demo app, but it should model real security boundaries clearly.

## Requirements

- Role authorization must be tested for Manager, Operator, and Guest.
- Server-side validation is required for all Codex and image harness outputs.
- Generated output must never be executed as arbitrary code.
- Secrets must not be stored in Codex traces, image metadata, fixtures, or client bundles.
- Dependency advisories must be tracked with `npm audit`; low-risk issues can be deferred only when documented here.

## Current Status

- Phase 1 added lightweight demo auth with HTTP-only session cookies and SQLite-backed sessions.
- Manager and Operator routes/actions are protected by server-side permission checks.
- Codex App Server is available through the local Codex CLI. Default `stdio://` use requires no localhost listener; optional `ws://127.0.0.1:<port>` development mode should bind to loopback only unless a separate security review approves remote access.
- No live App Server integration secrets are required yet.
- `npm run security:audit` was rerun on 2026-05-22.
- Audit currently reports 2 moderate advisories from Next's nested `postcss@8.4.31`.
- `npm audit fix --force` would install `next@9.3.3`, which is a breaking downgrade, so this is documented and deferred rather than applied.

## Deferred Concerns

- Production-grade auth provider selection remains intentionally deferred. The current role-based demo auth is not intended as production auth.
- Live image generation security review is deferred until the image harness moves beyond fixtures.
- Next/PostCSS audit remediation is deferred until a compatible current Next release updates its nested PostCSS dependency or a safe override strategy is confirmed.
