import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { useOnboarding } from "./OnboardingContext";

/**
 * Syncs the auth role into the onboarding context.
 * Falls back to detecting role from URL path when no user is logged in (bypass mode).
 */
export function OnboardingRoleSync() {
  const { role } = useAuth();
  const { setRole } = useOnboarding();
  const location = useLocation();

  useEffect(() => {
    if (role) {
      setRole(role);
    } else {
      // Fallback: detect role from URL path for bypass mode
      const path = location.pathname;
      if (path.startsWith("/admin")) setRole("admin");
      else if (path.startsWith("/cliente")) setRole("cliente");
      else if (path.startsWith("/entregador")) setRole("entregador");
    }
  }, [role, location.pathname, setRole]);

  return null;
}
