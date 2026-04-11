import { test, expect, type Page } from "@playwright/test";

// ──────────────────────────────────────────────────────────────
// SPEC Etapa 15 — Validação End-to-End (Authenticated Flows)
// Items 1-13 from the checklist
// ──────────────────────────────────────────────────────────────

const EMAIL = process.env.E2E_ADMIN_EMAIL!;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD!;

/** Wait for the BrandedLoader "Carregando..." spinner to disappear */
async function waitForAppReady(page: Page) {
  const loader = page.getByText("Carregando...");
  await loader.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  await loader.waitFor({ state: "hidden", timeout: 30_000 });
}

/** Shared login helper — navigates to /login and performs auth */
async function adminLogin(page: Page) {
  await page.goto("/login");
  // Suppress onboarding: WelcomeModal + all admin tour tooltips
  await page.evaluate(() => {
    localStorage.setItem("leva-traz-welcome-seen", "true");
    localStorage.setItem("leva-traz-onboarding", JSON.stringify({
      completed: [],
      dismissed: [
        "admin-dashboard", "admin-solicitacoes", "admin-clientes",
        "admin-entregadores", "admin-faturas", "admin-financeiro",
        "admin-relatorios", "admin-configuracoes",
      ],
    }));
  });
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: /entrar na plataforma/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 15_000 });
  await waitForAppReady(page);
}

/** Sidebar link href mapping */
const SIDEBAR_HREFS: Record<string, string> = {
  Dashboard: "/admin",
  "Solicitações": "/admin/solicitacoes",
  Clientes: "/admin/clientes",
  Entregadores: "/admin/entregadores",
  Entregas: "/admin/entregas",
  Caixas: "/admin/caixas-entregadores",
  Faturas: "/admin/faturas",
  Financeiro: "/admin/financeiro",
  "Relatórios": "/admin/relatorios",
  Logs: "/admin/logs",
  "Configurações": "/admin/configuracoes",
};

/** Navigate within the SPA using sidebar link clicks (avoids full page reload) */
async function navigateViaSidebar(page: Page, linkName: string) {
  const href = SIDEBAR_HREFS[linkName];
  if (!href) throw new Error(`Unknown sidebar link: ${linkName}`);
  const link = page.locator(`a[href="${href}"]`);
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await page.waitForLoadState("networkidle");
}

// ─────────────────────────────────────────────
// SPEC 15.1 — Admin login and redirect
// ─────────────────────────────────────────────
test.describe("SPEC 15.1 — Admin Login", () => {
  test("admin login works and redirects to /admin", async ({ page }) => {
    await adminLogin(page);
    expect(page.url()).toContain("/admin");
  });
});

// ─────────────────────────────────────────────
// SPEC 15.2 — Dashboard loads without errors
// ─────────────────────────────────────────────
test.describe("SPEC 15.2 — Admin Dashboard", () => {
  test("dashboard loads with heading and no JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await adminLogin(page);

    // Should show "Dashboard" heading
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 15_000 });

    // Should show metric cards OR empty state (depends on DB data)
    const metricsOrEmpty = page.getByText("Contas a Pagar").first()
      .or(page.getByText("Nenhum dado disponível"));
    await expect(metricsOrEmpty).toBeVisible({ timeout: 10_000 });

    // No critical JS errors
    const critical = errors.filter(
      (e) => !e.includes("supabase") && !e.includes("fetch") && !e.includes("net::ERR") && !e.includes("Failed to fetch"),
    );
    expect(critical).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// SPEC 15.3 — Configurações: Bairros
// ─────────────────────────────────────────────
test.describe("SPEC 15.3 — Configurações: Regiões & Bairros", () => {
  test("can navigate to Configurações and see tabs", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "Configurações");
    await expect(page.getByRole("heading", { name: "Configurações", exact: true })).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("tab", { name: /Regiões/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Bairros/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Pagamentos/i })).toBeVisible();
  });

  test("Regiões tab lists existing data or shows empty state", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "Configurações");
    await expect(page.getByRole("heading", { name: "Configurações", exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("tab", { name: /Regiões/i }).click();
    await page.waitForTimeout(2000);
    const hasData = await page.locator("table tbody tr").count();
    const hasEmpty = await page.getByText(/nenhuma|vazio|cadastrar/i).count();
    expect(hasData + hasEmpty).toBeGreaterThan(0);
  });

  test("Bairros tab lists data or shows empty state", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "Configurações");
    await expect(page.getByRole("heading", { name: "Configurações", exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("tab", { name: /Bairros/i }).click();
    await page.waitForTimeout(2000);
    const hasData = await page.locator("table tbody tr").count();
    const hasEmpty = await page.getByText(/nenhum|vazio|cadastrar/i).count();
    expect(hasData + hasEmpty).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// SPEC 15.4 — Formas de Pagamento
// ─────────────────────────────────────────────
test.describe("SPEC 15.4 — Formas de Pagamento", () => {
  test("4 core payment forms are visible", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "Configurações");
    await expect(page.getByRole("heading", { name: "Configurações", exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("tab", { name: /Pagamentos/i }).click();
    await page.waitForTimeout(2000);

    const formas = ["Dinheiro", "PIX", "Cartão de Crédito", "Cartão de Débito"];
    for (const f of formas) {
      await expect(page.getByText(f).first()).toBeVisible();
    }
  });
});

// ─────────────────────────────────────────────
// SPEC 15.5 — Clientes page
// ─────────────────────────────────────────────
test.describe("SPEC 15.5 — Clientes", () => {
  test("clientes page loads with data or empty state", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "Clientes");
    await expect(page.getByRole("heading", { name: /Clientes/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /novo cliente/i })).toBeVisible();
  });

  test("can open client form dialog", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "Clientes");
    await expect(page.getByRole("heading", { name: /Clientes/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /novo cliente/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────
// SPEC 15.6 — Entregadores page
// ─────────────────────────────────────────────
test.describe("SPEC 15.6 — Entregadores", () => {
  test("entregadores page loads", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "Entregadores");
    await expect(page.getByRole("heading", { name: "Entregadores", exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /novo entregador/i })).toBeVisible();
  });

  test("can open entregador form dialog", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "Entregadores");
    await expect(page.getByRole("heading", { name: "Entregadores", exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /novo entregador/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────
// SPEC 15.7 — Solicitações page  
// ─────────────────────────────────────────────
test.describe("SPEC 15.7 — Solicitações", () => {
  test("solicitações page loads with tabs", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "Solicitações");
    await expect(page.getByRole("heading", { name: "Solicitações", exact: true })).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("tab", { name: /todas/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /pendente/i }).first()).toBeVisible();
  });

  test("can open new solicitação dialog", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "Solicitações");
    await expect(page.getByRole("heading", { name: "Solicitações", exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /nova solicita/i }).first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────
// SPEC 15.9 — Caixas page
// ─────────────────────────────────────────────
test.describe("SPEC 15.9 — Caixas de Entregadores", () => {
  test("caixas page loads", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "Caixas");
    await expect(page.getByRole("heading", { name: /Caixas/i })).toBeVisible({ timeout: 15_000 });
  });
});

// ─────────────────────────────────────────────
// SPEC 15.10 — Financeiro
// ─────────────────────────────────────────────
test.describe("SPEC 15.10 — Financeiro", () => {
  test("financeiro page loads with tabs", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "Financeiro");
    await expect(page.getByRole("heading", { name: /Financeiro/i })).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("tab", { name: /Despesas/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /Receitas/i }).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// SPEC 15.11 — Faturas
// ─────────────────────────────────────────────
test.describe("SPEC 15.11 — Faturas", () => {
  test("faturas page loads", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "Faturas");
    await expect(page.getByRole("heading", { name: /Faturas/i })).toBeVisible({ timeout: 15_000 });
  });
});

// ─────────────────────────────────────────────
// SPEC 15 — Full Navigation Smoke
// ─────────────────────────────────────────────
test.describe("SPEC 15 — Admin Full Navigation", () => {
  test("can navigate to all admin pages via sidebar without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await adminLogin(page);

    const routes = [
      { sidebar: "Dashboard", heading: "Dashboard" },
      { sidebar: "Solicitações", heading: "Solicitações" },
      { sidebar: "Clientes", heading: "Clientes" },
      { sidebar: "Entregadores", heading: "Entregadores" },
      { sidebar: "Caixas", heading: "Caixas Entregadores" },
      { sidebar: "Faturas", heading: "Faturas" },
      { sidebar: "Financeiro", heading: "Financeiro" },
      { sidebar: "Relatórios", heading: "Relatórios" },
      { sidebar: "Configurações", heading: "Configurações" },
    ];

    for (const r of routes) {
      await navigateViaSidebar(page, r.sidebar);
      await expect(
        page.getByRole("heading", { name: r.heading, exact: true })
      ).toBeVisible({ timeout: 15_000 });
    }

    // No critical JS errors across all pages
    const critical = errors.filter(
      (e) =>
        !e.includes("supabase") &&
        !e.includes("fetch") &&
        !e.includes("net::ERR") &&
        !e.includes("Failed to fetch") &&
        !e.includes("NetworkError"),
    );
    expect(critical).toEqual([]);
  });
});
