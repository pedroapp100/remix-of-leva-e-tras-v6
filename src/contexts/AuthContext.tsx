import { createContext, useContext, useState, useCallback, type ReactNode, useEffect, useRef } from "react";
import type { Role, UserAccount } from "@/types/database";
import { getPermissionsForRole } from "@/lib/permissions";
import { useUserStore } from "@/data/mockUsers";

// ── Mock user type ──
export interface AuthUser {
  id: string;
  email: string;
  nome: string;
  role: Role;
  cargo_id?: string;
  avatarUrl?: string;
  permissions?: string[];
}

// ── Rate limiting ──
interface LoginAttempt {
  count: number;
  firstAttemptAt: number;
}

const MAX_ATTEMPTS = 5;
const BLOCK_WINDOW_MS = 5 * 60 * 1000; // 5 minutos
const LOGIN_FEEDBACK_DELAY_MS = 200;

// ── Error mapping PT-BR ──
const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email ou senha incorretos.",
  email_not_confirmed: "Confirme seu email antes de entrar.",
  too_many_attempts: "Muitas tentativas. Tente novamente em 5 minutos.",
  user_inactive: "Conta inativa. Entre em contato com o administrador.",
  unknown: "Erro inesperado. Tente novamente.",
};

const AUTH_STORAGE_KEY = "let-auth-user";

type SessionPersistence = "local" | "session";

function mapAccountToAuthUser(account: UserAccount): AuthUser {
  return {
    id: account.id,
    email: account.email,
    nome: account.nome,
    role: account.role,
    cargo_id: account.cargo_id ?? undefined,
    avatarUrl: account.avatarUrl ?? undefined,
    permissions: getPermissionsForRole(account.role, account.cargo_id ?? undefined),
  };
}

function isRole(value: unknown): value is Role {
  return value === "admin" || value === "cliente" || value === "entregador";
}

function sanitizeStoredUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<AuthUser>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.email !== "string" ||
    typeof candidate.nome !== "string" ||
    !isRole(candidate.role)
  ) {
    return null;
  }

  const cargoId = typeof candidate.cargo_id === "string" ? candidate.cargo_id : undefined;
  const avatarUrl = typeof candidate.avatarUrl === "string" ? candidate.avatarUrl : undefined;

  return {
    id: candidate.id,
    email: candidate.email,
    nome: candidate.nome,
    role: candidate.role,
    cargo_id: cargoId,
    avatarUrl,
    permissions: getPermissionsForRole(candidate.role, cargoId),
  };
}

function readStoredUser(storage: Storage): AuthUser | null {
  try {
    const raw = storage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const user = sanitizeStoredUser(JSON.parse(raw));
    if (!user) {
      storage.removeItem(AUTH_STORAGE_KEY);
    }

    return user;
  } catch {
    storage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function loadStoredAuth(): { user: AuthUser | null; persistence: SessionPersistence | null } {
  if (typeof window === "undefined") {
    return { user: null, persistence: null };
  }

  const localUser = readStoredUser(window.localStorage);
  if (localUser) return { user: localUser, persistence: "local" };

  const sessionUser = readStoredUser(window.sessionStorage);
  if (sessionUser) return { user: sessionUser, persistence: "session" };

  return { user: null, persistence: null };
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

function persistStoredAuth(user: AuthUser, persistence: SessionPersistence) {
  if (typeof window === "undefined") return;

  clearStoredAuth();

  const storage = persistence === "local" ? window.localStorage : window.sessionStorage;
  storage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
      cargo_id: user.cargo_id ?? null,
      avatarUrl: user.avatarUrl ?? null,
    })
  );
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
  const { findByEmail } = useUserStore();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [sessionPersistence, setSessionPersistence] = useState<SessionPersistence | null>(null);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt>({ count: 0, firstAttemptAt: 0 });
  const transitionTimeoutRef = useRef<number | null>(null);

  const clearTransitionTimeout = useCallback(() => {
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const { user: storedUser, persistence } = loadStoredAuth();

    if (storedUser && persistence) {
      setUser(storedUser);
      setSessionPersistence(persistence);
    }

    setIsReady(true);
  }, []);

  useEffect(() => {
    return () => {
      clearTransitionTimeout();
    };
  }, [clearTransitionTimeout]);

  useEffect(() => {
    if (!isReady) return;

    if (!user || !sessionPersistence) {
      clearStoredAuth();
      return;
    }

    persistStoredAuth(user, sessionPersistence);
  }, [isReady, user, sessionPersistence]);

  const isBlocked = (() => {
    if (loginAttempts.count < MAX_ATTEMPTS) return false;
    const elapsed = Date.now() - loginAttempts.firstAttemptAt;
    return elapsed < BLOCK_WINDOW_MS;
  })();

  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - loginAttempts.count);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    if (isBlocked) {
      return { success: false, error: ERROR_MESSAGES.too_many_attempts };
    }

    clearTransitionTimeout();
    setLoading(true);
    await new Promise((r) => setTimeout(r, LOGIN_FEEDBACK_DELAY_MS));

    const normalizedEmail = email.trim().toLowerCase();
    const account = findByEmail(normalizedEmail);

    if (!account || account.password !== password) {
      setLoginAttempts((prev) => ({
        count: prev.count + 1,
        firstAttemptAt: prev.count === 0 ? Date.now() : prev.firstAttemptAt,
      }));
      setLoading(false);
      return { success: false, error: ERROR_MESSAGES.invalid_credentials };
    }

    if (account.status === "inativo") {
      setLoading(false);
      return { success: false, error: ERROR_MESSAGES.user_inactive };
    }

    const userWithPerms = mapAccountToAuthUser(account);
    const persistence: SessionPersistence = rememberMe ? "local" : "session";

    persistStoredAuth(userWithPerms, persistence);
    setSessionPersistence(persistence);
    setUser(userWithPerms);
    setLoginAttempts({ count: 0, firstAttemptAt: 0 });

    // Clear loading immediately so ProtectedRoute doesn't show a second loader
    setLoading(false);

    return { success: true, user: userWithPerms };
  }, [clearTransitionTimeout, isBlocked, findByEmail]);

  const logout = useCallback(() => {
    clearTransitionTimeout();
    clearStoredAuth();
    setLoading(false);
    setSessionPersistence(null);
    setUser(null);
  }, [clearTransitionTimeout]);

  const changeCargo = useCallback((cargoId: string) => {
    setUser(prev => {
      if (!prev || prev.role !== "admin") return prev;
      return {
        ...prev,
        cargo_id: cargoId,
        permissions: getPermissionsForRole("admin", cargoId),
      };
    });
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    console.log(`[MOCK] Password reset email sent to: ${email}`);
    return { success: true };
  }, []);

  const resetPassword = useCallback(async (_newPassword: string) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    console.log("[MOCK] Password updated successfully");
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
