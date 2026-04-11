import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CaixaStoreProvider } from "@/contexts/CaixaStore";
import { LogStoreProvider } from "@/contexts/LogStore";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { OnboardingOverlay, OnboardingProvider, OnboardingTooltip, WelcomeModal } from "@/onboarding";
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
            <OnboardingProvider>
              <WelcomeModal />
              <OnboardingOverlay />
              <OnboardingTooltip />
              {children}
            </OnboardingProvider>
          </NotificationProvider>
        </CaixaStoreProvider>
      </LogStoreProvider>
    </ProtectedRoute>
  );
}
