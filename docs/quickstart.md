# Quickstart

## Prerequisites

- Node.js with npm.
- A local Codex CLI that can run `codex app-server` for live Insight and Storefront Studio generation.
- macOS includes `sips`, which the image harness uses to convert generated hero images to JPEG when possible. Without it, validated source images are copied as their original image type.

## Install

```sh
npm install
npm run db:fixture
```

`npm run db:fixture` rebuilds `fixtures/commerce.db`, the clean packaged SQLite fixture. Runtime state lives in `.data/commerce.db` and is ignored by git.

## Run Locally

```sh
DEMO_SHOW_CREDENTIALS=true npm run dev
```

Open:

- Public Storefront: `http://127.0.0.1:3000/`
- Staff Admin: `http://127.0.0.1:3000/admin`

Set `DEMO_SHOW_CREDENTIALS=true` only for local demos. Without it, the login page hides demo passwords.

## Local Demo Accounts

- Manager: `manager@demo.com` / `manager-demo-pass`
- Analyst: `analyst@demo.com` / `analyst-demo-pass`
- Operator: `operator@demo.com` / `operator-demo-pass`

Guests do not sign in. They use the Public Storefront anonymously.

## Codex App Server

Runtime generation calls `codex app-server` over stdio. The Codex CLI must be authenticated before using live Insight or Storefront Studio generation.

Optional health-check mode:

```sh
codex app-server --listen ws://127.0.0.1:4500
curl http://127.0.0.1:4500/readyz
curl http://127.0.0.1:4500/healthz
```

The app itself uses the stdio adapter, so no WebSocket listener is required for normal local use.

## Reset Local Runtime State

```sh
rm -f .data/commerce.db
npm run dev
```

The app recreates `.data/commerce.db` and seeds demo staff users on startup. Generated hero images under `public/generated-assets/` are local runtime output and are ignored by git.

## Troubleshooting

- If live generation fails, confirm `codex app-server` works in a terminal and the Codex CLI is authenticated.
- If Playwright cannot launch Chromium in a restricted local environment, install the browser and rerun with the needed local permissions.
- If port `3000` is busy, run `npm run dev -- --port 3001` and open the matching URL.
- If generated images do not appear after a reset, regenerate the event draft or hero image from Storefront Studio.
