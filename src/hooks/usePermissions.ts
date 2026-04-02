import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types/database";
import { SIDEBAR_PERMISSION_MAP } from "@/lib/permissions";

/**
 * Hook para verificação granular de permissões por role e permission keys.
 */
export function usePermissions() {
  const { role, user } = useAuth();

  const permissions = user?.permissions ?? [];
  const isBypassMode = !user;

  const hasRole = (requiredRole: Role) => role === requiredRole;
  const hasAnyRole = (roles: Role[]) => role !== null && roles.includes(role);
  const isAdmin = role === "admin";
  const isCliente = role === "cliente";
  const isEntregador = role === "entregador";

  /** Check if user has a specific permission key (e.g. "clientes.edit") */
  const hasPermission = (key: string) => isBypassMode || permissions.includes(key);

  /** Check if user has ALL listed permissions */
  const hasAllPermissions = (keys: string[]) => isBypassMode || keys.every(k => permissions.includes(k));

  /** Check if user has ANY of listed permissions */
  const hasAnyPermission = (keys: string[]) => isBypassMode || keys.some(k => permissions.includes(k));

  /** Check if a sidebar item should be visible based on permission.
   * If no user is logged in (bypass/demo mode), show all items. */
  const canAccessSidebarItem = (title: string) => {
    if (isBypassMode) return true; // bypass mode — show everything
    const requiredPerm = SIDEBAR_PERMISSION_MAP[title];
    if (!requiredPerm) return true;
    return permissions.includes(requiredPerm);
  };

  return {
    role,
    permissions,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    canAccessSidebarItem,
    isAdmin,
    isCliente,
    isEntregador,
    isAuthenticated: role !== null,
  };
}
