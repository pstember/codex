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
  const navItems = [
    { href: "/", label: "Store" },
    { href: "/manager", label: "Manager" },
    { href: "/operator", label: "Operator" },
    { href: "/manual", label: "Manual" },
    { href: "/admin", label: "Admin" },
  ];

  return (
    <main className="min-h-screen bg-[#f3f0e8] text-[#17241f]">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-[#1d332d]/15 bg-[#fffef9] px-5 py-4 shadow-[0_18px_60px_rgba(28,42,37,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2d6d53]">
                {eyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal md:text-4xl">{title}</h1>
              <p className="mt-2 text-sm text-[#5f6d67]">
                Signed in as {user.name} · {user.role}
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => (
                <Link
                  className="rounded-md border border-[#cdd7cf] bg-white px-3 py-2 text-sm font-semibold text-[#243b35] transition hover:border-[#243b35] hover:bg-[#edf4ef]"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
              <form action={logoutAction}>
                <button
                  className="rounded-md bg-[#17241f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2c473c]"
                  type="submit"
                >
                  Sign out
                </button>
              </form>
            </nav>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
