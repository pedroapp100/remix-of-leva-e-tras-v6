import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AppHeader } from "./AppHeader";
import { OnboardingRoleSync } from "@/onboarding/OnboardingRoleSync";
import { RouteBreadcrumb } from "@/components/shared/RouteBreadcrumb";

export function AdminLayout() {
  return (
    <>
      <OnboardingRoleSync />
      <SidebarProvider>
        <div className="min-h-screen flex flex-col w-full">
          <AppHeader />
          <div className="flex flex-1 w-full">
            <AdminSidebar />
            <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
              <RouteBreadcrumb />
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
