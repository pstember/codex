import { loginAction, logoutAction } from "@/app/auth/actions";
import type { AuthenticatedUser } from "@/domain/users";
import { demoStaffPasswords } from "@/fixtures/users";

interface AuthPanelProps {
  currentUser: AuthenticatedUser | null;
  loginError?: boolean;
}

const demoStaffCredentials = [
  {
    role: "Manager",
    email: "manager@demo.com",
    password: demoStaffPasswords.manager,
  },
  {
    role: "Analyst",
    email: "analyst@demo.com",
    password: demoStaffPasswords.analyst,
  },
  {
    role: "Operator",
    email: "operator@demo.com",
    password: demoStaffPasswords.operator,
  },
];

export function AuthPanel({ currentUser, loginError = false }: AuthPanelProps) {
  return (
    <div className="rounded-lg border border-neutral-300 bg-white p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Staff access</p>
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
            Logout
          </button>
        </form>
      ) : (
        <div className="mt-4 space-y-4">
          {loginError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              Email or password did not match a staff account.
            </p>
          ) : null}
          <form action={loginAction} className="grid gap-3">
            <label className="grid gap-1 text-sm font-medium text-neutral-800">
              Email
              <input
                autoComplete="email"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                name="email"
                required
                type="email"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-neutral-800">
              Password
              <input
                autoComplete="current-password"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                name="password"
                required
                type="password"
              />
            </label>
            <button
              className="w-full rounded-md bg-neutral-950 px-4 py-3 text-sm font-semibold text-white"
              type="submit"
            >
              Sign in
            </button>
          </form>
          <div className="grid gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
            {demoStaffCredentials.map((credential) => (
              <p key={credential.email}>
                <span className="font-semibold">{credential.role}:</span> {credential.email} /{" "}
                {credential.password}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
