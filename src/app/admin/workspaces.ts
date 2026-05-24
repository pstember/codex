import type { Permission } from "@/domain/roles";
import { can } from "@/domain/roles";
import type { AuthenticatedUser } from "@/domain/users";

export type AdminWorkspace = {
  accent: string;
  description: string;
  href: string;
  label: string;
  permission: Permission;
};

export const adminWorkspaces: AdminWorkspace[] = [
  {
    accent: "bg-[#d7ff3f]",
    description: "Review campaign handoffs, publish storefront versions, and compare launches.",
    href: "/admin/storefront",
    label: "Storefront Studio",
    permission: "publish_storefront",
  },
  {
    accent: "bg-[#67e8f9]",
    description: "Ask open commerce questions, inspect evidence, and follow the Codex trace.",
    href: "/admin/insights",
    label: "Insight",
    permission: "ask_deep_metrics",
  },
];

export function canOpenWorkspace(user: AuthenticatedUser, workspace: AdminWorkspace): boolean {
  return can(user.role, workspace.permission);
}
