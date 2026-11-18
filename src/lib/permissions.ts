export const memberRoles = [
  "owner",
  "admin",
  "project_manager",
  "site_supervisor",
  "accountant",
  "procurement_officer",
  "storekeeper",
  "sales_representative",
  "subcontractor",
  "client",
] as const;

export type MemberRole = (typeof memberRoles)[number];
export type Permission =
  | "projects:read"
  | "projects:create"
  | "projects:update"
  | "projects:archive"
  | "customers:read"
  | "customers:create"
  | "customers:update"
  | "customers:archive"
  | "reports:read"
  | "accounts:read"
  | "settings:read"
  | "settings:update"
  | "estimates:read"
  | "estimates:create"
  | "estimates:update"
  | "procurement:read"
  | "procurement:create"
  | "procurement:update"
  | "procurement:approve"
  | "procurement:receive";

const rolePermissions: Record<MemberRole, readonly Permission[]> = {
  owner: [
    "projects:read",
    "projects:create",
    "projects:update",
    "projects:archive",
    "customers:read",
    "customers:create",
    "customers:update",
    "customers:archive",
    "reports:read",
    "accounts:read",
    "settings:read",
    "settings:update",
    "estimates:read",
    "estimates:create",
    "estimates:update",
    "procurement:read",
    "procurement:create",
    "procurement:update",
    "procurement:approve",
    "procurement:receive",
  ],
  admin: [
    "projects:read",
    "projects:create",
    "projects:update",
    "projects:archive",
    "customers:read",
    "customers:create",
    "customers:update",
    "customers:archive",
    "reports:read",
    "accounts:read",
    "settings:read",
    "settings:update",
    "estimates:read",
    "estimates:create",
    "estimates:update",
    "procurement:read",
    "procurement:create",
    "procurement:update",
    "procurement:approve",
    "procurement:receive",
  ],
  project_manager: [
    "projects:read",
    "projects:create",
    "projects:update",
    "projects:archive",
    "customers:read",
    "customers:create",
    "customers:update",
    "customers:archive",
    "reports:read",
    "settings:read",
    "estimates:read",
    "estimates:create",
    "estimates:update",
    "procurement:read",
    "procurement:create",
    "procurement:approve",
  ],
  site_supervisor: [
    "projects:read",
    "projects:update",
    "customers:read",
    "reports:read",
    "estimates:read",
    "procurement:read",
  ],
  accountant: [
    "projects:read",
    "customers:read",
    "estimates:read",
    "estimates:update",
    "reports:read",
    "procurement:read",
    "procurement:approve",
  ],
  procurement_officer: [
    "projects:read",
    "customers:read",
    "procurement:read",
    "procurement:create",
    "procurement:update",
  ],
  storekeeper: ["projects:read", "procurement:read", "procurement:receive"],
  sales_representative: ["projects:read", "customers:read", "customers:create", "customers:update"],
  subcontractor: [],
  client: [],
};

export function isMemberRole(role: string): role is MemberRole {
  return memberRoles.some((memberRole) => memberRole === role);
}

export function hasPermission(
  role: MemberRole,
  permission: Permission,
): boolean {
  return rolePermissions[role].includes(permission);
}
