import Link from "next/link";

export default function ManualPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ef] text-neutral-950">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <Link className="text-sm font-semibold text-emerald-700" href="/">
          Atlas & Co.
        </Link>
        <h1 className="mt-4 text-5xl font-semibold">Demo manual</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Store Manager", "Use manager@demo.com to access deep metrics and Codex traces."],
            [
              "Store Operator",
              "Use operator@demo.com to approve campaigns and publish storefronts.",
            ],
            [
              "Guest",
              "Use guest@demo.com or the public store route to view the customer experience.",
            ],
          ].map(([title, body]) => (
            <article className="rounded-lg border border-neutral-300 bg-white p-6" key={title}>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{body}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 rounded-lg border border-neutral-300 bg-white p-6">
          <h2 className="text-lg font-semibold">Golden first query</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            What should we promote for Father’s Day based on margin, inventory, and conversion?
          </p>
        </div>
      </section>
    </main>
  );
}
