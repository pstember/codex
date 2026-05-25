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
    { href: "/admin", label: "Admin" },
  ];

  return (
    <main className="d20-stage min-h-screen text-[#0b1020]">
      <div className="admin-shell mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-5 transition-[padding] duration-200 sm:px-6 lg:px-8">
        <header className="d20-card rounded-lg border px-5 py-4 shadow-[0_18px_60px_rgba(8,13,31,0.10)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2563eb]">
                {eyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-normal md:text-5xl">{title}</h1>
              <p className="mt-2 text-sm text-[#5f6d83]">
                Signed in as {user.name} · {user.role}
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => (
                <Link
                  className="rounded-md border border-[#c9d4e8] bg-white px-3 py-2 text-sm font-semibold text-[#14213d] transition hover:border-[#14213d] hover:bg-[#eef5ff]"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
              <form action={logoutAction}>
                <button
                  className="rounded-md bg-[#0b1020] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
                  type="submit"
                >
                  Logout
                </button>
              </form>
            </nav>
          </div>
        </header>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
