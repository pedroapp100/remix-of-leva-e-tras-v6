import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import type { Role } from "@/types/database";

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) return <>{fallback}</>;
  return <>{children}</>;
}

interface CanAccessProps {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function CanAccess({ roles, children, fallback = null }: CanAccessProps) {
  const { role } = usePermissions();
  if (!role || !roles.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
