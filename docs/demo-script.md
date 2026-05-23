# Demo Script

## Setup

Use Atlas & Co., a fictional curated lifestyle and gifting shop.

Demo roles:

- Store Manager: asks questions and reviews insights.
- Store Operator: approves campaigns and publishes storefront versions.
- Guest: views the storefront.

Start at the real public shop:

- Public storefront: `/`
- Staff admin: `/admin`
- Manager workspace: `/manager`
- Operator workspace: `/operator`

For a real Codex App Server demo, start the app with:

```sh
CODEX_HARNESS_MODE=app-server npm run dev
```

The Manager and Operator generation actions will call `codex app-server` over stdio and validate the returned JSON. For deterministic rehearsal or if live Codex is unavailable, omit `CODEX_HARNESS_MODE` to use static catalog mode.

To show the real query path, use the Manager custom question box with a prompt such as:

```text
Which under £50 products have the best margin and enough inventory?
```

Codex should translate it into a valid query over the fixed commerce schema, the app should validate it, execute it against seeded Atlas data, persist Codex run events, and save the trace.

## Act 1: Father’s Day

1. Open `/` and show Atlas & Co. as an anonymous shopper.
2. Switch demo persona, add an item to the cart, and show targeted promotion pricing.
3. Open `/admin`, sign in as Store Manager, and run the Father’s Day golden query or a live custom question.
4. Show the Codex live window: prompt prepared, schema sent, GraphQL generated, validation, query execution, trace saved.
5. Sign in as Store Operator and open `/operator`.
6. Generate and approve the Father’s Day storefront.
7. Publish Father’s Day and open the public storefront at `/`.

## Act 2: Secret Santa

1. In Operator, run “Revamp for Secret Santa.”
2. Show product reselection, copy rewrite, image prompt metadata, and storefront config validation.
3. Show products reframed by price band and giftability.
4. Publish Secret Santa storefront.
5. Compare baseline, Father’s Day, and Secret Santa in Storefront Time Machine.
6. End on `/` with the active Secret Santa storefront and anonymous cart.

## Closing Message

The demo shows Codex embedded in a commerce workflow, not as a generic chatbot: it reads business context, generates validated GraphQL and campaigns, exposes the exchange as observable run events, updates the storefront, and preserves a traceable path from insight to action.
