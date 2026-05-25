import type { Product } from "@/domain/product";

export type CartItem = {
  productId: string;
  quantity: number;
};

export type AnonymousCart = {
  items: CartItem[];
};

export type PricedCartItem = CartItem & {
  name: string;
  category: string;
  unitPrice: number;
  lineTotal: number;
};

export type PricedCart = {
  items: PricedCartItem[];
  subtotal: number;
  total: number;
};

export function addCartItem(cart: AnonymousCart, productId: string, quantity = 1): AnonymousCart {
  if (quantity <= 0) {
    return cart;
  }

  const existingItem = cart.items.find((item) => item.productId === productId);

  if (!existingItem) {
    return {
      items: [...cart.items, { productId, quantity }],
    };
  }

  return {
    items: cart.items.map((item) =>
      item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item,
    ),
  };
}

export function updateCartQuantity(
  cart: AnonymousCart,
  productId: string,
  quantity: number,
): AnonymousCart {
  if (quantity <= 0) {
    return removeCartItem(cart, productId);
  }

  return {
    items: cart.items.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
  };
}

export function removeCartItem(cart: AnonymousCart, productId: string): AnonymousCart {
  return {
    items: cart.items.filter((item) => item.productId !== productId),
  };
}

export function calculateCart(input: { cart: AnonymousCart; products: Product[] }): PricedCart {
  const productsById = new Map(input.products.map((product) => [product.id, product]));
  const items = input.cart.items.flatMap((item) => {
    const product = productsById.get(item.productId);

    if (!product || item.quantity <= 0) {
      return [];
    }

    return [
      {
        productId: item.productId,
        quantity: item.quantity,
        name: product.name,
        category: product.category,
        unitPrice: product.price,
        lineTotal: product.price * item.quantity,
      },
    ];
  });
  const subtotal = roundCurrency(items.reduce((total, item) => total + item.lineTotal, 0));

  return {
    items,
    subtotal,
    total: subtotal,
  };
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
