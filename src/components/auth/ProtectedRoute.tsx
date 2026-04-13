import { Navigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { BrandedLoader } from "@/components/shared/BrandedLoader";
import type { Role } from "@/types/database";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  requiredPermission?: string;
}

/**
 * Guard de rota parametrizável por roles e/ou permissões.
 * Se não autenticado → redirect para /login
 * Se sem permissão → redirect para rota padrão do role
 */
export function ProtectedRoute({ children, allowedRoles, requiredPermission }: ProtectedRouteProps) {
  const { user, role, isReady } = useAuth();
  const { hasPermission } = usePermissions();
  const [redirectGraceElapsed, setRedirectGraceElapsed] = useState(false);
  const hadAuthenticatedUserRef = useRef(false);

  const hasLocalSessionHint = (() => {
    if (typeof window === "undefined") return false;
    try {
      return Boolean(window.localStorage.getItem("lt-auth-session"));
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    if (user) {
      hadAuthenticatedUserRef.current = true;
    }
  }, [user]);

  const shouldHoldForRecovery = isReady && !user && (hasLocalSessionHint || hadAuthenticatedUserRef.current);

  useEffect(() => {
    if (!shouldHoldForRecovery) {
      setRedirectGraceElapsed(false);
      return;
    }

    const id = window.setTimeout(() => {
      setRedirectGraceElapsed(true);
    }, 8000);

    return () => {
      window.clearTimeout(id);
    };
  }, [shouldHoldForRecovery]);

  if (!isReady) {
    return <BrandedLoader fullPage size="lg" text="Carregando..." />;
  }

  if (!user) {
    if (shouldHoldForRecovery && !redirectGraceElapsed) {
      return <BrandedLoader fullPage size="lg" text="Restaurando sessão..." />;
    }
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const defaultRoutes: Record<Role, string> = {
      admin: "/",
      cliente: "/cliente",
      entregador: "/entregador",
    };
    return <Navigate to={defaultRoutes[role]} replace />;
  }

  // Check specific permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    const defaultRoutes: Record<Role, string> = {
      admin: "/admin",
      cliente: "/cliente",
      entregador: "/entregador",
    };
    return <Navigate to={defaultRoutes[role!] || "/"} replace />;
  }

  return <>{children}</>;
}
