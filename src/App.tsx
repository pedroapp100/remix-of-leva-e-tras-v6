import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, ROLE_REDIRECTS } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { UserStoreProvider } from "@/data/mockUsers";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { BrandedLoader } from "@/components/shared/BrandedLoader";
import Index from "./pages/Index";

const ProtectedAppShell = lazy(() =>
  import("./components/app/ProtectedAppShell").then((module) => ({ default: module.ProtectedAppShell }))
);

const AdminLayout = lazy(() =>
  import("./components/layouts/AdminLayout").then((module) => ({ default: module.AdminLayout }))
);
const ClientLayout = lazy(() =>
  import("./components/layouts/ClientLayout").then((module) => ({ default: module.ClientLayout }))
);
const DriverLayout = lazy(() =>
  import("./components/layouts/DriverLayout").then((module) => ({ default: module.DriverLayout }))
);

const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const SolicitacoesPage = lazy(() => import("./pages/admin/SolicitacoesPage"));
const ClientesPage = lazy(() => import("./pages/admin/ClientesPage"));
const EntregadoresPage = lazy(() => import("./pages/admin/EntregadoresPage"));
const EntregasPage = lazy(() => import("./pages/admin/EntregasPage"));
const CaixasEntregadoresPage = lazy(() => import("./pages/admin/CaixasEntregadoresPage"));
const FaturasPage = lazy(() => import("./pages/admin/FaturasPage"));
const FinanceiroPage = lazy(() => import("./pages/admin/FinanceiroPage"));
const RelatoriosPage = lazy(() => import("./pages/admin/RelatoriosPage"));
const LogsPage = lazy(() => import("./pages/admin/LogsPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));

const ClienteDashboard = lazy(() => import("./pages/cliente/ClienteDashboard"));
const MinhasSolicitacoesPage = lazy(() => import("./pages/cliente/MinhasSolicitacoesPage"));
const ClienteFinanceiroPage = lazy(() => import("./pages/cliente/ClienteFinanceiroPage"));
const ClientePerfilPage = lazy(() => import("./pages/cliente/ClientePerfilPage"));
const SimuladorClientePage = lazy(() => import("./pages/cliente/SimuladorClientePage"));

const EntregadorDashboard = lazy(() => import("./pages/entregador/EntregadorDashboard"));
const EntregadorSolicitacoesPage = lazy(() => import("./pages/entregador/EntregadorSolicitacoesPage"));
const EntregadorHistoricoPage = lazy(() => import("./pages/entregador/EntregadorHistoricoPage"));
const EntregadorFinanceiroPage = lazy(() => import("./pages/entregador/EntregadorFinanceiroPage"));
const EntregadorPerfilPage = lazy(() => import("./pages/entregador/EntregadorPerfilPage"));
const EntregadorCorridasPage = lazy(() => import("./pages/entregador/EntregadorCorridasPage"));
const EntregadorCaixaPage = lazy(() => import("./pages/entregador/EntregadorCaixaPage"));

const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function RouteFallback() {
  return <BrandedLoader fullPage size="lg" text="Carregando..." />;
}

function RootRedirect() {
  const { user, role, isReady } = useAuth();
  if (!isReady) return <RouteFallback />;
  if (!user) return <Index />;
  return <Navigate to={ROLE_REDIRECTS[role!] || "/admin"} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <UserStoreProvider>
            <AuthProvider>
              <ErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                  {/* Public */}
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/login/reset" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

                  {/* Admin */}
                  <Route path="/admin" element={<ProtectedAppShell allowedRoles={["admin"]}><AdminLayout /></ProtectedAppShell>}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="solicitacoes" element={<SolicitacoesPage />} />
                    <Route path="clientes" element={<ClientesPage />} />
                    <Route path="entregadores" element={<EntregadoresPage />} />
                    <Route path="entregas" element={<EntregasPage />} />
                    <Route path="caixas-entregadores" element={<CaixasEntregadoresPage />} />
                    <Route path="faturas" element={<FaturasPage />} />
                    <Route path="financeiro" element={<FinanceiroPage />} />
                    <Route path="relatorios" element={<RelatoriosPage />} />
                    <Route path="logs" element={<LogsPage />} />
                    <Route path="configuracoes" element={<SettingsPage />} />
                  </Route>

                  {/* Cliente */}
                  <Route path="/cliente" element={<ProtectedAppShell allowedRoles={["cliente"]}><ClientLayout /></ProtectedAppShell>}>
                    <Route index element={<ClienteDashboard />} />
                    <Route path="solicitacoes" element={<MinhasSolicitacoesPage />} />
                    <Route path="financeiro" element={<ClienteFinanceiroPage />} />
                    <Route path="simulador" element={<SimuladorClientePage />} />
                    <Route path="perfil" element={<ClientePerfilPage />} />
                  </Route>

                  {/* Entregador */}
                  <Route path="/entregador" element={<ProtectedAppShell allowedRoles={["entregador"]}><DriverLayout /></ProtectedAppShell>}>
                    <Route index element={<EntregadorDashboard />} />
                    <Route path="solicitacoes" element={<EntregadorSolicitacoesPage />} />
                    <Route path="corridas" element={<EntregadorCorridasPage />} />
                    <Route path="historico" element={<EntregadorHistoricoPage />} />
                    <Route path="financeiro" element={<EntregadorFinanceiroPage />} />
                    <Route path="caixa" element={<EntregadorCaixaPage />} />
                    <Route path="perfil" element={<EntregadorPerfilPage />} />
                  </Route>

                    {/* Redirects for convenience */}
                    <Route path="/clientes" element={<Navigate to="/admin/clientes" replace />} />
                    <Route path="/entregadores" element={<Navigate to="/admin/entregadores" replace />} />
                    <Route path="/solicitacoes" element={<Navigate to="/admin/solicitacoes" replace />} />
                    <Route path="/faturas" element={<Navigate to="/admin/faturas" replace />} />
                    <Route path="/financeiro" element={<Navigate to="/admin/financeiro" replace />} />
                    <Route path="/relatorios" element={<Navigate to="/admin/relatorios" replace />} />
                    <Route path="/configuracoes" element={<Navigate to="/admin/configuracoes" replace />} />
                    <Route path="/caixas" element={<Navigate to="/admin/caixas-entregadores" replace />} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </AuthProvider>
          </UserStoreProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
