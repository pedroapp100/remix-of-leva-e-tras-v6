import React from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "./AppHeader";
import { OnboardingRoleSync } from "@/onboarding/OnboardingRoleSync";

import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { LayoutDashboard, ClipboardList, DollarSign, User, LogOut, ChevronRight, Truck, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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

const driverItems = [
  { title: "Dashboard", url: "/entregador", icon: LayoutDashboard },
  { title: "Solicitações", url: "/entregador/solicitacoes", icon: ClipboardList },
  { title: "Histórico", url: "/entregador/historico", icon: Truck },
  { title: "Meu Financeiro", url: "/entregador/financeiro", icon: DollarSign },
  { title: "Meu Caixa", url: "/entregador/caixa", icon: Wallet },
];

function DriverSidebar() {
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { logout } = useAuth();

  // Fecha sidebar mobile automaticamente ao mudar de rota
  React.useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [location.pathname, isMobile, setOpenMobile]);

  const handleLogout = () => {
    if (isMobile) setOpenMobile(false);
    logout();
  };

  const isActive = (path: string) => {
    if (path === "/entregador") return location.pathname === "/entregador";
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border !h-[calc(100svh-3.5rem)] md:!h-[calc(100svh-4rem)] !top-14 md:!top-16">
      {!isMobile && (
        <button
          onClick={toggleSidebar}
          className="absolute -right-4 top-4 z-20 h-8 w-8 flex items-center justify-center rounded-full border-2 border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-sm hover:shadow-md"
        >
          <ChevronRight className={`h-4.5 w-4.5 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${collapsed ? "" : "rotate-180"}`} />
        </button>
      )}

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className={`gap-2 md:gap-3 pt-6 md:pt-10 ${collapsed ? "items-center px-1" : "px-2"}`}>
              {driverItems.map((item) => {
                const active = isActive(item.url);
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
                        end={item.url === "/entregador"}
                        className={collapsed ? "flex items-center justify-center" : ""}
                        activeClassName=""
                      >
                        <item.icon className="shrink-0 !h-5 !w-5" />
                        {!collapsed && <span className="text-lg font-medium">{item.title}</span>}
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
          <SidebarMenuItem className={collapsed ? "flex justify-center" : ""}>
            <SidebarMenuButton
              asChild
              isActive={isActive("/entregador/perfil")}
              tooltip="Meu Perfil"
              className={`${
                isActive("/entregador/perfil")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              } rounded-lg ${collapsed ? "h-10 w-10 justify-center p-0" : "h-10"}`}
            >
              <NavLink to="/entregador/perfil" className={collapsed ? "flex items-center justify-center" : ""} activeClassName="">
                <User className="shrink-0 !h-5 !w-5" />
                {!collapsed && <span className="text-lg font-medium">Meu Perfil</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className={collapsed ? "flex justify-center" : ""}>
            <SidebarMenuButton
              onClick={handleLogout}
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

export function DriverLayout() {
  return (
    <>
      <OnboardingRoleSync />
      <SidebarProvider>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">Pular para o conteúdo</a>
        <div className="min-h-screen flex flex-col w-full">
          <AppHeader />
          <div className="flex flex-1 w-full">
            <DriverSidebar />
            <main id="main-content" className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
