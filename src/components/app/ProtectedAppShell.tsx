import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CaixaStoreProvider } from "@/contexts/CaixaStore";
import { GlobalStoreProvider } from "@/contexts/GlobalStore";
import { LogStoreProvider } from "@/contexts/LogStore";
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
        <GlobalStoreProvider>
          <CaixaStoreProvider>
            <OnboardingProvider>
              <WelcomeModal />
              <OnboardingOverlay />
              <OnboardingTooltip />
              {children}
            </OnboardingProvider>
          </CaixaStoreProvider>
        </GlobalStoreProvider>
      </LogStoreProvider>
    </ProtectedRoute>
  );
}