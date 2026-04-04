import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Truck,
  Package,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  ScrollText,
  Wallet,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useGlobalStore } from "@/contexts/GlobalStore";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Solicitações", url: "/admin/solicitacoes", icon: ClipboardList },
  { title: "Clientes", url: "/admin/clientes", icon: Users },
  { title: "Entregadores", url: "/admin/entregadores", icon: Truck },
  { title: "Entregas", url: "/admin/entregas", icon: Package },
  { title: "Caixas", url: "/admin/caixas-entregadores", icon: Wallet },
  { title: "Faturas", url: "/admin/faturas", icon: FileText },
  { title: "Financeiro", url: "/admin/financeiro", icon: DollarSign },
  { title: "Relatórios", url: "/admin/relatorios", icon: BarChart3 },
  { title: "Logs", url: "/admin/logs", icon: ScrollText },
];

export function AdminSidebar() {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { badges } = useNotifications();
  const { logout } = useAuth();
  const { canAccessSidebarItem, hasPermission } = usePermissions();

  const visibleNavItems = navItems.filter(item => canAccessSidebarItem(item.title));

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border !h-[calc(100svh-3.5rem)] md:!h-[calc(100svh-4rem)] !top-14 md:!top-16">
      {/* Chevron toggle — hidden on mobile (uses hamburger instead) */}
      {!isMobile && (
        <button
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          className="absolute -right-4 top-4 z-20 h-8 w-8 flex items-center justify-center rounded-full border-2 border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-sm hover:shadow-md"
        >
          <ChevronRight className={`h-4.5 w-4.5 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${collapsed ? "" : "rotate-180"}`} />
        </button>
      )}

      <SidebarContent data-onboarding="sidebar-nav">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className={`gap-2 md:gap-3 pt-6 md:pt-10 ${collapsed ? "items-center px-1" : "px-2"}`}>
              {visibleNavItems.map((item) => {
                const active = isActive(item.url);
                const badgeCount = item.title === "Solicitações" ? badges.solicitacoesPendentes
                  : item.title === "Faturas" ? badges.faturasVencidas
                  : 0;
                return (
                  <SidebarMenuItem key={item.title} className={collapsed ? "flex justify-center" : ""}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={`${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      } rounded-lg ${collapsed ? "h-10 w-10 justify-center p-0" : "h-10"}`}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/admin"}
                        className={`${collapsed ? "flex items-center justify-center" : ""} relative`}
                        activeClassName=""
                      >
                        <item.icon className="shrink-0 !h-5 !w-5" />
                        {!collapsed && <span className="text-lg font-medium">{item.title}</span>}
                        {badgeCount > 0 && (
                          <span className={`absolute ${collapsed ? "-top-1 -right-1" : "right-0 top-1/2 -translate-y-1/2"} flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-primary-foreground ${item.title === "Faturas" ? "bg-destructive" : "bg-primary"}`}>
                            {badgeCount}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={`border-t border-sidebar-border py-2 ${collapsed ? "px-1 items-center" : "px-2"}`}>
        <SidebarMenu className={`gap-1 ${collapsed ? "items-center" : ""}`}>
          {canAccessSidebarItem("Configurações") && (
          <SidebarMenuItem className={collapsed ? "flex justify-center" : ""}>
            <SidebarMenuButton
              asChild
              isActive={isActive("/admin/configuracoes")}
              tooltip="Configurações"
              className={`${
                isActive("/admin/configuracoes")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              } rounded-lg ${collapsed ? "h-10 w-10 justify-center p-0" : "h-10"}`}
            >
              <NavLink to="/admin/configuracoes" className={collapsed ? "flex items-center justify-center" : ""} activeClassName="">
                <Settings className="shrink-0 !h-5 !w-5" />
                {!collapsed && <span className="text-lg font-medium">Configurações</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          )}
          <SidebarMenuItem className={collapsed ? "flex justify-center" : ""}>
            <SidebarMenuButton
              onClick={logout}
              tooltip="Sair"
              className={`text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive cursor-pointer rounded-lg ${collapsed ? "h-10 w-10 justify-center p-0" : "h-10"}`}
            >
              <LogOut className="shrink-0 !h-5 !w-5" />
              {!collapsed && <span className="text-lg font-medium">Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
