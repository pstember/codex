# Testing

## Quality Bar

Maintain at least 80% coverage for core application logic. Prefer behavior tests at public boundaries: domain functions, application use cases, route handlers, persistence, and user-visible flows.

Use test-first development for durable behavior changes.

## Test Commands

```sh
npm run lint
npm run typecheck
npm test
npm run coverage
npm run build
npm run deps:outdated
npm run security:audit
npm run test:e2e
```

## What The Suite Covers

- Auth, sessions, and role permissions.
- Route-level API authorization and request hardening.
- Commerce GraphQL validation and execution.
- Insight question planning, evidence packing, metrics, and final answers.
- Storefront config validation, publishing, preview, rollback, and comparison.
- SQLite runtime persistence and fixture DB shape.
- Codex harness schema behavior with fake runners.
- Image harness asset validation and generated-path handling.
- Public Storefront and Staff Admin smoke flows through Playwright.

## Fixture Database

Rebuild the clean packaged fixture DB with:

```sh
npm run db:fixture
```

The tracked fixture DB should not contain sessions, generated drafts, local Codex run events, or generated image output.

## Playwright Notes

Playwright starts its own isolated server and database. Do not reuse a normal development server for e2e runs, because that can write smoke-test drafts into `.data/commerce.db`.

The smoke specs run with one worker because they share the isolated demo server and exercise sign-in, logout, cart, and storefront preview state. Live Codex generation is covered with fake runners in Vitest rather than the browser smoke suite, so e2e does not require an authenticated Codex app server.

If local browser launch is blocked by OS sandbox permissions, install or run Playwright with the required local permission and record that in the verification summary.
