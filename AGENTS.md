# Agent Guide

Commerce Copilot Studio is a clean open-source demo, not a build journal. Keep the repo easy for a new contributor to run, audit, and extend.

## Before Significant Work

Read:

- `README.md`
- `docs/quickstart.md`
- `docs/architecture.md`
- `docs/testing.md`
- `docs/security.md`

If a change affects product behavior, architecture, security posture, setup, or repeatable contributor workflow, update the relevant public doc directly. Do not add private journal or archive files.

## Working Principles

- Prefer clear product intent before implementation.
- Ask clarifying questions when instructions are unclear or the goal is uncertain.
- Write product copy for real end users, not for project owners, agents, demos, or judges.
- Use test-first development for durable behavior unless explicitly waived.
- Keep solutions simple and avoid abstractions before there is a real need.
- Remove meaningful duplication when it improves clarity or reduces maintenance cost.
- Preserve user work and never revert unrelated changes.
- Avoid storing secrets, credentials, personal tokens, sessions, generated traces, or transient logs in the repo.

## Project Skills

Project-local skills live in `.codex/skills/`.

- Use `.codex/skills/behavioural-tdd/SKILL.md` for behavior changes, bug fixes, and high-quality implementation work.
- Use `.codex/skills/caveman/SKILL.md` only when the user asks for Caveman-style or extremely terse communication.

## Product Summary

Commerce Copilot Studio shows how Codex can support an ecommerce team:

- Public Storefront: anonymous Atlas & Co. shopping experience with searchable fixture products and local cart behavior.
- Staff Admin: role-gated entry for Manager, Analyst, and Operator workflows.
- Insight: Codex turns natural-language commerce questions into validated GraphQL, executes against seeded data, and answers from compact evidence.
- Storefront Studio: Codex creates event drafts with copy, palette, product placement, and hero-image metadata that staff can preview, review, publish, and compare.

## Non-Negotiables

- Use Tailwind CSS v4, Biome, strict TypeScript, Vitest, Playwright, and SQLite persistence.
- Keep generated Codex and image output constrained, server-validated, and treated as data only.
- Keep runtime state narrow: demo users, sessions, storefront drafts, published versions, and Codex run events.
- Keep TypeScript fixtures as the analytics source of truth.
- Maintain the 80% coverage target for core app logic.
- Run dependency freshness and security audit checks before release-oriented handoff.
