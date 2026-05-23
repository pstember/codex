import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/auth/session";
import { AuthPanel } from "@/app/components/AuthPanel";

const routeByRole = {
  manager: "/manager",
  operator: "/operator",
  guest: "/",
} as const;

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const currentUser = await getCurrentUser();
  const params = await searchParams;

  if (currentUser) {
    redirect(routeByRole[currentUser.role]);
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-neutral-950">
      <section className="mx-auto grid min-h-screen max-w-5xl items-center gap-8 px-6 py-10 md:grid-cols-[1fr_380px]">
        <div>
          <Link className="text-sm font-semibold text-emerald-700" href="/">
            Atlas & Co.
          </Link>
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Staff admin
          </p>
          <h1 className="mt-3 text-5xl font-semibold leading-tight">Sign in to the back office</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-neutral-700">
            Manager and Operator accounts control the demo workflow. Guests can browse the public
            storefront without an account.
          </p>
          <Link
            className="mt-6 inline-flex rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold"
            href="/"
          >
            Open public store
          </Link>
        </div>
        <AuthPanel currentUser={null} loginError={params?.error === "invalid"} />
      </section>
    </main>
  );
}
