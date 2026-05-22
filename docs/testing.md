# Testing

## Target

Maintain an 80% coverage target for core app logic. UI boilerplate can be excluded only when doing so is explicit and justified.

## Tools

- Vitest for unit and integration tests.
- V8 coverage through `@vitest/coverage-v8`.
- Playwright for end-to-end and visual smoke tests.
- Biome for linting and formatting.
- Strict TypeScript for type safety.

## TDD Workflow

1. Write or update a failing test for the durable behavior.
2. Implement the smallest useful slice.
3. Run focused tests.
4. Run the broader validation set before ending a phase.
5. Update `docs/progress.md` with test, coverage, freshness, and audit status.

## Required Phase Checks

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run coverage`
- `npm run deps:outdated`
- `npm run security:audit`

## Golden Paths

- Manager asks the Father’s Day promotion query and receives a valid GraphQL query and recommendation shape.
- Operator transforms the Father’s Day proposal into a Secret Santa campaign under £50.
- Generated campaign and storefront configs only reference valid products and approved sections.
