"use client";

import { useMemo, useState } from "react";
import {
  addCartItem,
  type CartCustomerPersona,
  type CartPromotion,
  calculateCart,
  removeCartItem,
  updateCartQuantity,
} from "@/domain/cart";
import type { Product } from "@/domain/product";

type StorefrontCartProps = {
  personas: Array<CartCustomerPersona & { name: string; borough: string }>;
  products: Product[];
  promotions: CartPromotion[];
};

export function StorefrontCart({ personas, products, promotions }: StorefrontCartProps) {
  const [selectedPersonaId, setSelectedPersonaId] = useState(personas[0]?.id ?? "");
  const [cart, setCart] = useState({ items: [] as Array<{ productId: string; quantity: number }> });
  const selectedPersona = personas.find((persona) => persona.id === selectedPersonaId);
  const pricedCart = useMemo(
    () =>
      calculateCart({
        cart,
        customer: selectedPersona,
        products,
        promotions,
        now: new Date("2026-06-10T12:00:00.000Z"),
      }),
    [cart, selectedPersona, products, promotions],
  );

  return (
    <section className="border-t border-neutral-200 py-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Shop the edit
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Products</h2>
            </div>
            <label className="grid min-w-64 gap-2 text-sm font-semibold">
              Demo persona
              <select
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 font-normal"
                onChange={(event) => setSelectedPersonaId(event.target.value)}
                value={selectedPersonaId}
              >
                {personas.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name} · {persona.segment} · {persona.borough}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {products.slice(0, 8).map((product) => (
              <article className="rounded-lg border border-neutral-200 p-4" key={product.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="mt-1 text-sm text-neutral-600">
                      £{product.price.toFixed(2)} · {product.category}
                    </p>
                  </div>
                  <button
                    className="rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white"
                    onClick={() => setCart((current) => addCartItem(current, product.id))}
                    type="button"
                  >
                    Add
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
        <aside className="h-fit rounded-lg border border-neutral-300 bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Anonymous cart
          </p>
          {pricedCart.items.length > 0 ? (
            <div className="mt-4 space-y-3">
              {pricedCart.items.map((item) => (
                <div
                  className="grid grid-cols-[1fr_auto] gap-3 border-b border-neutral-100 pb-3 text-sm"
                  key={item.productId}
                >
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="mt-1 text-neutral-600">
                      £{item.unitPrice.toFixed(2)} · qty {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="h-8 w-8 rounded-md border border-neutral-300 font-semibold"
                      onClick={() =>
                        setCart((current) =>
                          updateCartQuantity(current, item.productId, item.quantity - 1),
                        )
                      }
                      type="button"
                    >
                      -
                    </button>
                    <button
                      className="h-8 w-8 rounded-md border border-neutral-300 font-semibold"
                      onClick={() =>
                        setCart((current) =>
                          updateCartQuantity(current, item.productId, item.quantity + 1),
                        )
                      }
                      type="button"
                    >
                      +
                    </button>
                    <button
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold"
                      onClick={() => setCart((current) => removeCartItem(current, item.productId))}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-neutral-600">
              Add a product to show cart totals and targeted promotion eligibility.
            </p>
          )}
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>£{pricedCart.subtotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between text-emerald-700">
              <dt>{pricedCart.appliedPromotion?.title ?? "Promotion"}</dt>
              <dd>-£{pricedCart.discountTotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd>£{pricedCart.total.toFixed(2)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
