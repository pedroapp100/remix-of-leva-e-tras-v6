import type { Role } from "@/types/database";
import { PERMISSION_MODULES, MOCK_CARGOS } from "@/data/mockSettings";

// ── Permission keys derived from PERMISSION_MODULES ──
export type PermissionKey = string; // e.g. "dashboard.view", "clientes.edit"

// ── Module-to-sidebar/route mapping ──
export const MODULE_ROUTE_MAP: Record<string, { sidebarKey: string; route: string }> = {
  Dashboard: { sidebarKey: "Dashboard", route: "/admin" },
  "Solicitações": { sidebarKey: "Solicitações", route: "/admin/solicitacoes" },
  Clientes: { sidebarKey: "Clientes", route: "/admin/clientes" },
  Entregadores: { sidebarKey: "Entregadores", route: "/admin/entregadores" },
  Faturas: { sidebarKey: "Faturas", route: "/admin/faturas" },
  Financeiro: { sidebarKey: "Financeiro", route: "/admin/financeiro" },
  "Relatórios": { sidebarKey: "Relatórios", route: "/admin/relatorios" },
  Logs: { sidebarKey: "Logs", route: "/admin/logs" },
  "Configurações": { sidebarKey: "Configurações", route: "/admin/configuracoes" },
};

// Map sidebar title → required view permission
export const SIDEBAR_PERMISSION_MAP: Record<string, string> = {
  Dashboard: "dashboard.view",
  "Solicitações": "solicitacoes.view",
  Clientes: "clientes.view",
  Entregadores: "entregadores.view",
  Entregas: "solicitacoes.view", // entregas uses same permission as solicitacoes
  Faturas: "faturas.view",
  Financeiro: "financeiro.view",
  "Relatórios": "relatorios.view",
  Logs: "logs.view",
  "Configurações": "configuracoes.view",
};

// ── Default permissions per role ──
// Admin gets full permissions from their cargo, cliente/entregador get their own fixed set
export function getPermissionsForRole(role: Role, cargoId?: string): string[] {
  if (role === "admin") {
    // If cargoId provided, use that cargo's permissions
    if (cargoId) {
      const cargo = MOCK_CARGOS.find(c => c.id === cargoId);
      if (cargo) return cargo.permissions;
    }
    // Default: admin geral (cargo-1)
    const adminCargo = MOCK_CARGOS.find(c => c.id === "cargo-1");
    return adminCargo?.permissions ?? getAllPermissions();
  }

  if (role === "cliente") {
    return [
      "cliente.dashboard", "cliente.solicitacoes", "cliente.financeiro",
      "cliente.simulador", "cliente.perfil",
    ];
  }

  if (role === "entregador") {
    return [
      "entregador.dashboard", "entregador.solicitacoes", "entregador.historico",
      "entregador.financeiro", "entregador.perfil",
    ];
  }

  return [];
}

export function getAllPermissions(): string[] {
  return PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.key));
}

// ── Access level helpers for visual matrix ──
export type AccessLevel = "total" | "parcial" | "nenhum";

export function getModuleAccessLevel(modulePermKeys: string[], userPermissions: string[]): AccessLevel {
  const granted = modulePermKeys.filter(k => userPermissions.includes(k));
  if (granted.length === 0) return "nenhum";
  if (granted.length === modulePermKeys.length) return "total";
  return "parcial";
}
