import type { Role } from "@/types/database";
import type { Cargo } from "@/types/database";

// ── Permission Modules (static configuration) ──
export const PERMISSION_MODULES = [
  { module: "Dashboard", permissions: [{ key: "dashboard.view", label: "Visualizar" }] },
  { module: "Solicitações", permissions: [{ key: "solicitacoes.view", label: "Visualizar" }, { key: "solicitacoes.create", label: "Criar" }, { key: "solicitacoes.edit", label: "Editar" }, { key: "solicitacoes.delete", label: "Excluir" }] },
  { module: "Clientes", permissions: [{ key: "clientes.view", label: "Visualizar" }, { key: "clientes.create", label: "Criar" }, { key: "clientes.edit", label: "Editar" }, { key: "clientes.delete", label: "Excluir" }] },
  { module: "Entregadores", permissions: [{ key: "entregadores.view", label: "Visualizar" }, { key: "entregadores.create", label: "Criar" }, { key: "entregadores.edit", label: "Editar" }, { key: "entregadores.delete", label: "Excluir" }] },
  { module: "Faturas", permissions: [{ key: "faturas.view", label: "Visualizar" }, { key: "faturas.create", label: "Criar" }, { key: "faturas.edit", label: "Editar" }] },
  { module: "Financeiro", permissions: [{ key: "financeiro.view", label: "Visualizar" }, { key: "financeiro.edit", label: "Editar" }] },
  { module: "Relatórios", permissions: [{ key: "relatorios.view", label: "Visualizar" }, { key: "relatorios.export", label: "Exportar" }] },
  { module: "Logs", permissions: [{ key: "logs.view", label: "Visualizar" }, { key: "logs.export", label: "Exportar" }] },
  { module: "Configurações", permissions: [{ key: "configuracoes.view", label: "Visualizar" }, { key: "configuracoes.edit", label: "Editar" }] },
  { module: "Usuários", permissions: [{ key: "usuarios.view", label: "Visualizar" }, { key: "usuarios.create", label: "Criar" }, { key: "usuarios.edit", label: "Editar" }, { key: "usuarios.delete", label: "Excluir" }] },
];

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
export function getPermissionsForRole(role: Role, cargoId?: string, cargos: Cargo[] = []): string[] {
  if (role === "admin") {
    const allPerms = getAllPermissions();
    // If cargoId provided, use that cargo's permissions as base, but ensure all admin perms are included
    if (cargoId) {
      const cargo = cargos.find(c => c.id === cargoId);
      if (cargo) {
        const merged = new Set([...cargo.permissions, ...allPerms]);
        return Array.from(merged);
      }
    }
    // Default: full admin access
    return allPerms;
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
