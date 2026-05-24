import { StorefrontInfoPage } from "@/app/components/StorefrontInfoPage";

export default function AboutPage() {
  return (
    <StorefrontInfoPage
      eyebrow="About"
      intro="Atlas & Co. curates practical gifts with a warm point of view: thoughtful pieces for home desks, commutes, coffee breaks, and easy thank-yous."
      title="About Atlas & Co."
    >
      <p>A considered gift shop built for useful keeps.</p>
      <p>
        We look for small upgrades that earn their place quickly: a better desk lamp, an easier
        coffee ritual, a weekend bag that actually gets used.
      </p>
      <p>
        Our edit is intentionally compact so shoppers can find something good fast, whether they are
        buying for a host, a teammate, a parent, or themselves.
      </p>
    </StorefrontInfoPage>
  );
}
