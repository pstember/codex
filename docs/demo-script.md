# Demo Script

## Setup

Use Atlas & Co., a fictional curated lifestyle and gifting shop.

Demo roles:

- Store Manager: asks questions and reviews insights.
- Store Operator: approves campaigns and publishes storefront versions.
- Guest: views the storefront.

## Act 1: Father’s Day

1. Log in as Store Manager.
2. Ask: “What should we promote for Father’s Day based on margin, inventory, and conversion?”
3. Show Codex run trace: schema read, GraphQL generated, query validated, data fetched, insight generated.
4. Show recommendation for a Grill, Travel, and Everyday Carry campaign.
5. Switch to Store Operator.
6. Generate and approve the Father’s Day storefront.
7. Show Guest view and Storefront Time Machine.

## Act 2: Secret Santa

1. Operator asks: “Turn the Father’s Day campaign into a Secret Santa campaign under £50.”
2. Show Codex trace: product reselection, copy rewrite, image prompt generation, storefront config validation.
3. Show products re-framed by price band and giftability.
4. Publish Secret Santa storefront.
5. Compare baseline, Father’s Day, and Secret Santa versions.

## Closing Message

The demo shows Codex embedded in a commerce workflow, not as a generic chatbot: it reads business context, generates validated queries and campaigns, updates the storefront, and preserves a traceable path from insight to action.
