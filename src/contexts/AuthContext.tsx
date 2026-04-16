import { createContext, useContext, useState, useCallback, type ReactNode, useEffect, useRef } from "react";
import type { Role } from "@/types/database";
import { getPermissionsForRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

// ── Auth user ──
export interface AuthUser {
  id: string;
  email: string;
  nome: string;
  role: Role;
  cargo_id?: string;
  avatarUrl?: string;
  permissions?: string[];
}

// ── Rate limiting (UI protection — Supabase has server-side limits too) ──
interface LoginAttempt {
  count: number;
  firstAttemptAt: number;
}

const MAX_ATTEMPTS = 5;
const BLOCK_WINDOW_MS = 5 * 60 * 1000; // 5 minutos

// ── Error mapping PT-BR ──
const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email ou senha incorretos.",
  email_not_confirmed: "Confirme seu email antes de entrar.",
  too_many_attempts: "Muitas tentativas. Tente novamente em 5 minutos.",
  user_inactive: "Conta inativa. Entre em contato com o administrador.",
  unknown: "Erro inesperado. Tente novamente.",
};

function isRole(value: unknown): value is Role {
  return value === "admin" || value === "cliente" || value === "entregador";
}

/** Resultado detalhado do profileToAuthUser */
interface ProfileResult {
  user: AuthUser | null;
  reason: "ok" | "db_error" | "inactive" | "invalid_role" | "not_found";
}

/**
 * Carrega profile usando fetch direto (sem SDK) — para o bootstrap inicial.
 * Evita completamente o auth layer do SDK que pode travar em token refresh.
 * Retorna null se o token está expirado (401) — onAuthStateChange corrigirá depois.
 */
async function profileToAuthUserDirect(userId: string, email: string, accessToken: string): Promise<ProfileResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "apikey": supabaseAnonKey,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const [profileRes, cargosRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,nome,role,cargo_id,avatar,ativo`,
        { headers, signal: controller.signal }
      ),
      fetch(`${supabaseUrl}/rest/v1/cargos?select=id,name,description,permissions`, {
        headers, signal: controller.signal,
      }),
    ]);

    if (profileRes.status === 401 || cargosRes.status === 401) {
      // Token expirado — SDK vai fazer refresh via onAuthStateChange
      return { user: null, reason: "db_error" };
    }

    if (!profileRes.ok) return { user: null, reason: "db_error" };

    const profiles = await profileRes.json() as Array<{ id: string; nome: string; role: string; cargo_id: string | null; avatar: string | null; ativo: boolean }>;
    const profile = profiles[0];
    if (!profile) return { user: null, reason: "not_found" };
    if (!profile.ativo) return { user: null, reason: "inactive" };
    if (!isRole(profile.role)) return { user: null, reason: "invalid_role" };

    const cargos = cargosRes.ok ? (await cargosRes.json() as Array<{ id: string; name: string; description: string; permissions: string[] }>) : [];

    return {
      user: {
        id: profile.id,
        email,
        nome: profile.nome,
        role: profile.role,
        cargo_id: profile.cargo_id ?? undefined,
        avatarUrl: profile.avatar ?? undefined,
        permissions: getPermissionsForRole(profile.role, profile.cargo_id ?? undefined, cargos),
      },
      reason: "ok",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}



// ── Context type ──
interface AuthContextType {
  user: AuthUser | null;
  role: Role | null;
  isReady: boolean;
  loading: boolean;
  isBlocked: boolean;
  remainingAttempts: number;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; user?: AuthUser; error?: string }>;
  logout: () => void;
  changeCargo: (cargoId: string) => void;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Role-based redirect paths ──
export const ROLE_REDIRECTS: Record<Role, string> = {
  admin: "/admin",
  cliente: "/cliente",
  entregador: "/entregador",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt>({ count: 0, firstAttemptAt: 0 });
  const transitionTimeoutRef = useRef<number | null>(null);
  // Rastreia se o AuthProvider ainda está montado — usado em callbacks assíncronos
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearTransitionTimeout = useCallback(() => {
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, []);

  // ── Inicialização: restaurar sessão SEM depender de getSession() do SDK ──
  //
  // FIX #13 — SOLUÇÃO DEFINITIVA para getSession() hang recorrente.
  //
  // PROBLEMA RAIZ: O SDK Supabase v2 usa um lock interno (_acquireInitializeLock)
  // durante getSession(). Se o token refresh trava (rede lenta, rate limit, token
  // corrupto), a Promise de getSession() fica pendurada indefinidamente — mesmo com
  // fetchWithTimeout e Promise.race. Timeouts, reloads e cleanup de localStorage
  // nunca resolveram 100% porque o lock é interno ao SDK.
  //
  // SOLUÇÃO: NÃO chamar getSession() na inicialização. Em vez disso:
  //   1. Ler a sessão do localStorage diretamente (0ms, zero risco de hang)
  //   2. Carregar o profile via query normal ao Supabase (usa anon key + token)
  //   3. Marcar isReady=true assim que o profile carrega (~200ms)
  //   4. Deixar o SDK cuidar do token em background via onAuthStateChange
  //
  // Se a sessão estiver expirada/inválida, o SDK eventualmente emite SIGNED_OUT
  // e o usuário é deslogado normalmente — sem hang, sem reload, sem erro visível.
  useEffect(() => {
    let mounted = true;
    let initialized = false;

    const AUTH_STORAGE_KEY = "lt-auth-session";
    const LEGACY_STORAGE_KEY = (() => {
      try {
        const host = new URL(import.meta.env.VITE_SUPABASE_URL as string).host;
        const projectRef = host.split(".")[0];
        return projectRef ? `sb-${projectRef}-auth-token` : null;
      } catch {
        return null;
      }
    })();

    const completeInitialization = () => {
      if (!initialized && mounted) {
        initialized = true;
        setIsReady(true);
      }
    };

    const clearStoredSession = () => {
      try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch { /**/ }
      try { if (LEGACY_STORAGE_KEY) localStorage.removeItem(LEGACY_STORAGE_KEY); } catch { /**/ }
    };

    // Safety timeout — último recurso se tudo falhar (profile query + onAuthStateChange)
    const safetyTimer = setTimeout(() => {
      if (!initialized) {
        console.warn("[Auth] Safety timeout (6s) — forçando inicialização.");
        completeInitialization();
      }
    }, 6000);

    // === FAST INIT: Ler sessão do localStorage diretamente ===
    // Zero dependência no SDK. Sem lock, sem rede, sem hang.
    const parseStoredSession = (): { userId: string; email: string; accessToken: string } | null => {
      try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);

        const userId = parsed?.user?.id;
        const email = parsed?.user?.email;
        const accessToken = parsed?.access_token;

        if (!userId || typeof userId !== "string" || !accessToken || typeof accessToken !== "string") {
          clearStoredSession();
          return null;
        }

        return { userId, email: email ?? "", accessToken };
      } catch {
        clearStoredSession();
        return null;
      }
    };

    // ── PASSO 1: Restaurar estado via fetch direto (100% bypass do SDK) ──
    // profileToAuthUserDirect usa fetch nativo com access_token do localStorage —
    // não passa pelo SDK, nunca trava em token refresh, nunca causa hang.
    const storedSession = parseStoredSession();

    if (storedSession) {
      console.log("[Auth] Sessão local encontrada, carregando profile via fetch direto...");
      profileToAuthUserDirect(storedSession.userId, storedSession.email, storedSession.accessToken)
        .then((result) => {
          if (!mounted) return;
          if (result.user) {
            setUser(result.user);
            console.log("[Auth] ✓ Sessão restaurada:", result.user.nome);
          } else if (result.reason === "inactive" || result.reason === "invalid_role" || result.reason === "not_found") {
            console.warn("[Auth] Profile inválido/inativo, limpando sessão.");
            setUser(null);
            clearStoredSession();
          }
          // reason=db_error (ex: 401 token expirado) — não limpar localStorage;
          // o SDK fará refresh via TOKEN_REFRESHED e atualizará o usuário.
          completeInitialization();
        })
        .catch((err) => {
          if (!mounted) return;
          console.error("[Auth] Erro ao carregar profile:", err);
          completeInitialization();
        });
    } else {
      console.log("[Auth] Nenhuma sessão local encontrada.");
      completeInitialization();
    }

    // ── PASSO 2: Subscrever eventos do SDK (non-blocking) ──
    // O SDK processa a sessão em background. Eventos vão corrigir qualquer
    // divergência entre nosso estado (baseado em localStorage) e o estado real.
    // INITIAL_SESSION: SDK terminou init interno
    // TOKEN_REFRESHED: novo access_token obtido
    // SIGNED_OUT: sessão inválida/revogada
    // SIGNED_IN: novo login
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        if (event === "INITIAL_SESSION") {
          // SDK terminou sua inicialização interna.
          if (session?.user) {
            // Sessão confirmada pelo SDK — atualizar profile via fetch direto
            const { user: authUser } = await profileToAuthUserDirect(
              session.user.id, session.user.email ?? "", session.access_token
            );
            if (mounted && authUser) {
              setUser(authUser);
            }
          } else if (!session && storedSession) {
            // SDK diz que não há sessão, mas tínhamos dados locais — sessão expirou
            console.log("[Auth] SDK confirmou: sessão expirada.");
            setUser(null);
            clearStoredSession();
          }
          completeInitialization();
          return;
        }

        if (event === "SIGNED_OUT") {
          setUser(null);
          completeInitialization();
          return;
        }

        if (event === "PASSWORD_RECOVERY") {
          // Sessão temporária de recovery — não carrega profile, apenas desbloqueia a app
          console.log("[Auth] PASSWORD_RECOVERY: sessão de recuperação ativa.");
          completeInitialization();
          return;
        }

        if (!session) {
          completeInitialization();
          return;
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          if (session.user) {
            const { user: authUser, reason } = await profileToAuthUserDirect(
              session.user.id, session.user.email ?? "", session.access_token
            );
            if (!mounted) return;

            if (authUser) {
              setUser(authUser);
            } else if (reason === "inactive" || reason === "invalid_role" || reason === "not_found") {
              setUser(null);
            }
          }
          completeInitialization();
        }
      } catch (err) {
        console.error("[Auth] onAuthStateChange error:", err);
        completeInitialization();
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const isBlocked = (() => {
    if (loginAttempts.count < MAX_ATTEMPTS) return false;
    const elapsed = Date.now() - loginAttempts.firstAttemptAt;
    return elapsed < BLOCK_WINDOW_MS;
  })();

  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - loginAttempts.count);

  const login = useCallback(async (email: string, password: string, _rememberMe = false) => {
    if (isBlocked) {
      return { success: false, error: ERROR_MESSAGES.too_many_attempts };
    }

    clearTransitionTimeout();
    setLoading(true);

    // Timeout de segurança: garante que loading volta a false em até 20s,
    // independente do estado das promises do Supabase.
    let loginTimeoutId: ReturnType<typeof window.setTimeout> | null = null;
    const loginTimeoutPromise = new Promise<{ success: false; error: string }>((resolve) => {
      loginTimeoutId = window.setTimeout(
        () => resolve({ success: false, error: "A operação demorou muito. Verifique sua conexão e tente novamente." }),
        20_000
      );
    });

    const doLogin = async (): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error || !data.user) {
          setLoginAttempts((prev) => ({
            count: prev.count + 1,
            firstAttemptAt: prev.count === 0 ? Date.now() : prev.firstAttemptAt,
          }));
          if (error?.message?.toLowerCase().includes("email not confirmed")) {
            return { success: false, error: ERROR_MESSAGES.email_not_confirmed };
          }
          return { success: false, error: ERROR_MESSAGES.invalid_credentials };
        }

        // Buscar profile via fetch direto (usa access_token do login, nunca chama getSession)
        const accessToken = data.session?.access_token ?? "";
        const { user: authUser, reason } = await profileToAuthUserDirect(data.user.id, data.user.email ?? email, accessToken);

        if (!authUser) {
          if (reason === "db_error") {
            return { success: false, error: "Erro ao conectar ao banco de dados. Tente novamente." };
          }
          await supabase.auth.signOut();
          return { success: false, error: ERROR_MESSAGES.user_inactive };
        }

        setUser(authUser);
        setLoginAttempts({ count: 0, firstAttemptAt: 0 });
        return { success: true, user: authUser };
      } catch (err) {
        console.error("[Auth] login error:", err);
        return { success: false, error: "Erro de conexão. Verifique sua internet e tente novamente." };
      }
    };

    try {
      return await Promise.race([doLogin(), loginTimeoutPromise]);
    } finally {
      // Garante que loading sempre volta a false, independente do caminho tomado
      if (loginTimeoutId !== null) window.clearTimeout(loginTimeoutId);
      setLoading(false);
    }
  }, [clearTransitionTimeout, isBlocked]);

  const logout = useCallback(() => {
    clearTransitionTimeout();
    setLoading(false);
    // Chama signOut — o onAuthStateChange vai setar user=null
    supabase.auth.signOut();
  }, [clearTransitionTimeout]);

  const changeCargo = useCallback(async (cargoId: string) => {
    if (!user || user.role !== "admin") return;

    const { error } = await supabase
      .from("profiles")
      .update({ cargo_id: cargoId })
      .eq("id", user.id);

    if (error) {
      console.error("[AuthContext] changeCargo falhou:", error.message);
      return;
    }

    // Optimistic update imediato com o novo cargo_id
    if (!mountedRef.current) return;
    setUser(prev => prev ? { ...prev, cargo_id: cargoId } : prev);

    // Busca permissões atualizadas do cargo e aplica
    const { data: cargos } = await supabase.from("cargos").select("id, name, description, permissions");
    if (!mountedRef.current) return;
    setUser(prev => prev ? { ...prev, cargo_id: cargoId, permissions: getPermissionsForRole("admin", cargoId, cargos ?? []) } : prev);
  }, [user]);

  const requestPasswordReset = useCallback(async (email: string) => {
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` }
    );

    setLoading(false);

    if (error) {
      return { success: false, error: ERROR_MESSAGES.unknown };
    }

    return { success: true };
  }, []);

  const resetPassword = useCallback(async (newPassword: string) => {
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (!error) {
      // Encerra sessão temporária de recovery — usuário deve fazer login normal
      await supabase.auth.signOut({ scope: "local" });
    }

    setLoading(false);

    if (error) {
      return { success: false, error: "Não foi possível atualizar a senha. O link pode ter expirado." };
    }

    return { success: true };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isReady,
        loading,
        isBlocked,
        remainingAttempts,
        login,
        logout,
        changeCargo,
        requestPasswordReset,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
