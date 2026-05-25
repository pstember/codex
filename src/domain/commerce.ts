export type CommerceAddress = {
  id: string;
  customerId: string;
  line1: string;
  borough: string;
  postcode: string;
  city: "London";
  country: "GB";
};

export type CommerceCustomer = {
  id: string;
  email: string;
  name: string;
  segment: string;
  borough: string;
  defaultAddressId: string;
  lifetimeValue: number;
  ordersCount: number;
};

export type CommerceOrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CommerceOrder = {
  id: string;
  customerId: string;
  shippingAddressId: string;
  channel: "online" | "marketplace" | "retail";
  status: "paid" | "fulfilled" | "shipped" | "returned";
  currency: "GBP";
  orderedAt: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  grandTotal: number;
  items: CommerceOrderItem[];
};

export type InventoryLocation = {
  id: string;
  name: string;
  kind: "fulfilment" | "warehouse" | "supplier";
  city: string;
};

export type StockPosition = {
  productId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  reorderPoint: number;
};

export type CommerceReturn = {
  id: string;
  orderId: string;
  productId: string;
  reason: "changed-mind" | "damaged" | "size-fit" | "late-delivery";
  status: "requested" | "received" | "refunded";
  requestedAt: string;
  refundAmount: number;
};

export type EmailEvent = {
  id: string;
  customerId: string;
  campaignId: string;
  eventType: "sent" | "opened" | "clicked" | "conversion" | "unsubscribed";
  occurredAt: string;
};

export type Promotion = {
  id: string;
  title: string;
  segmentIds: string[];
  productIds: string[];
  discountPercent: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

export type CommerceData = {
  customers: CommerceCustomer[];
  addresses: CommerceAddress[];
  orders: CommerceOrder[];
  inventoryLocations: InventoryLocation[];
  stockPositions: StockPosition[];
  returns: CommerceReturn[];
  emailEvents: EmailEvent[];
  promotions: Promotion[];
};
