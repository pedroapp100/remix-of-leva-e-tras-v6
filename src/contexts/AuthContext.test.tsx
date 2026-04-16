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

// Fix #13: AuthContext uses native fetch() via profileToAuthUserDirect() instead of supabase.from()
// We must mock globalThis.fetch to intercept /rest/v1/profiles and /rest/v1/cargos calls.
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

/** Sets a properly-structured lt-auth-session in localStorage so parseStoredSession() succeeds. */
const setValidLocalSession = (
  userId = "u1",
  email = "admin@test.com",
  token = "test-token"
) => {
  localStorage.setItem(
    "lt-auth-session",
    JSON.stringify({
      user: { id: userId, email },
      access_token: token,
      refresh_token: "refresh-token",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    })
  );
};

/** Flushes enough microtask ticks for profileToAuthUserDirect Promise chains to complete. */
const flushAll = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

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
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    profileResponse = { data: null, error: null };
    cargosResponse = { data: [] };

    // Default: no session, no auth events
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockSignOut.mockResolvedValue({ error: null });

    // Fix #13: configure fetch mock for profileToAuthUserDirect REST API calls.
    // VITE_SUPABASE_URL is undefined in test env → URLs become "undefined/rest/v1/..."
    mockFetch.mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/rest/v1/profiles")) {
        if (profileResponse.error) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({}),
          } as unknown as Response);
        }
        const rows = profileResponse.data ? [profileResponse.data] : [];
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(rows),
        } as unknown as Response);
      }
      if (urlStr.includes("/rest/v1/cargos")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(cargosResponse.data),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      } as unknown as Response);
    });
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

  it("[regressão] sessão local expirada é limpa sem pular getSession", async () => {
    localStorage.setItem("lt-auth-session", JSON.stringify({
      expires_at: Math.floor(Date.now() / 1000) - 60,
      access_token: "expired-access",
      refresh_token: "expired-refresh",
    }));

    mockGetSession.mockResolvedValue({ data: { session: null } });

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

    expect(mockSignOut).not.toHaveBeenCalledWith({ scope: "local" });
    expect(getByTestId!("ready").textContent).toBe("true");
    expect(getByTestId!("user").textContent).toBe("null");
  });

  it("[regressão Fix#13] sessão local válida é restaurada via fetch direto (getSession não é chamado)", async () => {
    // Fix #13: init reads localStorage directly + calls profileToAuthUserDirect() via native fetch.
    // getSession() is never invoked during initialization.
    setValidLocalSession();
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
      await flushAll();
    });

    expect(mockGetSession).not.toHaveBeenCalled();
    expect(getByTestId!("ready").textContent).toBe("true");
    expect(getByTestId!("user").textContent).toBe("Admin");
  });

  it("should become ready with a valid session", async () => {
    setValidLocalSession();
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
      await flushAll();
    });

    expect(getByTestId!("ready").textContent).toBe("true");
    expect(getByTestId!("user").textContent).toBe("Admin");
  });

  it("[regressão] evento transitório com session nula não deve deslogar sem SIGNED_OUT", async () => {
    let authStateCallback: ((event: string, session: unknown) => Promise<void>) | undefined;
    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => Promise<void>) => {
      authStateCallback = cb;
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    setValidLocalSession();
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
      await flushAll();
    });

    expect(getByTestId!("user").textContent).toBe("Admin");
    expect(authStateCallback).toBeDefined();

    await act(async () => {
      await authStateCallback!("TOKEN_REFRESHED", null);
      await flushAll();
    });

    expect(getByTestId!("user").textContent).toBe("Admin");
  });

  it("[regressão Fix#13] SIGNED_OUT desloga usuário imediatamente (comportamento atual)", async () => {
    // Fix #13: SIGNED_OUT always clears the user. The SDK only fires SIGNED_OUT
    // when the session is truly expired — transient protection is no longer needed.
    let authStateCallback: ((event: string, session: unknown) => Promise<void>) | undefined;
    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => Promise<void>) => {
      authStateCallback = cb;
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    setValidLocalSession();
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
      await flushAll();
    });

    expect(getByTestId!("user").textContent).toBe("Admin");
    expect(authStateCallback).toBeDefined();

    await act(async () => {
      await authStateCallback!("SIGNED_OUT", null);
      await flushAll();
    });

    // SIGNED_OUT always clears user in Fix #13
    expect(getByTestId!("user").textContent).toBe("null");
  });

  it("[regressão] erro transitório de profile em TOKEN_REFRESHED não limpa usuário atual", async () => {
    let authStateCallback: ((event: string, session: unknown) => Promise<void>) | undefined;
    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => Promise<void>) => {
      authStateCallback = cb;
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    setValidLocalSession();
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
      await flushAll();
    });

    expect(getByTestId!("user").textContent).toBe("Admin");
    expect(authStateCallback).toBeDefined();

    // Simula falha de DB no refresh — fetch returns 500, reason="db_error" → user stays
    profileResponse = {
      data: null,
      error: { message: "db temporarily unavailable" },
    };

    await act(async () => {
      await authStateCallback!("TOKEN_REFRESHED", {
        user: { id: "u1", email: "admin@test.com" },
      });
      await flushAll();
    });

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
      await flushAll();
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
      await flushAll();
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
      await flushAll();
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

  // ── Teste de regressão Fix #11 / Fix #13 ──────────────────────────────────
  // Fix #13 eliminou getSession() da inicialização. O safety timer (6s) agora
  // protege contra profileToAuthUserDirect() travar (fetch infinito / rede morta).
  //
  // Cenário: localStorage tem sessão válida, mas fetch() para /rest/v1/profiles
  // nunca resolve. App deve ficar pronto via safety timer em ≤6s.
  it("[regressão Fix#11/13] app fica pronto em ≤6s mesmo se fetch de profile travar infinitamente", async () => {
    // Sessão local presente → init tentará profileToAuthUserDirect()
    setValidLocalSession();
    // fetch nunca resolve — simula hang de rede/timeout silencioso
    mockFetch.mockReturnValue(new Promise(() => { /* never resolves */ }));

    let getByTestId: (id: string) => HTMLElement;
    await act(async () => {
      const result = render(<AuthProvider><TestConsumer /></AuthProvider>);
      getByTestId = result.getByTestId;
    });

    // Imediatamente após montar: não deve estar pronto (fetch pendente)
    expect(getByTestId!("ready").textContent).toBe("false");

    // Avança 6s + 1ms — safety timer deve disparar completeInitialization()
    await act(async () => {
      vi.advanceTimersByTime(6_001);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // App DEVE estar pronto — mesmo com fetch completamente travado
    expect(getByTestId!("ready").textContent).toBe("true");
    // Usuário null — profile não carregou (fetch travou)
    expect(getByTestId!("user").textContent).toBe("null");
  });
});
