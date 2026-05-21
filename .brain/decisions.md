# Decisions

## 2026-05-21 - Project foundation

Use `AGENTS.md` as the canonical agent guide and `.brain/` as project memory.

Rationale: the project is starting from scratch, so durable collaboration context matters before product or stack choices are made.

## 2026-05-21 - Project-local skills

Keep skills under `.codex/skills/` instead of installing them globally.

Rationale: project-local skills make the working style portable and reviewable with the repo.

## 2026-05-21 - Test-first quality bar

Adopt a behavioral TDD skill that combines Red-Green-Refactor with KISS and DRY.

Rationale: tests should describe observable behavior, implementation should start simple, and refactoring should remove duplication once behavior is protected.
