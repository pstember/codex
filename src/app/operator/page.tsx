import { requireCurrentUser } from "@/app/auth/session";
import { AppChrome } from "@/app/components/AppChrome";

export default async function OperatorPage() {
  const user = await requireCurrentUser("publish_storefront");

  return (
    <AppChrome eyebrow="Store Operator" title="Campaign activation" user={user}>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Product placement", "Choose what appears in each storefront section."],
          ["Campaign approval", "Review Codex proposals before publishing."],
          ["Publish controls", "Ship, compare, and roll back storefront versions."],
        ].map(([title, body]) => (
          <article className="rounded-lg border border-neutral-300 bg-white p-6" key={title}>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{body}</p>
          </article>
        ))}
      </section>
    </AppChrome>
  );
}
