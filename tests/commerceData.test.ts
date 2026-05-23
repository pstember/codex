import { describe, expect, it } from "vitest";
import {
  addresses,
  customers,
  emailEvents,
  inventoryLocations,
  orders,
  promotions,
  returns,
  stockPositions,
} from "@/fixtures/commerce";
import { products } from "@/fixtures/products";
import { createCommerceDatabase } from "@/persistence/database";

describe("London commerce data", () => {
  it("keeps seeded ecommerce relationships valid and wide enough for live demos", () => {
    const productIds = new Set(products.map((product) => product.id));
    const customerIds = new Set(customers.map((customer) => customer.id));
    const addressIds = new Set(addresses.map((address) => address.id));
    const orderIds = new Set(orders.map((order) => order.id));
    const locationIds = new Set(inventoryLocations.map((location) => location.id));

    expect(customers.length).toBeGreaterThanOrEqual(24);
    expect(orders.length).toBeGreaterThanOrEqual(100);
    expect(new Set(addresses.map((address) => address.borough)).size).toBeGreaterThanOrEqual(8);
    expect(inventoryLocations.map((location) => location.id)).toEqual([
      "london-micro-fulfilment",
      "midlands-warehouse",
      "supplier-inbound",
    ]);

    for (const customer of customers) {
      expect(addressIds.has(customer.defaultAddressId)).toBe(true);
    }

    for (const order of orders) {
      expect(customerIds.has(order.customerId)).toBe(true);
      expect(addressIds.has(order.shippingAddressId)).toBe(true);
      expect(order.currency).toBe("GBP");
      expect(order.items.length).toBeGreaterThan(0);
      for (const item of order.items) {
        expect(productIds.has(item.productId)).toBe(true);
      }
    }

    for (const position of stockPositions) {
      expect(productIds.has(position.productId)).toBe(true);
      expect(locationIds.has(position.locationId)).toBe(true);
    }

    for (const returnRequest of returns) {
      expect(orderIds.has(returnRequest.orderId)).toBe(true);
      expect(productIds.has(returnRequest.productId)).toBe(true);
    }

    expect(emailEvents.some((event) => event.eventType === "conversion")).toBe(true);
    expect(promotions.some((promotion) => promotion.segmentIds.includes("coffee-regulars"))).toBe(
      true,
    );
  });

  it("persists seeded ecommerce source data counts in SQLite", () => {
    const database = createCommerceDatabase();

    try {
      database.seedCommerceData({
        customers,
        addresses,
        orders,
        inventoryLocations,
        stockPositions,
        returns,
        emailEvents,
        promotions,
      });

      expect(database.countCustomers()).toBe(customers.length);
      expect(database.countOrders()).toBe(orders.length);
      expect(database.countPromotions()).toBe(promotions.length);
    } finally {
      database.close();
    }
  });
});
