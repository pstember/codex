import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import type { AuthenticatedUser } from "@/domain/users";

interface AppChromeProps {
  user: AuthenticatedUser;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}

export function AppChrome({ user, title, eyebrow, children }: AppChromeProps) {
  return (
    <main className="min-h-screen bg-[#f7f4ef] text-neutral-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-4xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Signed in as {user.name} · {user.role}
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Link className="rounded-md border border-neutral-300 px-4 py-2 text-sm" href="/">
              Store
            </Link>
            <Link className="rounded-md border border-neutral-300 px-4 py-2 text-sm" href="/manual">
              Manual
            </Link>
            <Link className="rounded-md border border-neutral-300 px-4 py-2 text-sm" href="/admin">
              Admin
            </Link>
            <form action={logoutAction}>
              <button
                className="rounded-md bg-neutral-950 px-4 py-2 text-sm text-white"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
