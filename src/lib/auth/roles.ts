import type { Role } from "@prisma/client";

export const ADMIN_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN", "FINANCE", "SUPPORT"];

export const isAdminRole = (role: Role) => ADMIN_ROLES.includes(role);

/** Capability map so FINANCE/SUPPORT can be enabled later without touching call sites. */
export type Capability =
  | "clients:manage" | "plans:manage" | "subscriptions:manage"
  | "payments:manage" | "domains:manage" | "support:manage" | "settings:manage";

const CAPS: Record<Role, Capability[] | "all"> = {
  CLIENT: [],
  ADMIN: "all",
  SUPER_ADMIN: "all",
  FINANCE: ["payments:manage"],
  SUPPORT: ["support:manage", "domains:manage"],
};

export function can(role: Role, cap: Capability): boolean {
  const granted = CAPS[role];
  return granted === "all" || granted.includes(cap);
}
