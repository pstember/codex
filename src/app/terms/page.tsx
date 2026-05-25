import { StorefrontInfoPage } from "@/app/components/StorefrontInfoPage";

export default function TermsPage() {
  return (
    <StorefrontInfoPage
      eyebrow="Terms"
      intro="These terms explain how the Atlas & Co. storefront works, what shoppers can expect when placing an order, and how we handle common edge cases."
      title="Terms & Conditions"
    >
      <p>Orders in this demo are not processed for fulfilment or payment.</p>
      <p>
        For a live storefront, product availability, delivery windows, and promotional pricing would
        be confirmed at checkout and in your order confirmation email.
      </p>
      <p>
        We may update product descriptions, bundle contents, and promotional dates when inventory,
        suppliers, or seasonal plans change.
      </p>
    </StorefrontInfoPage>
  );
}
