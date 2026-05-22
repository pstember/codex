import { loginAction, logoutAction } from "@/app/auth/actions";
import type { AuthenticatedUser } from "@/domain/users";
import { demoUsers } from "@/fixtures/users";

interface AuthPanelProps {
  currentUser: AuthenticatedUser | null;
}

export function AuthPanel({ currentUser }: AuthPanelProps) {
  return (
    <div className="rounded-lg border border-neutral-300 bg-white p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Demo access</p>
      {currentUser ? (
        <form action={logoutAction} className="mt-4 space-y-4">
          <div>
            <p className="text-lg font-semibold">{currentUser.name}</p>
            <p className="text-sm text-neutral-600">
              {currentUser.email} · {currentUser.role}
            </p>
          </div>
          <button
            className="w-full rounded-md bg-neutral-950 px-4 py-3 text-sm font-semibold text-white"
            type="submit"
          >
            Sign out
          </button>
        </form>
      ) : (
        <div className="mt-4 grid gap-3">
          {demoUsers.map((user) => (
            <form action={loginAction} key={user.id}>
              <input name="email" type="hidden" value={user.email} />
              <button
                className="w-full rounded-md border border-neutral-300 px-4 py-3 text-left transition hover:border-neutral-950 hover:bg-neutral-50"
                type="submit"
              >
                <span className="block text-sm font-semibold">{user.name}</span>
                <span className="block text-xs capitalize text-neutral-600">{user.role}</span>
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
