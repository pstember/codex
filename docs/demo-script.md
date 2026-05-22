# Demo Script

## Setup

Use Atlas & Co., a fictional curated lifestyle and gifting shop.

Demo roles:

- Store Manager: asks questions and reviews insights.
- Store Operator: approves campaigns and publishes storefront versions.
- Guest: views the storefront.

Start capture at Mission Control:

- Opening URL: `/?step=manager-insight`
- After Manager analysis: `/?step=operator-proposal`
- After Father’s Day publish: `/?step=secret-santa-revamp`
- After Secret Santa publish: `/?step=guest-preview`

Use the home-screen Loom capture checklist for stable links into the saved Manager trace, Operator workspace, Storefront Time Machine, and Guest close. If a run has not created an artifact yet, the checklist falls back to the role workspace instead of a missing detail URL.

## Act 1: Father’s Day

1. Open `/?step=manager-insight` and frame Mission Control.
2. Log in as Store Manager and open `/manager`.
3. Ask: “What should we promote for Father’s Day based on margin, inventory, and conversion?”
4. Show Codex run trace: schema read, GraphQL generated, query validated, data fetched, insight generated.
5. Return to `/?step=operator-proposal` and show the checklist’s saved Manager trace link.
6. Switch to Store Operator and open `/operator`.
7. Generate and approve the Father’s Day storefront.
8. Publish Father’s Day and show Storefront Time Machine from the checklist.

## Act 2: Secret Santa

1. Return to `/?step=secret-santa-revamp`.
2. Operator asks: “Turn the Father’s Day campaign into a Secret Santa campaign under £50.”
3. Show Codex trace: product reselection, copy rewrite, image prompt generation, storefront config validation.
4. Show products re-framed by price band and giftability.
5. Publish Secret Santa storefront.
6. Return to `/?step=guest-preview`.
7. Compare baseline, Father’s Day, and Secret Santa versions.
8. Use the checklist’s Guest close link to end on `/store?version=<active-version-id>`.

## Closing Message

The demo shows Codex embedded in a commerce workflow, not as a generic chatbot: it reads business context, generates validated queries and campaigns, updates the storefront, and preserves a traceable path from insight to action.
