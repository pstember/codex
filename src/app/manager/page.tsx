import { requireCurrentUser } from "@/app/auth/session";
import { AppChrome } from "@/app/components/AppChrome";

export default async function ManagerPage() {
  const user = await requireCurrentUser("ask_deep_metrics");

  return (
    <AppChrome eyebrow="Store Manager" title="Metrics command center" user={user}>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Deep data", "Ask product, margin, inventory, and conversion questions."],
          ["Codex traces", "Review generated GraphQL and validation steps."],
          ["Saved insights", "Persist recommendations before handing off to operators."],
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
