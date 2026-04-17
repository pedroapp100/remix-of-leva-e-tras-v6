import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { QueryClient, QueryCache, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, ROLE_REDIRECTS } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { BrandedLoader } from "@/components/shared/BrandedLoader";
import { toast } from "sonner";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { OfflineBanner } from "@/components/OfflineBanner";
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
const NotificacoesPage = lazy(() => import("./pages/admin/NotificacoesPage"));

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

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Queries com meta.silent não exibem toast (ex: background checks, polling silencioso)
      if (query.meta?.silent) return;
      toast.error((error as Error).message || "Erro ao carregar dados");
    },
  }),
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error: Error) => {
        toast.error(error.message || "Erro ao salvar dados");
      },
    },
  },
});

function RouteFallback() {
  return <BrandedLoader fullPage size="lg" text="Carregando..." />;
}

/** Wraps each page in its own ErrorBoundary so a crash in one page doesn't take down the whole app */
function PageBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/** Limpa o cache do React Query quando o usuário autenticado muda (logout ou troca de conta) */
function CacheSentinel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // undefined = boot inicial — não limpa o cache
    if (prevUserIdRef.current === undefined) {
      prevUserIdRef.current = user?.id ?? null;
      return;
    }
    if (prevUserIdRef.current !== (user?.id ?? null)) {
      queryClient.clear();
    }
    prevUserIdRef.current = user?.id ?? null;
  }, [user?.id, queryClient]);

  return null;
}

function RootRedirect() {
  const { user, role, isReady } = useAuth();
  if (!isReady) return <RouteFallback />;
  if (!user) return <Index />;
  return <Navigate to={ROLE_REDIRECTS[role!] || "/admin"} replace />;
}

function RouteAnnouncer() {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const title = document.title;
    setAnnouncement(title ? `Navegou para ${title}` : "Página carregada");
  }, [location.pathname]);
  return <div aria-live="polite" aria-atomic="true" role="status" className="sr-only">{announcement}</div>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineBanner />
        <PWAInstallBanner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <CacheSentinel />
              <ErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <RouteAnnouncer />
                  <Routes>
                  {/* Public */}
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/login/reset" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

                  {/* Admin */}
                  <Route path="/admin" element={<ProtectedAppShell allowedRoles={["admin"]}><AdminLayout /></ProtectedAppShell>}>
                    <Route index element={<PageBoundary><AdminDashboard /></PageBoundary>} />
                    <Route path="solicitacoes" element={<PageBoundary><SolicitacoesPage /></PageBoundary>} />
                    <Route path="clientes" element={<PageBoundary><ClientesPage /></PageBoundary>} />
                    <Route path="entregadores" element={<PageBoundary><EntregadoresPage /></PageBoundary>} />
                    <Route path="entregas" element={<PageBoundary><EntregasPage /></PageBoundary>} />
                    <Route path="caixas-entregadores" element={<PageBoundary><CaixasEntregadoresPage /></PageBoundary>} />
                    <Route path="faturas" element={<PageBoundary><FaturasPage /></PageBoundary>} />
                    <Route path="financeiro" element={<PageBoundary><FinanceiroPage /></PageBoundary>} />
                    <Route path="relatorios" element={<PageBoundary><RelatoriosPage /></PageBoundary>} />
                    <Route path="logs" element={<PageBoundary><LogsPage /></PageBoundary>} />
                    <Route path="configuracoes" element={<PageBoundary><SettingsPage /></PageBoundary>} />
                    <Route path="notificacoes" element={<PageBoundary><NotificacoesPage /></PageBoundary>} />
                  </Route>

                  {/* Cliente */}
                  <Route path="/cliente" element={<ProtectedAppShell allowedRoles={["cliente"]}><ClientLayout /></ProtectedAppShell>}>
                    <Route index element={<PageBoundary><ClienteDashboard /></PageBoundary>} />
                    <Route path="solicitacoes" element={<PageBoundary><MinhasSolicitacoesPage /></PageBoundary>} />
                    <Route path="financeiro" element={<PageBoundary><ClienteFinanceiroPage /></PageBoundary>} />
                    <Route path="simulador" element={<PageBoundary><SimuladorClientePage /></PageBoundary>} />
                    <Route path="perfil" element={<PageBoundary><ClientePerfilPage /></PageBoundary>} />
                  </Route>

                  {/* Entregador */}
                  <Route path="/entregador" element={<ProtectedAppShell allowedRoles={["entregador"]}><DriverLayout /></ProtectedAppShell>}>
                    <Route index element={<PageBoundary><EntregadorDashboard /></PageBoundary>} />
                    <Route path="solicitacoes" element={<PageBoundary><EntregadorSolicitacoesPage /></PageBoundary>} />
                    <Route path="corridas" element={<PageBoundary><EntregadorCorridasPage /></PageBoundary>} />
                    <Route path="historico" element={<PageBoundary><EntregadorHistoricoPage /></PageBoundary>} />
                    <Route path="financeiro" element={<PageBoundary><EntregadorFinanceiroPage /></PageBoundary>} />
                    <Route path="caixa" element={<PageBoundary><EntregadorCaixaPage /></PageBoundary>} />
                    <Route path="perfil" element={<PageBoundary><EntregadorPerfilPage /></PageBoundary>} />
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
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
