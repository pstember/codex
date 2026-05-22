# Learnings

## 2026-05-22

- Playwright's npm package may be present while the browser binaries are missing; install the relevant browser when UI verification needs it.
- In this environment, launching Chromium for Playwright requires elevated execution because the macOS sandbox can block Chromium's Mach port registration.
- The Codex in-app browser can connect but may block localhost navigation with `ERR_BLOCKED_BY_CLIENT`; use the Playwright e2e smoke as the fallback verification path.
