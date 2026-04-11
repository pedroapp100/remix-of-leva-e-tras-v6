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

/** Mapeia um profile do banco para o AuthUser usado pela aplicação */
async function profileToAuthUser(userId: string, email: string): Promise<ProfileResult> {
  const [profileResult, cargosResult] = await Promise.all([
    supabase.from("profiles").select("id, nome, role, cargo_id, avatar, ativo").eq("id", userId).single(),
    supabase.from("cargos").select("id, name, description, permissions"),
  ]);

  const { data: profile, error } = profileResult;
  if (error) return { user: null, reason: "db_error" };
  if (!profile) return { user: null, reason: "not_found" };
  if (!profile.ativo) return { user: null, reason: "inactive" };
  if (!isRole(profile.role)) return { user: null, reason: "invalid_role" };

  const cargos = cargosResult.data ?? [];

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

  // ── Inicialização: verificar sessão existente e subscrever mudanças ──
  useEffect(() => {
    let mounted = true;
    let initialized = false;

    /**
     * Marca o sistema como pronto (isReady=true).
     * Chamado exatamente UMA VEZ — primeira vez que qualquer uma dessas coisas completa:
     * 1. getSession() retorna (sucesso ou erro)
     * 2. Safety timer de 15s expira (fallback se tudo falhar)
     */
    const completeInitialization = () => {
      if (!initialized && mounted) {
        initialized = true;
        setIsReady(true);
      }
    };

    // === TIMEOUT DE SEGURANÇA ===
    // Se getSession() travar por qualquer motivo, isto força isReady=true após 20s
    // OBS: 20s > timeout interno do Supabase (~10-15s) — é apenas um último recurso
    const safetyTimer = setTimeout(() => {
      if (!initialized) {
        console.warn("[Auth] Safety timeout (20s) — getSession nunca completou. Verifique a conexão com Supabase.");
        completeInitialization();
      }
    }, 20000);

    // === BUSCAR SESSÃO EXISTENTE ===
    console.log("[Auth] Verificando sessão...");
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return;

        if (session?.user) {
          // Sessão existe — carregar dados do profile
          console.log("[Auth] Sessão encontrada, carregando profile...");
          try {
            const { user: authUser } = await profileToAuthUser(session.user.id, session.user.email ?? "");
            if (mounted) setUser(authUser);
            console.log("[Auth] ✓ User autenticado:", authUser?.nome);
          } catch (err) {
            console.error("[Auth] Erro ao carregar profile:", err);
          }
        } else {
          console.log("[Auth] Nenhuma sessão existente");
        }

        completeInitialization();
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("[Auth] Erro ao buscar sessão:", err?.message ?? err);
        // Limpar localStorage corrompido se houver
        try { localStorage.removeItem("lt-auth-session"); } catch { /**/ }
        completeInitialization();
      });

    // === SUBSCREVER MUDANÇAS DE AUTENTICAÇÃO ===
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        if (event === "INITIAL_SESSION") {
          // Already handled by getSession above
          return;
        }

        if (event === "SIGNED_OUT" || !session) {
          setUser(null);
          completeInitialization();
          return;
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          if (session.user) {
            const { user: authUser } = await profileToAuthUser(session.user.id, session.user.email ?? "");
            if (mounted) setUser(authUser);
          }
          completeInitialization();
        }
      } catch (err) {
        console.error("[Auth] onAuthStateChange error:", err);
        completeInitialization();
      }
    });

    // === LIMPAR RECURSOS AO DESMONTAR ===
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

        // Buscar profile do banco
        const { user: authUser, reason } = await profileToAuthUser(data.user.id, data.user.email ?? email);

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

    setLoading(false);

    if (error) {
      return { success: false, error: ERROR_MESSAGES.unknown };
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
