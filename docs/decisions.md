# Decisions

## 2026-05-21: Full-Stack TypeScript

Use a full-stack TypeScript app so domain contracts, server actions, tests, and UI share types.

## 2026-05-21: Tailwind CSS v4

Use Tailwind CSS v4 with the CSS-first `@import "tailwindcss";` setup. Avoid v3 configuration assumptions unless a documented incompatibility appears.

## 2026-05-21: Fixture-First Codex Harness

Build `codexHarness` behind an interface with deterministic fixtures first, optional Codex CLI support second, and App Server support only when explicitly configured. Early phases must not depend on live Codex availability.

## 2026-05-22: Codex App Server Is Locally Available

The local Codex CLI includes `codex app-server`. By default it runs on `stdio://`; use `codex app-server --listen ws://127.0.0.1:4500` when a local WebSocket listener and `/readyz` or `/healthz` probes are useful. Keep the app-server harness optional and configuration-gated, with fixture mode remaining the deterministic default for tests and Loom replay.

## 2026-05-21: Constrained Generation

Codex may generate GraphQL, campaign proposals, copy, image prompts, and storefront configs, but generated output must validate against schemas and approved component slots. Do not execute arbitrary generated code.

## 2026-05-21: SQLite

Use SQLite for local persistence because it is portable, easy to seed, and suitable for a demo that must resume across sessions.

## 2026-05-22: Lightweight Demo Auth

Use app-native demo login with three seeded accounts: `manager@demo.com`, `operator@demo.com`, and `guest@demo.com`. Persist sessions in SQLite and protect Manager/Operator routes and server actions with role permissions. External auth providers remain deferred to keep the hackathon demo reliable.

## 2026-05-22: Webpack Next Server For SQLite

Run `next dev --webpack` and `next build --webpack` because Next 16 Turbopack currently fails to load Node's built-in `node:sqlite` module in this app.
