import { describe, expect, it } from "vitest";
import { addCartItem, calculateCart, removeCartItem, updateCartQuantity } from "@/domain/cart";
import { customers, promotions } from "@/fixtures/commerce";
import { products } from "@/fixtures/products";

describe("anonymous storefront cart and promotions", () => {
  it("applies a targeted promotion for a matching demo persona and cart", () => {
    const customer = customers.find((item) => item.segment === "coffee-regulars");
    expect(customer).toBeDefined();

    const cart = addCartItem({ items: [] }, "pour-over-coffee-set", 2);
    if (!customer) {
      throw new Error("Expected coffee-regulars demo customer fixture.");
    }

    const priced = calculateCart({
      cart,
      customer,
      products,
      promotions,
      now: new Date("2026-06-10T12:00:00.000Z"),
    });

    expect(priced.items).toMatchObject([
      {
        productId: "pour-over-coffee-set",
        quantity: 2,
      },
    ]);
    expect(priced.appliedPromotion?.id).toBe("coffee-regulars-fathers-day");
    expect(priced.discountTotal).toBeGreaterThan(0);
    expect(priced.total).toBeLessThan(priced.subtotal);
  });

  it("updates and removes anonymous cart items without requiring a guest account", () => {
    const cart = addCartItem({ items: [] }, "desk-organizer-tray", 1);
    const updated = updateCartQuantity(cart, "desk-organizer-tray", 3);
    const removed = removeCartItem(updated, "desk-organizer-tray");

    expect(updated.items).toEqual([{ productId: "desk-organizer-tray", quantity: 3 }]);
    expect(removed.items).toEqual([]);
  });
});
