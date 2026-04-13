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

    const AUTH_STORAGE_KEY = "lt-auth-session";
    const RELOAD_GUARD_KEY = "lt-auth-timeout-reloaded-once";
    const LEGACY_STORAGE_KEY = (() => {
      try {
        const host = new URL(import.meta.env.VITE_SUPABASE_URL as string).host;
        const projectRef = host.split(".")[0];
        return projectRef ? `sb-${projectRef}-auth-token` : null;
      } catch {
        return null;
      }
    })();

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
    // Último recurso. O timeout real está no fetch layer (10s para auth).
    // Este timer só dispara se algo totalmente inesperado acontecer.
    const safetyTimer = setTimeout(() => {
      if (!initialized) {
        console.warn("[Auth] Safety timeout (12s) — fallback absoluto.");
        try {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          if (LEGACY_STORAGE_KEY) localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch { /**/ }
        completeInitialization();
      }
    }, 12000);

    // === PRÉ-CHECK: LIMPAR SESSÃO EXPIRADA ANTES DE CHAMAR getSession ===
    // O SDK v2 detecta access token expirado e tenta refresh de rede.
    // Se a rede está lenta/Supabase pausado, esse refresh trava até 8s (timeout).
    // Limpeza antecipada evita toda essa espera: sem token em disco = sem refresh.
    //
    // ⛔ FIX #12 — CHAVE CORRETA: O cliente Supabase em supabase.ts usa storageKey: "lt-auth-session".
    // Antes estava derivando a chave como `sb-${projectRef}-auth-token` (chave padrão do Supabase),
    // mas como configuramos uma chave customizada, o token NUNCA era encontrado aqui,
    // fazendo esta proteção nunca funcionar — toda sessão expirada causava o timeout de 8s.
    const clearExpiredLocalSession = (): boolean => {
      try {
        // Chave customizada definida em src/lib/supabase.ts → storageKey: "lt-auth-session"
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return false;

        const parsed = JSON.parse(raw) as {
          expires_at?: number;
          currentSession?: { expires_at?: number; access_token?: string | null; refresh_token?: string | null };
          access_token?: string | null;
          refresh_token?: string | null;
        };

        const expiresAt = parsed?.expires_at ?? parsed?.currentSession?.expires_at;
        const accessToken = parsed?.access_token ?? parsed?.currentSession?.access_token;
        const refreshToken = parsed?.refresh_token ?? parsed?.currentSession?.refresh_token;

        // Alguns ambientes/versões podem serializar o estado sem todos os campos esperados.
        // Para evitar falso positivo de "sessão corrompida" (e logout indevido), só
        // limpamos automaticamente quando há evidência forte de expiração (expiresAt).
        if (!accessToken || !refreshToken) {
          return false;
        }

        if (!expiresAt) return false;
        if (expiresAt * 1000 < Date.now()) {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          if (LEGACY_STORAGE_KEY) localStorage.removeItem(LEGACY_STORAGE_KEY);
          console.log("[Auth] Token local expirado descartado — login necessário.");
          return true;
        }
      } catch {
        try {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          if (LEGACY_STORAGE_KEY) localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch { /**/ }
        return true;
      }
      return false;
    };

    // Em localhost (dev), NÃO devemos limpar sessão válida a cada mount/reload.
    // Isso causava logout aparente em navegação hard (page.goto/refresh).
    // Mantemos a limpeza apenas para sessão expirada/corrompida via clearExpiredLocalSession().
    const isLocalDev =
      import.meta.env.MODE === "development" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    if (isLocalDev) {
      console.log("[Auth] localhost dev: preservando sessão local válida no bootstrap.");
    }

    // === BUSCAR SESSÃO EXISTENTE ===
    // DEFESA EM PROFUNDIDADE — duas camadas de proteção:
    //   1. fetchWithTimeout (10s) em supabase.ts: aborta a chamada de rede via AbortController
    //   2. Promise.race (8s) aqui: protege contra hang interno do SDK
    //
    // Por que as duas camadas são necessárias:
    //   O SDK Supabase v2 pode capturar o AbortError internamente (dentro de _acquireInitializeLock
    //   ou _refreshAccessToken) e não rejeitar/resolver a promise de getSession(), deixando-a pendurada
    //   indefinidamente. O fetch layer aborta a rede mas não garante que a promise do SDK resolva.
    //   A Promise.race captura exatamente esse cenário — SDK hang após fetch abortado.
    //
    // Fix #9 estava errado ao remover a Promise.race. Fix #11 restaura ambas as camadas.
    console.log("[Auth] Verificando sessão...");

    const resolveProfileWithRetry = async (userId: string, email: string): Promise<ProfileResult> => {
      let result = await profileToAuthUser(userId, email);
      if (!result.user && result.reason === "db_error") {
        // Pequeno retry para falhas transitórias de rede/DB durante bootstrap/auth events.
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
        result = await profileToAuthUser(userId, email);
      }
      return result;
    };

    const hadExpiredLocalSession = clearExpiredLocalSession();
    if (hadExpiredLocalSession) {
      // Importante: não finalizar inicialização aqui.
      // Sempre executamos getSessionWithTimeout abaixo para sincronizar
      // estado real do SDK e evitar janela isReady=true com user=null.
      // Não chamamos signOut local aqui para evitar evento SIGNED_OUT tardio
      // após um novo login válido (race observada em E2E).
    }

    const getSessionWithTimeout = Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("getSession timeout — sessão possivelmente corrompida/SDK hang")), 8000)
      ),
    ]);
    getSessionWithTimeout
      .then(async ({ data: { session } }) => {
        if (!mounted) return;

        try {
          sessionStorage.removeItem(RELOAD_GUARD_KEY);
        } catch {
          /**/
        }

        if (session?.user) {
          // Sessão existe — carregar dados do profile
          console.log("[Auth] Sessão encontrada, carregando profile...");
          try {
            const { user: authUser, reason } = await resolveProfileWithRetry(session.user.id, session.user.email ?? "");
            if (!mounted) return;

            if (authUser) {
              setUser(authUser);
              console.log("[Auth] ✓ User autenticado:", authUser.nome);
            } else if (reason === "inactive" || reason === "invalid_role" || reason === "not_found") {
              setUser(null);
            } else {
              console.warn("[Auth] Falha transitória ao carregar profile no bootstrap; mantendo estado atual.");
            }
          } catch (err) {
            console.error("[Auth] Erro ao carregar profile:", err);
          }
        } else {
          console.log("[Auth] Nenhuma sessão existente");
        }

        completeInitialization();
      })
      .catch(async (err) => {
        if (!mounted) return;
        console.error("[Auth] Erro ao buscar sessão:", err?.message ?? err);

        const isGetSessionTimeout =
          err instanceof Error && err.message.toLowerCase().includes("getsession timeout");

        // Em timeout de getSession, prioriza 1 recarga controlada ANTES de limpar sessão local.
        // Isso evita logout indevido em falso-positivo de timeout (ex.: latência momentânea).
        // Só limpamos a sessão se o timeout repetir após o reload.
        if (isGetSessionTimeout && import.meta.env.MODE !== "test") {
          try {
            const alreadyReloaded = sessionStorage.getItem(RELOAD_GUARD_KEY) === "1";
            if (!alreadyReloaded) {
              sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
              window.location.reload();
              return;
            }
            sessionStorage.removeItem(RELOAD_GUARD_KEY);
          } catch {
            /**/
          }
        } else {
          try {
            sessionStorage.removeItem(RELOAD_GUARD_KEY);
          } catch {
            /**/
          }
        }

        // Limpa sessão corrompida/expirada do localStorage
        try {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          if (LEGACY_STORAGE_KEY) localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch { /**/ }

        // Evita signOut local assíncrono aqui para não emitir SIGNED_OUT tardio
        // e derrubar sessão válida que acabou de ser estabelecida.

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

        if (event === "SIGNED_OUT") {
          let hasLocalSession = false;
          try {
            hasLocalSession = Boolean(localStorage.getItem(AUTH_STORAGE_KEY));
          } catch {
            /**/
          }

          if (hasLocalSession) {
            console.warn("[Auth] SIGNED_OUT transitório ignorado (sessão local ainda presente).");
            completeInitialization();
            return;
          }

          setUser(null);
          completeInitialization();
          return;
        }

        // Em alguns cenários transitórios o SDK pode emitir evento com session
        // nula antes da sincronização final. Evitamos logout agressivo aqui;
        // aguardamos SIGNED_OUT explícito para encerrar sessão local.
        if (!session) {
          completeInitialization();
          return;
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          if (session.user) {
            const { user: authUser, reason } = await resolveProfileWithRetry(session.user.id, session.user.email ?? "");
            if (!mounted) return;

            if (authUser) {
              setUser(authUser);
            } else if (reason === "inactive" || reason === "invalid_role" || reason === "not_found") {
              setUser(null);
            } else {
              console.warn("[Auth] Falha transitória em onAuthStateChange; mantendo usuário atual.");
            }
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
