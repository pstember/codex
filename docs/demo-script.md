# Demo Script

## Setup

Use Atlas & Co., a fictional curated lifestyle and gifting shop.

Demo roles:

- Store Manager: asks questions and reviews insights.
- Store Analyst: reviews insights without storefront access.
- Store Operator: adapts and publishes storefront versions.
- Guest: views the storefront.

Start at the real public shop:

- Public storefront: `/`
- Staff admin: `/admin`
- Insight workspace: `/admin/insights`
- Storefront management workspace: `/admin/storefront`

For a real Codex App Server demo, start the app with:

```sh
npm run dev
```

The Manager and Operator generation actions will call `codex app-server` over stdio and validate the returned JSON. The Codex CLI must be authenticated and able to start App Server; runtime generation no longer falls back to static output.

To show the real query path, use the Manager custom question box with a prompt such as:

```text
Which under £50 products have the best margin and enough inventory?
```

Codex should translate it into a valid query over the fixed commerce schema, the app should validate it, execute it against seeded Atlas data, persist Codex run events, and save the trace.

## Act 1: Insight To Adaptation

1. Open `/` and show Atlas & Co. as an anonymous shopper.
2. Add an item to the cart and show the live published storefront experience.
3. Open `/admin`, sign in as Store Manager, open Insight, and ask a live commerce question.
4. Show the Codex live window: prompt prepared, schema sent, GraphQL generated, validation, query execution, trace saved.
5. Sign in as Store Operator and open `/admin/storefront`.
6. Ask Codex to adapt the storefront for an event, for example `Halloween storefront for cosy office gifts`.
7. Show the visual exchange rail, generated hero, palette swatches, rewritten copy, and saved draft gallery.
8. Publish the event draft and open the public storefront at `/`.

## Act 2: Another Storefront Moment

1. In Operator, create a second event draft from another prompt.
2. Show copy rewrite, image prompt metadata, and storefront config validation.
3. Publish the second storefront version.
4. Compare baseline and the generated versions in Storefront Time Machine.
5. End on `/` with the active storefront and anonymous cart.

## Closing Message

The demo shows Codex embedded in a commerce workflow, not as a generic chatbot: it reads business context, generates validated GraphQL and storefront adaptations, exposes the exchange as observable run events, updates the storefront, and preserves a traceable path from insight to action.

The storefront act now shows Codex adapting the visual layer as well as the business layer: event copy, palette, generated hero metadata, draft review, publish, rollback, and visitor preview all stay tied to the same validated storefront version model.
