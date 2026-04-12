import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing AuthContext
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();

// Track what table is being queried
let profileResponse: { data: unknown; error: unknown } = { data: null, error: null };
let cargosResponse: { data: unknown[] } = { data: [] };

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve(profileResponse),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        };
      }
      if (table === "cargos") {
        return {
          select: () => Promise.resolve(cargosResponse),
        };
      }
      return {
        select: () => Promise.resolve({ data: [] }),
      };
    },
  },
}));

vi.mock("@/lib/permissions", () => ({
  getPermissionsForRole: () => ["read"],
}));

// Must import AFTER mocks
import { render, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import React from "react";

function TestConsumer() {
  const { user, isReady, loading } = useAuth();
  return (
    <div>
      <span data-testid="ready">{String(isReady)}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.nome : "null"}</span>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    profileResponse = { data: null, error: null };
    cargosResponse = { data: [] };

    // Default: no session, no auth events
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockSignOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should become ready even with no session", async () => {
    let getByTestId: (id: string) => HTMLElement;

    await act(async () => {
      const result = render(
        <AuthProvider><TestConsumer /></AuthProvider>
      );
      getByTestId = result.getByTestId;
    });

    // Flush microtasks
    await act(async () => {
      await Promise.resolve();
    });

    expect(getByTestId!("ready").textContent).toBe("true");
    expect(getByTestId!("user").textContent).toBe("null");
  });

  it("should become ready with a valid session", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "u1", email: "admin@test.com" },
        },
      },
    });

    profileResponse = {
      data: { id: "u1", nome: "Admin", role: "admin", cargo_id: null, avatar: null, ativo: true },
      error: null,
    };

    let getByTestId: (id: string) => HTMLElement;

    await act(async () => {
      const result = render(
        <AuthProvider><TestConsumer /></AuthProvider>
      );
      getByTestId = result.getByTestId;
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getByTestId!("ready").textContent).toBe("true");
    expect(getByTestId!("user").textContent).toBe("Admin");
  });

  it("should NOT sign out on DB error during login — should show DB error message", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "u1", email: "test@test.com" } },
      error: null,
    });

    // DB error when fetching profile
    profileResponse = {
      data: null,
      error: { message: "connection timeout" },
    };

    let loginResult: { success: boolean; error?: string } | undefined;

    function LoginTest() {
      const { login, isReady } = useAuth();
      return (
        <div>
          <span data-testid="ready">{String(isReady)}</span>
          <button data-testid="login" onClick={async () => {
            loginResult = await login("test@test.com", "pass");
          }}>Login</button>
        </div>
      );
    }

    let getByTestId: (id: string) => HTMLElement;

    await act(async () => {
      const result = render(
        <AuthProvider><LoginTest /></AuthProvider>
      );
      getByTestId = result.getByTestId;
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByTestId!("ready").textContent).toBe("true");

    await act(async () => {
      getByTestId!("login").click();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Should NOT sign out on db_error
    expect(mockSignOut).not.toHaveBeenCalled();
    // Should return DB error message, not "inactive"
    expect(loginResult?.success).toBe(false);
    expect(loginResult?.error).toContain("banco de dados");
  });

  it("should sign out when user is inactive", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "u1", email: "test@test.com" } },
      error: null,
    });

    // User exists but is inactive
    profileResponse = {
      data: { id: "u1", nome: "Inativo", role: "admin", cargo_id: null, avatar: null, ativo: false },
      error: null,
    };

    let loginResult: { success: boolean; error?: string } | undefined;

    function LoginTest() {
      const { login, isReady } = useAuth();
      return (
        <div>
          <span data-testid="ready">{String(isReady)}</span>
          <button data-testid="login" onClick={async () => {
            loginResult = await login("test@test.com", "pass");
          }}>Login</button>
        </div>
      );
    }

    let getByTestId: (id: string) => HTMLElement;

    await act(async () => {
      const result = render(
        <AuthProvider><LoginTest /></AuthProvider>
      );
      getByTestId = result.getByTestId;
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByTestId!("ready").textContent).toBe("true");

    await act(async () => {
      getByTestId!("login").click();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Should sign out for inactive user
    expect(mockSignOut).toHaveBeenCalled();
    expect(loginResult?.success).toBe(false);
    expect(loginResult?.error).toContain("inativa");
  });

  // ── Testes de regressão: loading SEMPRE volta a false ─────────────────────
  // Estes testes existem para detectar o bug onde loading ficava true para
  // sempre após um erro, travando o botão de login indefinidamente.

  it("[regressão] loading volta a false após credenciais inválidas", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    let capturedLoading: boolean | undefined;

    function LoginTest() {
      const { login, loading, isReady } = useAuth();
      return (
        <div>
          <span data-testid="ready">{String(isReady)}</span>
          <span data-testid="loading">{String(loading)}</span>
          <button data-testid="login" onClick={async () => {
            await login("wrong@test.com", "wrongpass");
            capturedLoading = loading;
          }}>Login</button>
        </div>
      );
    }

    let getByTestId: (id: string) => HTMLElement;
    await act(async () => {
      const result = render(<AuthProvider><LoginTest /></AuthProvider>);
      getByTestId = result.getByTestId;
    });
    await act(async () => { await Promise.resolve(); });

    await act(async () => {
      getByTestId!("login").click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // loading DEVE ser false após erro — nunca pode travar
    expect(getByTestId!("loading").textContent).toBe("false");
  });

  it("[regressão] loading volta a false quando signInWithPassword lança exceção", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    // Simula erro de rede (throw, não rejected promise com error object)
    mockSignInWithPassword.mockRejectedValue(new Error("Network error"));

    function LoginTest() {
      const { login, loading, isReady } = useAuth();
      return (
        <div>
          <span data-testid="ready">{String(isReady)}</span>
          <span data-testid="loading">{String(loading)}</span>
          <button data-testid="login" onClick={() => { login("a@b.com", "pass"); }}>Login</button>
        </div>
      );
    }

    let getByTestId: (id: string) => HTMLElement;
    await act(async () => {
      const result = render(<AuthProvider><LoginTest /></AuthProvider>);
      getByTestId = result.getByTestId;
    });
    await act(async () => { await Promise.resolve(); });

    await act(async () => {
      getByTestId!("login").click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getByTestId!("loading").textContent).toBe("false");
  });

  it("[regressão] loading volta a false após login bem-sucedido", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@test.com" } },
      error: null,
    });
    profileResponse = {
      data: { id: "u1", nome: "Admin", role: "admin", cargo_id: null, avatar: null, ativo: true },
      error: null,
    };

    function LoginTest() {
      const { login, loading, isReady } = useAuth();
      return (
        <div>
          <span data-testid="ready">{String(isReady)}</span>
          <span data-testid="loading">{String(loading)}</span>
          <button data-testid="login" onClick={() => { login("admin@test.com", "pass"); }}>Login</button>
        </div>
      );
    }

    let getByTestId: (id: string) => HTMLElement;
    await act(async () => {
      const result = render(<AuthProvider><LoginTest /></AuthProvider>);
      getByTestId = result.getByTestId;
    });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    await act(async () => {
      getByTestId!("login").click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getByTestId!("loading").textContent).toBe("false");
  });

  it("[regressão] loading volta a false quando login ultrapassa 20s (timeout de segurança)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    // Simula um signInWithPassword que nunca resolve (hang infinito)
    mockSignInWithPassword.mockReturnValue(new Promise(() => { /* never resolves */ }));

    function LoginTest() {
      const { login, loading, isReady } = useAuth();
      return (
        <div>
          <span data-testid="ready">{String(isReady)}</span>
          <span data-testid="loading">{String(loading)}</span>
          <button data-testid="login" onClick={() => { login("a@b.com", "pass"); }}>Login</button>
        </div>
      );
    }

    let getByTestId: (id: string) => HTMLElement;
    await act(async () => {
      const result = render(<AuthProvider><LoginTest /></AuthProvider>);
      getByTestId = result.getByTestId;
    });
    await act(async () => { await Promise.resolve(); });

    // Dispara login (vai travar)
    await act(async () => {
      getByTestId!("login").click();
      await Promise.resolve();
    });

    // Antes do timeout: loading deve ser true
    expect(getByTestId!("loading").textContent).toBe("true");

    // Avança 20s (timeout de segurança do login)
    await act(async () => {
      vi.advanceTimersByTime(20_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Após timeout: loading DEVE ter voltado a false
    expect(getByTestId!("loading").textContent).toBe("false");
  });

  // ── Teste de regressão Fix #11 ────────────────────────────────────────────
  // ESTE TESTE EXISTE PARA DETECTAR A REGRESSÃO DO FIX #9.
  // Se alguém remover o Promise.race de 8s do AuthContext (alegando que
  // fetchWithTimeout basta), este teste vai FALHAR imediatamente.
  //
  // Cenário: SDK Supabase captura AbortError internamente e NÃO resolve nem
  // rejeita a promise de getSession() — o fetch layer aborta a rede, mas o
  // lock interno do SDK (_acquireInitializeLock) nunca é liberado.
  // Fix: Promise.race(8s) + signOut({scope:'local'}) no catch.
  it("[regressão Fix#11] app fica pronto em ≤8s mesmo se getSession() travar infinitamente (SDK hang)", async () => {
    // Simula exatamente o cenário do Fix#9/#11:
    // getSession() NUNCA resolve nem rejeita — SDK hang interno
    mockGetSession.mockReturnValue(new Promise(() => { /* never resolves */ }));

    let getByTestId: (id: string) => HTMLElement;
    await act(async () => {
      const result = render(<AuthProvider><TestConsumer /></AuthProvider>);
      getByTestId = result.getByTestId;
    });

    // Imediatamente após montar: não deve estar pronto ainda
    expect(getByTestId!("ready").textContent).toBe("false");

    // Avança 8s + 1ms — Promise.race deve rejeitar e completeInitialization() deve rodar
    await act(async () => {
      vi.advanceTimersByTime(8_001);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // App DEVE estar pronto — mesmo com o SDK completamente travado
    expect(getByTestId!("ready").textContent).toBe("true");
    // Sem sessão válida — usuário não autenticado
    expect(getByTestId!("user").textContent).toBe("null");
  });
});
