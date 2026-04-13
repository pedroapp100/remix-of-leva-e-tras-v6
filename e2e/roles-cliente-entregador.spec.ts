import { test, expect, type Page } from "@playwright/test";

const CLIENTE_EMAIL = process.env.E2E_CLIENTE_EMAIL;
const CLIENTE_PASSWORD = process.env.E2E_CLIENTE_PASSWORD;
const ENTREGADOR_EMAIL = process.env.E2E_ENTREGADOR_EMAIL;
const ENTREGADOR_PASSWORD = process.env.E2E_ENTREGADOR_PASSWORD;

// Aguarda os dois loaders do ProtectedRoute desaparecerem:
//   1. "Carregando..."         — isReady=false (AuthProvider inicializando, up to 15s)
//   2. "Restaurando sessão..." — grace period 8s (isReady=true, user ainda null em recovery)
async function waitForPageLoad(page: Page) {
  await page.getByText("Carregando...").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  await page.getByText("Restaurando sessão...").waitFor({ state: "hidden", timeout: 12_000 }).catch(() => {});
}

// Navega dentro do SPA sem HTTP reload — preserva o AuthContext montado com user já setado.
// Usa history.pushState + popstate para que o React Router v6 detecte a mudança.
// Passa uma string para page.evaluate para evitar erros de tipo (o código roda no browser).
async function spaNavigate(page: Page, path: string) {
  const safePath = JSON.stringify(path); // serialização segura — path é sempre literal hardcoded
  await page.evaluate(`
    window.history.pushState({}, "", ${safePath});
    window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
  `);
  await page.waitForURL(path, { timeout: 10_000 });
}

// loginAs — padrão "goto → evaluate → reload":
//   goto /login  → destrói o cliente Supabase em memória
//   evaluate     → limpa lt-auth-* e sb-* do storage; define onboarding dismissed
//   reload       → SDK reinicia com storage vazio → INITIAL_SESSION(null) apenas, sem cascade
//   fill + click → LoginPage.handleSubmit → signInWithPassword → navigate(ROLE_REDIRECTS[role])
async function loginAs(
  page: Page,
  email: string,
  password: string,
  expectedRootPath: "/cliente" | "/entregador",
) {
  // Passo 1: carrega /login via HTTP — novo contexto JS, Supabase em memória destruído
  await page.goto("/login", { waitUntil: "load" });

  // Passo 2: limpa qualquer token residual; pré-define flags de UI para não bloquear testes
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("lt-auth-") || key.startsWith("sb-")) {
        localStorage.removeItem(key);
      }
    }
    localStorage.setItem("leva-traz-welcome-seen", "true");
    localStorage.setItem(
      "leva-traz-onboarding",
      JSON.stringify({
        completed: [],
        dismissed: [
          "admin-dashboard", "admin-solicitacoes", "admin-clientes",
          "admin-entregadores", "admin-faturas", "admin-financeiro",
          "admin-relatorios", "admin-configuracoes",
          "client-balance", "client-requests", "client-profile",
          "driver-requests", "driver-history", "driver-profile",
        ],
      }),
    );
  });

  // Passo 3: reload com storage vazio — SDK dispara apenas INITIAL_SESSION(null), sem SIGNED_OUT
  await page.reload({ waitUntil: "load" });

  // Passo 4: aguarda o formulário estar pronto (React hidratou após o reload)
  await page.locator("#email").waitFor({ state: "visible", timeout: 10_000 });

  // Passo 5: preenche e submete
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /entrar na plataforma/i }).click();

  // Passo 6: aguarda o redirect do LoginPage (React Router navigate → SPA URL change)
  await page.waitForURL(
    (url) => url.pathname.startsWith(expectedRootPath),
    { timeout: 30_000 },
  );

  // Passo 7: aguarda os loaders do ProtectedRoute sumirem (garante auth estabilizado)
  await waitForPageLoad(page);
}

// ─────────────────────────────────────────────────────
// SUITE: Cliente (5 cenários)
// ─────────────────────────────────────────────────────
test.describe("Perfis — Cliente (5 cenários)", () => {
  test.skip(
    !CLIENTE_EMAIL || !CLIENTE_PASSWORD,
    "Defina E2E_CLIENTE_EMAIL e E2E_CLIENTE_PASSWORD em .env.e2e",
  );

  test.beforeEach(async ({ page }) => {
    await loginAs(page, CLIENTE_EMAIL!, CLIENTE_PASSWORD!, "/cliente");
  });

  test("cliente login redireciona para dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/cliente/);
    await expect(
      page.getByRole("heading", { name: /^Dashboard$/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("cliente navega para Minhas Solicitações", async ({ page }) => {
    await spaNavigate(page, "/cliente/solicitacoes");
    await waitForPageLoad(page);
    await expect(
      page.getByRole("heading", { name: /Minhas Solicitações/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("tab", { name: /Todas/i })).toBeVisible({ timeout: 10_000 });
  });

  test("cliente navega para Meu Financeiro", async ({ page }) => {
    test.setTimeout(90_000);
    await spaNavigate(page, "/cliente/financeiro");
    await waitForPageLoad(page);
    await expect(
      page.getByRole("heading", { name: /Meu Financeiro/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(/Meus Fechamentos|Extrato de Movimentações|Saldo Pré-Pago/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("cliente navega para Meu Perfil e vê formulário", async ({ page }) => {
    await spaNavigate(page, "/cliente/perfil");
    await waitForPageLoad(page);
    await expect(
      page.getByRole("heading", { name: /Meu Perfil/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#nome")).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /Salvar Alterações/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("cliente não acessa admin e é redirecionado", async ({ page }) => {
    await spaNavigate(page, "/admin/financeiro");
    await page.waitForURL(/\/(cliente|login)/, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/(cliente|login)/);
  });
});

// ─────────────────────────────────────────────────────
// SUITE: Entregador (5 cenários)
// ─────────────────────────────────────────────────────
test.describe("Perfis — Entregador (5 cenários)", () => {
  test.skip(
    !ENTREGADOR_EMAIL || !ENTREGADOR_PASSWORD,
    "Defina E2E_ENTREGADOR_EMAIL e E2E_ENTREGADOR_PASSWORD em .env.e2e",
  );

  test.beforeEach(async ({ page }) => {
    await loginAs(page, ENTREGADOR_EMAIL!, ENTREGADOR_PASSWORD!, "/entregador");
  });

  test("entregador login redireciona para dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/entregador/);
    await expect(
      page.getByRole("heading", { name: /^Dashboard$/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("entregador navega para Solicitações", async ({ page }) => {
    await spaNavigate(page, "/entregador/solicitacoes");
    await waitForPageLoad(page);
    await expect(
      page.getByRole("heading", { name: /^Solicitações$/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("tab", { name: /Todas/i })).toBeVisible({ timeout: 10_000 });
  });

  test("entregador navega para Histórico", async ({ page }) => {
    await spaNavigate(page, "/entregador/historico");
    await waitForPageLoad(page);
    await expect(
      page.getByRole("heading", { name: /Histórico de Entregas/i }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("entregador navega para Meu Financeiro", async ({ page }) => {
    test.setTimeout(90_000);
    await spaNavigate(page, "/entregador/financeiro");
    await waitForPageLoad(page);
    await expect(
      page.getByRole("heading", { name: /Meu Financeiro/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(/Detalhes da Comissão|Sem dados de comissão/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("entregador não acessa admin e é redirecionado", async ({ page }) => {
    await spaNavigate(page, "/admin/financeiro");
    await page.waitForURL(/\/(entregador|login)/, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/(entregador|login)/);
  });
});