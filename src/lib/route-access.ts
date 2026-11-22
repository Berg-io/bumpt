/**
 * Which roles may open each protected page. Shared by the sidebar (to hide links)
 * and the protected layout (to send anyone else back to the dashboard), so a page
 * typed straight into the address bar behaves the same everywhere.
 * The API routes enforce their own roles; this only shapes the UI.
 */
export const ROUTE_ROLES: Record<string, string[]> = {
  "/admin/items": ["SUPER_ADMIN", "ADMIN"],
  "/admin/sources": ["SUPER_ADMIN", "ADMIN"],
  "/admin/logs": ["SUPER_ADMIN", "ADMIN"],
  "/admin/agents": ["SUPER_ADMIN", "ADMIN"],
  "/admin/users": ["SUPER_ADMIN"],
  "/admin/reports": ["SUPER_ADMIN"],
  "/admin/settings": ["SUPER_ADMIN"],
};

export function rolesForPath(pathname: string): string[] | undefined {
  const match = Object.keys(ROUTE_ROLES).find((route) => pathname === route || pathname.startsWith(route + "/"));
  return match ? ROUTE_ROLES[match] : undefined;
}

export function canAccessPath(pathname: string, role: string | undefined | null): boolean {
  const roles = rolesForPath(pathname);
  return !roles || (!!role && roles.includes(role));
}
