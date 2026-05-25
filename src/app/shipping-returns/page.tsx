import { StorefrontInfoPage } from "@/app/components/StorefrontInfoPage";

export default function ShippingReturnsPage() {
  return (
    <StorefrontInfoPage
      eyebrow="Delivery"
      intro="Delivery and returns should feel straightforward. These mock policies give the public storefront enough realism without overcomplicating the demo."
      title="Shipping & Returns"
    >
      <p>Standard delivery arrives in 2 to 4 working days across the UK.</p>
      <p>
        Express delivery is available for eligible postcodes, and tracking details are sent as soon
        as the parcel leaves our fulfilment partner.
      </p>
      <p>
        Most unused items can be returned within 30 days, with a longer window during key gifting
        seasons so shoppers have room for exchanges.
      </p>
    </StorefrontInfoPage>
  );
}
