---
name: behavioural-tdd
description: Execute a strict Red-Green-Refactor TDD cycle for one requirement at a time while applying KISS and DRY. Use when the user provides a business rule, acceptance criterion, bug fix, or feature requirement and wants test-first development, behavioral tests, failing tests first, TDD, red-green-refactor, or high-quality code. Works for unit, integration, UI component, API, and CLI tests across stacks.
---

# Behavioural TDD With KISS And DRY

Execute one complete TDD cycle per requirement. Never test private internals. Test observable behavior through the public interface.

## Phase 1 - RED: Write The Failing Test

Input: the requirement or business rule.

1. Identify the public entry point: function, method, component, endpoint, CLI command, event handler, or workflow.
2. If the public entry point does not exist, define the ideal minimal interface now.
3. Write one test that:
   - Calls only the public interface.
   - Asserts one specific output, return value, rendered element, side effect at a boundary, or observable state change.
   - Fails for the right reason, preferably a clear assertion failure rather than a compile or import error.
4. Present:
   - The test code.
   - The behavior it proves.
   - The expected failure reason.

Stop after RED and wait for confirmation before implementation if the user asked for a strict step-by-step TDD cycle. If the user asked you to implement end to end, run the cycle internally and report each phase.

## Phase 2 - GREEN: Minimum Implementation

Input: the failing test.

1. Write the smallest code that makes the test pass.
2. Apply KISS:
   - Prefer straightforward control flow.
   - Avoid speculative abstractions.
   - Do not add behavior that is not covered by the current test.
   - Shameless Green is acceptable for a single new test.
3. Present:
   - The implementation.
   - Confirmation that the test now passes, or the exact blocker if it cannot be run.

## Phase 3 - REFACTOR: Quality Cleanup

Input: passing behavior from RED and GREEN.

Improve code quality without changing external behavior.

Apply KISS:

- Remove unnecessary layers, indirection, configuration, or generality.
- Prefer names and structure that make the behavior obvious.
- Keep the public interface minimal and stable.

Apply DRY:

- Remove meaningful duplication in rules, constants, branching, setup, and assertions.
- Do not over-abstract coincidental duplication.
- Extract helpers only when they clarify intent or reduce maintenance risk.

Present:

- The refactored code or patch summary.
- What changed and why.
- The statement: "The behavioral test `<test name>` still passes."

## Mocking And Dependencies

Mock at system boundaries only: external APIs, databases, time, randomness, file system, queues, and network calls.

Never mock your own classes, private methods, internal collaborators, or implementation details.

Use dependency injection to make boundaries explicit and mockable. Prefer boundary interfaces with named operations over generic fetch or execute functions.

Read `references/mocking.md` when dependency boundaries or mocks are involved.

## UI Component Tests

Query by user-facing semantics first:

- Prefer `getByRole` with accessible name.
- Prefer visible labels over placeholders.
- Prefer text or role visible to a user over test IDs.
- Use test IDs only when there is no stable user-facing signal.

Accessibility exposed through tests is part of the behavior.

## Constraints

- One requirement per cycle.
- Public interface only.
- No assertions on private state.
- No production code before a failing test unless explicitly waived.
- No new abstraction without a demonstrated need.
- No duplication cleanup that obscures the business rule.

Read `references/tests.md` for examples and red flags.
