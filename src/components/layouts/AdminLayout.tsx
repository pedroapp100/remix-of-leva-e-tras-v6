import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AppHeader } from "./AppHeader";

export function AdminLayout() {
  return (
    <>
      <SidebarProvider>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">Pular para o conteúdo</a>
        <div className="min-h-screen flex flex-col w-full">
          <AppHeader />
          <div className="flex flex-1 w-full">
            <AdminSidebar />
            <main id="main-content" className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
