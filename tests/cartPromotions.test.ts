import { describe, expect, it } from "vitest";
import { addCartItem, calculateCart, removeCartItem, updateCartQuantity } from "@/domain/cart";
import { products } from "@/fixtures/products";

describe("anonymous storefront cart", () => {
  it("prices items directly from the selected products without promo discounts", () => {
    const cart = addCartItem({ items: [] }, "pour-over-coffee-set", 2);

    const priced = calculateCart({
      cart,
      products,
    });

    expect(priced.items).toMatchObject([
      {
        productId: "pour-over-coffee-set",
        quantity: 2,
      },
    ]);
    expect(priced.total).toBe(priced.subtotal);
  });

  it("updates and removes anonymous cart items without requiring a guest account", () => {
    const cart = addCartItem({ items: [] }, "desk-organizer-tray", 1);
    const updated = updateCartQuantity(cart, "desk-organizer-tray", 3);
    const removed = removeCartItem(updated, "desk-organizer-tray");

    expect(updated.items).toEqual([{ productId: "desk-organizer-tray", quantity: 3 }]);
    expect(removed.items).toEqual([]);
  });
});
