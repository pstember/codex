import Link from "next/link";
import { adminWorkspaces, canOpenWorkspace } from "@/app/admin/workspaces";
import { logoutAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/app/auth/session";
import { AuthPanel } from "@/app/components/AuthPanel";

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const currentUser = await getCurrentUser();
  const params = await searchParams;
  const isForbidden = params?.error === "forbidden";

  if (currentUser) {
    return (
      <main className="d20-stage min-h-screen text-[#0b1020]">
        <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-8 px-6 py-10">
          <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <Link className="text-sm font-bold text-[#1d4ed8]" href="/">
                Atlas & Co.
              </Link>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-[#2563eb]">
                Staff admin
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-normal md:text-6xl">
                Choose your workspace
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5f6d83]">
                Signed in as {currentUser.name}. Jump into customer insight or manage the live
                storefront from one place.
              </p>
              {isForbidden ? (
                <p className="mt-4 rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                  You do not have access to that workspace.
                </p>
              ) : null}
            </div>
            <form action={logoutAction}>
              <button
                className="rounded-md bg-[#0b1020] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
                type="submit"
              >
                Logout
              </button>
            </form>
          </header>

          <nav className="grid gap-5 md:grid-cols-2">
            {adminWorkspaces.map((workspace) => (
              <WorkspaceCard
                accent={workspace.accent}
                description={workspace.description}
                disabled={!canOpenWorkspace(currentUser, workspace)}
                href={workspace.href}
                key={workspace.href}
                label={workspace.label}
              />
            ))}
          </nav>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7ff] text-neutral-950">
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
            Manager, Analyst, and Operator accounts control the demo workflow. Guests can browse the
            public storefront without an account.
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

function WorkspaceCard({
  accent,
  description,
  disabled,
  href,
  label,
}: {
  accent: string;
  description: string;
  disabled: boolean;
  href: string;
  label: string;
}) {
  const content = (
    <>
      <span className={`h-4 w-24 rounded-full ${disabled ? "bg-slate-300" : accent}`} />
      <span>
        <span
          className={`block text-4xl font-black tracking-normal md:text-5xl ${
            disabled ? "text-slate-500" : "text-[#0b1020]"
          }`}
        >
          {label}
        </span>
        <span
          className={`mt-4 block max-w-sm text-sm leading-6 ${disabled ? "text-slate-500" : "text-[#5f6d83]"}`}
        >
          {description}
        </span>
      </span>
      <span
        className={`text-sm font-bold transition ${
          disabled ? "text-slate-400" : "text-[#1d4ed8] group-hover:translate-x-1"
        }`}
      >
        {disabled ? "Unavailable" : "Open"}
      </span>
    </>
  );

  if (disabled) {
    return (
      <button
        aria-disabled="true"
        className="grid aspect-square min-h-[280px] cursor-not-allowed content-between rounded-lg border border-slate-200 bg-slate-100 p-7 text-left opacity-75 shadow-none"
        disabled
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      className="group grid aspect-square min-h-[280px] content-between rounded-lg border border-[#223b78]/15 bg-white p-7 shadow-[0_24px_80px_rgba(8,13,31,0.14)] transition hover:-translate-y-1 hover:border-[#14213d]"
      href={href}
    >
      {content}
    </Link>
  );
}
