# Behavioral Test Examples And Red Flags

Good behavioral tests prove what a user, caller, or system can observe. They do not freeze implementation details.

## Good Tests

```ts
it("shows an error when email is missing", async () => {
  render(<SignupForm />);
  await user.click(screen.getByRole("button", { name: /create account/i }));
  expect(screen.getByRole("alert")).toHaveTextContent(/email is required/i);
});
```

Why it is good: it uses the public component, performs a user action, and asserts visible behavior.

```py
def test_total_applies_bulk_discount():
    cart = ShoppingCart()
    cart.add_item(price=10)
    cart.add_item(price=10)
    cart.add_item(price=10)

    assert cart.total() == 27
```

Why it is good: it asserts the business result, not the internal storage or branch path.

## Bad Tests

```ts
expect(component.state.isValid).toBe(false);
```

Problem: asserts internal state instead of user-visible behavior.

```ts
expect(service["_calculateDiscount"](cart)).toBe(3);
```

Problem: tests a private method and blocks refactoring.

```ts
expect(repository.save).toHaveBeenCalledTimes(1);
```

Problem: can be valid only at a true boundary. It is usually weaker than asserting the observable result.

## Red Flags

- Test passes before implementation is changed.
- Test fails because imports, compilation, or setup are broken rather than behavior.
- Test name describes implementation instead of behavior.
- Test reaches into private members.
- Test mocks a class or module owned by the project.
- Test asserts call order without a user-visible reason.
- Refactor extracts a helper that hides a simple business rule.
- DRY cleanup makes the test harder to read.
