export const roles = ["manager", "operator", "guest"] as const;

export type Role = (typeof roles)[number];

export type Permission =
  | "ask_deep_metrics"
  | "view_codex_traces"
  | "approve_campaign"
  | "publish_storefront"
  | "view_storefront";

const rolePermissions: Record<Role, Permission[]> = {
  manager: ["ask_deep_metrics", "view_codex_traces", "view_storefront"],
  operator: ["approve_campaign", "publish_storefront", "view_storefront"],
  guest: ["view_storefront"],
};

export function can(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export function getPermissions(role: Role): Permission[] {
  return [...rolePermissions[role]];
}
