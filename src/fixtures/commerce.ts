import type {
  CommerceAddress,
  CommerceCustomer,
  CommerceData,
  CommerceOrder,
  CommerceReturn,
  EmailEvent,
  InventoryLocation,
  Promotion,
  StockPosition,
} from "@/domain/commerce";
import { products } from "@/fixtures/products";

const boroughs = [
  "Hackney",
  "Camden",
  "Islington",
  "Southwark",
  "Lambeth",
  "Greenwich",
  "Wandsworth",
  "Ealing",
  "Haringey",
  "Lewisham",
  "Tower Hamlets",
  "Richmond",
] as const;

const segments = [
  "coffee-regulars",
  "fathers-day-shoppers",
  "secret-santa-buyers",
  "outdoor-hosts",
  "home-office-upgraders",
  "premium-gifters",
  "office-gift-buyers",
  "office-admins",
] as const;

const customerNames = [
  "Amara Hughes",
  "Theo Patel",
  "Maya Thompson",
  "Rafi Khan",
  "Eleanor Wright",
  "Noah Campbell",
  "Priya Shah",
  "Iris Walker",
  "Jude Morris",
  "Sofia Clarke",
  "Leo Bennett",
  "Nina Foster",
  "Samir Ali",
  "Clara Evans",
  "Oscar Reed",
  "Mina Brooks",
  "Felix Cooper",
  "Lara Morgan",
  "Hugo Price",
  "Zara Ahmed",
  "Miles Carter",
  "Imogen Scott",
  "Kai Turner",
  "Ava Phillips",
  "Bethany James",
  "Niall O'Connor",
  "Tara Singh",
  "George Miller",
  "Yasmin Grant",
  "Rory Davies",
  "Anika Mehta",
  "Tom Wallace",
  "Hannah Cole",
  "Daniel Brooks",
  "Leila Fraser",
  "Ben Spencer",
  "Megan Fox",
  "Omar Farah",
  "Lucy Hart",
  "Callum Stone",
  "Jasmine Bell",
  "Ethan Wood",
  "Martha Lane",
  "Adam Sinclair",
  "Freya Moss",
  "Reuben Ellis",
  "Chloe Webb",
  "Louis Harper",
];

export const addresses: CommerceAddress[] = customerNames.map((_name, index) => {
  const customerId = customerIdFor(index);
  const borough = boroughs[index % boroughs.length];

  return {
    id: `addr-${customerId}`,
    customerId,
    line1: `${18 + index} ${streetFor(index)}`,
    borough,
    postcode: postcodeFor(index),
    city: "London",
    country: "GB",
  };
});

export const customers: CommerceCustomer[] = customerNames.map((name, index) => {
  const customerId = customerIdFor(index);
  const segment = index % 6 === 0 ? "coffee-regulars" : segments[index % segments.length];

  return {
    id: customerId,
    email: `${name.toLowerCase().replaceAll(" ", ".")}@atlas-demo.test`,
    name,
    segment,
    borough: addresses[index].borough,
    defaultAddressId: addresses[index].id,
    lifetimeValue: 180 + index * 37,
    ordersCount: 3 + (index % 5),
  };
});

export const inventoryLocations: InventoryLocation[] = [
  {
    id: "london-micro-fulfilment",
    name: "London Micro Fulfilment",
    kind: "fulfilment",
    city: "London",
  },
  {
    id: "midlands-warehouse",
    name: "Midlands Warehouse",
    kind: "warehouse",
    city: "Birmingham",
  },
  {
    id: "supplier-inbound",
    name: "Supplier Inbound",
    kind: "supplier",
    city: "Felixstowe",
  },
];

export const stockPositions: StockPosition[] = products.flatMap((product, productIndex) =>
  inventoryLocations.map((location, locationIndex) => ({
    productId: product.id,
    locationId: location.id,
    onHand: Math.max(4, Math.floor(product.inventory * [0.52, 0.34, 0.14][locationIndex])),
    reserved: 6 + ((productIndex + locationIndex) % 9),
    reorderPoint: location.id === "supplier-inbound" ? 25 : 45,
  })),
);

export const promotions: Promotion[] = [
  {
    id: "coffee-regulars-fathers-day",
    title: "Coffee Regulars Father’s Day",
    segmentIds: ["coffee-regulars", "fathers-day-shoppers"],
    productIds: ["pour-over-coffee-set", "travel-grooming-kit", "cast-iron-grill-press"],
    discountPercent: 15,
    startsAt: "2026-06-01T00:00:00.000Z",
    endsAt: "2026-06-16T23:59:59.000Z",
    active: true,
  },
  {
    id: "desk-gifts-under-50",
    title: "Desk Gifts Under £50",
    segmentIds: ["secret-santa-buyers", "home-office-upgraders", "office-gift-buyers"],
    productIds: ["desk-organizer-tray", "wireless-charging-valet", "pour-over-coffee-set"],
    discountPercent: 10,
    startsAt: "2026-11-20T00:00:00.000Z",
    endsAt: "2026-12-24T23:59:59.000Z",
    active: false,
  },
  {
    id: "outdoor-hosting-weekend",
    title: "Outdoor Hosting Weekend",
    segmentIds: ["outdoor-hosts", "fathers-day-shoppers"],
    productIds: ["portable-charcoal-grill", "cast-iron-grill-press", "insulated-cooler-tote"],
    discountPercent: 12,
    startsAt: "2026-05-28T00:00:00.000Z",
    endsAt: "2026-06-02T23:59:59.000Z",
    active: true,
  },
  {
    id: "office-secret-santa-bundles",
    title: "Office Secret Santa Bundles",
    segmentIds: ["secret-santa-buyers", "office-gift-buyers", "office-admins"],
    productIds: [
      "desk-organizer-tray",
      "wireless-charging-valet",
      "pour-over-coffee-set",
      "travel-grooming-kit",
    ],
    discountPercent: 12,
    startsAt: "2026-11-20T00:00:00.000Z",
    endsAt: "2026-12-18T23:59:59.000Z",
    active: true,
  },
];

export const orders: CommerceOrder[] = Array.from({ length: 260 }, (_, index) => {
  const customer = customers[index % customers.length];
  const seasonalOffset = index >= 120 ? 9 : 6;
  const firstProduct = products[(index + seasonalOffset) % products.length];
  const secondProduct = products[(index * 3 + 1) % products.length];
  const thirdProduct = products[(index * 5 + 4) % products.length];
  const firstQuantity = 1 + (index % 2);
  const secondQuantity = index % 3 === 0 ? 2 : 1;
  const thirdQuantity = index >= 120 && index % 4 === 0 ? 1 : 0;
  const subtotal = money(
    firstProduct.price * firstQuantity +
      secondProduct.price * secondQuantity +
      thirdProduct.price * thirdQuantity,
  );
  const discountTotal =
    index >= 120 || index % 5 === 0 ? money(subtotal * seasonalDiscount(index)) : 0;
  const shippingTotal = subtotal >= 50 ? 0 : 3.95;
  const channel =
    index >= 120 && index % 6 === 0
      ? "marketplace"
      : index % 11 === 0
        ? "retail"
        : index % 7 === 0
          ? "marketplace"
          : "online";
  const status = index % 8 === 0 ? "returned" : index % 4 === 0 ? "shipped" : "fulfilled";
  const items = [
    orderItem(index, firstProduct.id, firstQuantity, firstProduct.price, 1),
    orderItem(index, secondProduct.id, secondQuantity, secondProduct.price, 2),
  ];

  if (thirdQuantity > 0) {
    items.push(orderItem(index, thirdProduct.id, thirdQuantity, thirdProduct.price, 3));
  }

  return {
    id: `ord-${String(index + 1).padStart(4, "0")}`,
    customerId: customer.id,
    shippingAddressId: customer.defaultAddressId,
    channel,
    status,
    currency: "GBP",
    orderedAt: orderedAtFor(index),
    subtotal,
    discountTotal,
    shippingTotal,
    grandTotal: money(subtotal - discountTotal + shippingTotal),
    items,
  };
});

export const returns: CommerceReturn[] = orders
  .filter((_order, index) => index % 8 === 0)
  .map((order, index) => ({
    id: `ret-${String(index + 1).padStart(3, "0")}`,
    orderId: order.id,
    productId: order.items[0].productId,
    reason: ["changed-mind", "damaged", "size-fit", "late-delivery"][
      index % 4
    ] as CommerceReturn["reason"],
    status: ["requested", "received", "refunded"][index % 3] as CommerceReturn["status"],
    requestedAt: requestedAtFor(index),
    refundAmount: order.items[0].lineTotal,
  }));

export const emailEvents: EmailEvent[] = customers.flatMap((customer, index) => {
  const campaign = promotions[index % promotions.length];

  return [
    {
      id: `email-${customer.id}-sent`,
      customerId: customer.id,
      campaignId: campaign.id,
      eventType: "sent",
      occurredAt: emailEventAtFor(index, 0),
    },
    {
      id: `email-${customer.id}-opened`,
      customerId: customer.id,
      campaignId: campaign.id,
      eventType: "opened",
      occurredAt: emailEventAtFor(index, 1),
    },
    {
      id: `email-${customer.id}-engaged`,
      customerId: customer.id,
      campaignId: campaign.id,
      eventType: index % 9 === 0 ? "conversion" : index % 3 === 0 ? "clicked" : "opened",
      occurredAt: emailEventAtFor(index, 2),
    },
  ];
});

export const commerceData: CommerceData = {
  customers,
  addresses,
  orders,
  inventoryLocations,
  stockPositions,
  returns,
  emailEvents,
  promotions,
};

function customerIdFor(index: number): string {
  return `cust-${String(index + 1).padStart(3, "0")}`;
}

function streetFor(index: number): string {
  return [
    "Mare Street",
    "Camden Passage",
    "Upper Street",
    "Bermondsey Street",
    "Atlantic Road",
    "Royal Hill",
    "Northcote Road",
    "Bond Street",
  ][index % 8];
}

function postcodeFor(index: number): string {
  return `E${(index % 9) + 1} ${index + 2}AA`;
}

function orderedAtFor(index: number): string {
  if (index >= 220) {
    const day = String(((index - 220) % 14) + 1).padStart(2, "0");

    return `2026-12-${day}T${String(9 + (index % 10)).padStart(2, "0")}:15:00.000Z`;
  }

  if (index >= 120) {
    const day = String(((index - 120) % 10) + 20).padStart(2, "0");

    return `2026-11-${day}T${String(9 + (index % 10)).padStart(2, "0")}:15:00.000Z`;
  }

  const day = String((index % 28) + 1).padStart(2, "0");

  return `2026-05-${day}T${String(9 + (index % 10)).padStart(2, "0")}:15:00.000Z`;
}

function requestedAtFor(index: number): string {
  const day = String((index % 28) + 1).padStart(2, "0");

  return `2026-06-${day}T10:30:00.000Z`;
}

function emailEventAtFor(index: number, offset: number): string {
  const day = String((index % 20) + 1).padStart(2, "0");

  return `2026-05-${day}T${String(8 + offset + (index % 6)).padStart(2, "0")}:00:00.000Z`;
}

function orderItem(
  orderIndex: number,
  productId: string,
  quantity: number,
  unitPrice: number,
  itemNumber: number,
) {
  return {
    id: `ord-${String(orderIndex + 1).padStart(4, "0")}-item-${itemNumber}`,
    productId,
    quantity,
    unitPrice,
    lineTotal: money(quantity * unitPrice),
  };
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function seasonalDiscount(index: number): number {
  if (index >= 120) {
    return index % 6 === 0 ? 0.15 : 0.12;
  }

  return 0.1;
}
