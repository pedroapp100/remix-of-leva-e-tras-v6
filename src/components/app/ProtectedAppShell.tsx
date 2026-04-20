import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CaixaStoreProvider } from "@/contexts/CaixaStore";
import { LogStoreProvider } from "@/contexts/LogStore";
import { NotificationProvider } from "@/contexts/NotificationContext";
import type { Role } from "@/types/database";

interface ProtectedAppShellProps {
  allowedRoles: Role[];
  children: ReactNode;
}

export function ProtectedAppShell({ allowedRoles, children }: ProtectedAppShellProps) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <LogStoreProvider>
        <CaixaStoreProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </CaixaStoreProvider>
      </LogStoreProvider>
    </ProtectedRoute>
  );
}
