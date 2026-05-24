import { StorefrontInfoPage } from "@/app/components/StorefrontInfoPage";

export default function PrivacyPage() {
  return (
    <StorefrontInfoPage
      eyebrow="Privacy"
      intro="Privacy at Atlas & Co. is meant to be readable. We collect only what helps us run orders, answer questions, and improve the storefront experience."
      title="Privacy at Atlas & Co."
    >
      <p>We only keep the information needed to run your order and support request.</p>
      <p>
        That can include contact details, delivery information, and basic order history so we can
        confirm purchases, resolve delivery issues, and handle returns.
      </p>
      <p>
        We do not sell personal information, and we keep marketing preferences separate so you can
        opt in or out without affecting your shopping experience.
      </p>
    </StorefrontInfoPage>
  );
}
