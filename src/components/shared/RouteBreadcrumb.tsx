import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useMemo } from "react";

const ROUTE_LABELS: Record<string, string> = {
  admin: "Admin",
  cliente: "Cliente",
  entregador: "Entregador",
  solicitacoes: "Solicitações",
  clientes: "Clientes",
  entregadores: "Entregadores",
  entregas: "Entregas",
  "caixas-entregadores": "Caixas",
  faturas: "Faturas",
  financeiro: "Financeiro",
  relatorios: "Relatórios",
  logs: "Logs",
  configuracoes: "Configurações",
  perfil: "Perfil",
  historico: "Histórico",
  caixa: "Meu Caixa",
  simulador: "Simulador",
  corridas: "Corridas",
};

export function RouteBreadcrumb() {
  const location = useLocation();

  const crumbs = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length <= 1) return [];

    return parts.slice(1).map((part, i) => ({
      label: ROUTE_LABELS[part] || part,
      path: "/" + parts.slice(0, i + 2).join("/"),
      isLast: i === parts.length - 2,
    }));
  }, [location.pathname]);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link to={location.pathname.split("/").slice(0, 2).join("/") || "/"} className="flex items-center gap-1 hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.path} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
