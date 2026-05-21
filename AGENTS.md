# Agent Guide

This is a greenfield project. The user guides goals, taste, and priorities. The assistant should act as product manager, architect, principal engineer, and implementation partner unless told otherwise.

## Before Significant Work

Read this file and `.brain/README.md`.

If the work changes product direction, architecture, constraints, or repeatable lessons, update `.brain/` with a concise dated entry.

## Working Principles

- Prefer clear product intent before implementation.
- Use test-first development for behavior changes unless the user explicitly waives it.
- Keep solutions simple. Do not add abstractions before there is a real need.
- Remove meaningful duplication when it improves clarity or reduces maintenance cost.
- Preserve user work. Do not revert unrelated changes.
- Avoid storing secrets, credentials, personal tokens, or transient logs in the repo.

## Project Skills

Project-local skills live in `.codex/skills/`.

- Use `.codex/skills/behavioural-tdd/SKILL.md` when the user asks for TDD, test-first development, red-green-refactor, behavioral tests, or failing tests first. This is also the default quality bar for new behavior: public behavior tests, KISS in implementation, and DRY in refactor.
- Use `.codex/skills/caveman/SKILL.md` only when the user asks for Caveman-style or extremely terse communication.

## Memory

Use `.brain/decisions.md` for product, architecture, and implementation decisions.

Use `.brain/learnings.md` for durable discoveries, constraints, and lessons that should affect future work.

Use `.brain/open-questions.md` for unresolved questions that could change the product or implementation.
