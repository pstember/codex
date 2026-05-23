import type { Product } from "@/domain/product";

export type CartItem = {
  productId: string;
  quantity: number;
};

export type AnonymousCart = {
  items: CartItem[];
};

export type CartCustomerPersona = {
  id: string;
  segment: string;
};

export type CartPromotion = {
  id: string;
  title: string;
  discountPercent: number;
  segmentIds: string[];
  startsAt: string;
  endsAt: string;
  minSubtotal?: number;
  productIds?: string[];
  categories?: string[];
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
  discountTotal: number;
  total: number;
  appliedPromotion?: CartPromotion;
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

export function calculateCart(input: {
  cart: AnonymousCart;
  customer?: CartCustomerPersona;
  products: Product[];
  promotions: CartPromotion[];
  now?: Date;
}): PricedCart {
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
  const appliedPromotion = findBestPromotion({
    customer: input.customer,
    items,
    now: input.now ?? new Date(),
    promotions: input.promotions,
    subtotal,
  });
  const discountTotal = appliedPromotion
    ? roundCurrency(calculatePromotionDiscount(items, appliedPromotion))
    : 0;

  return {
    items,
    subtotal,
    discountTotal,
    total: roundCurrency(subtotal - discountTotal),
    appliedPromotion,
  };
}

function findBestPromotion(input: {
  customer?: CartCustomerPersona;
  items: PricedCartItem[];
  now: Date;
  promotions: CartPromotion[];
  subtotal: number;
}): CartPromotion | undefined {
  return input.promotions
    .filter((promotion) => isPromotionEligible({ ...input, promotion }))
    .sort(
      (left, right) =>
        calculatePromotionDiscount(input.items, right) -
        calculatePromotionDiscount(input.items, left),
    )[0];
}

function isPromotionEligible(input: {
  customer?: CartCustomerPersona;
  items: PricedCartItem[];
  now: Date;
  promotion: CartPromotion;
  subtotal: number;
}): boolean {
  const { customer, items, now, promotion, subtotal } = input;

  return (
    customer !== undefined &&
    promotion.segmentIds.includes(customer.segment) &&
    now >= new Date(promotion.startsAt) &&
    now <= new Date(promotion.endsAt) &&
    subtotal >= (promotion.minSubtotal ?? 0) &&
    promotionMatchesCart(promotion, items)
  );
}

function promotionMatchesCart(promotion: CartPromotion, items: PricedCartItem[]): boolean {
  const hasProductTarget = promotion.productIds !== undefined && promotion.productIds.length > 0;
  const hasCategoryTarget = promotion.categories !== undefined && promotion.categories.length > 0;

  if (!hasProductTarget && !hasCategoryTarget) {
    return items.length > 0;
  }

  return items.some(
    (item) =>
      promotion.productIds?.includes(item.productId) ||
      promotion.categories?.includes(item.category),
  );
}

function calculatePromotionDiscount(items: PricedCartItem[], promotion: CartPromotion): number {
  const eligibleSubtotal = items
    .filter(
      (item) =>
        promotion.productIds?.includes(item.productId) ||
        promotion.categories?.includes(item.category) ||
        (!promotion.productIds?.length && !promotion.categories?.length),
    )
    .reduce((total, item) => total + item.lineTotal, 0);

  return eligibleSubtotal * (promotion.discountPercent / 100);
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
