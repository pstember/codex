# Mocking Guidelines

Mock boundaries, not internals.

## Mock These

- External APIs, including payment, email, SMS, maps, analytics, and AI providers.
- Databases, or use an isolated test database.
- Time, randomness, file system, queues, and network calls.
- Browser or OS APIs when they are outside the unit under test.

## Do Not Mock These

- Private methods.
- Internal classes or modules you own.
- Implementation details.
- Intermediate variable values.

## Dependency Injection

Pass external dependencies into the public unit under test.

```ts
function processPayment(order: Order, paymentClient: PaymentClient) {
  return paymentClient.charge(order.total);
}
```

Avoid constructing boundary dependencies inside the behavior under test.

```ts
function processPayment(order: Order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

## Boundary Interfaces

Prefer named operations.

```ts
const api = {
  getUser: (id: string) => fetch(`/users/${id}`),
  getOrders: (userId: string) => fetch(`/users/${userId}/orders`),
  createOrder: (data: OrderData) => fetch("/orders", {
    method: "POST",
    body: JSON.stringify(data),
  }),
};
```

Avoid one generic fetcher that forces tests to contain endpoint conditionals.

## Return Values

Prefer interfaces that return results instead of mutating hidden state.

```ts
function calculateDiscount(cart: Cart): Discount {
  return { amount: cart.total * 0.1 };
}
```

This keeps tests behavioral and simple.
