# Security

## Security Model

Commerce Copilot Studio is an open-source local demo. It should still model clear security boundaries because it streams prompts, generated responses, commerce data, and generated asset metadata.

## Implemented Protections

- Staff pages require server-side role checks.
- Codex route handlers require route-level authentication and permissions.
- State-changing JSON routes reject cross-origin requests and non-JSON content types.
- Session cookies are HTTP-only, SameSite Lax, and secure when `NODE_ENV=production`.
- Passwords for seeded staff users are stored as Node `scrypt` hashes.
- Generated GraphQL is parsed and validated before execution.
- Generated storefront configs are validated against schema, section order, product references, palette tokens, and visual metadata before publishing.
- Generated image source files are validated before being copied into public generated assets.
- Codex run-event streams require staff trace permission.
- Baseline browser security headers are configured in `next.config.ts`.

## Demo-Only Boundaries

- Demo credentials are local-only and hidden unless `DEMO_SHOW_CREDENTIALS=true`.
- The auth system is intentionally lightweight and should be replaced before production deployment.
- Fixture data is fictional but includes customer/order-like records to make the Insight workflow realistic.
- Generated images are stored in local ignored runtime assets under `public/generated-assets/`.

## Production Requirements Before Real Use

- Replace demo auth with a production identity provider.
- Add rate limiting for Codex-backed routes.
- Use managed secret storage and deployment-specific environment controls.
- Add production logging/redaction policy for prompts, responses, and trace payloads.
- Define image-generation moderation, retention, and storage policy.
- Review CSP for the final deployment platform and remove development-only allowances where possible.
- Put a reverse proxy or managed edge in front of a self-hosted deployment.

## Audit Commands

```sh
npm run security:audit
npm run deps:outdated
npm run lint
npm run typecheck
npm test
```

At the time of this delivery pass, `npm audit` may report moderate advisories from Next's nested PostCSS dependency. Do not apply a force fix that downgrades Next; wait for a compatible upstream patch or apply a reviewed override.
