import { test, expect } from "@playwright/test";

// ──────────────────────────────────────────────
// SPEC Etapa 15 — Validação End-to-End (offline)
// Tests that don't require Supabase auth
// ──────────────────────────────────────────────

test.describe("Landing & Public Pages", () => {
  test("landing page loads and shows brand name", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Leva/i);
    await expect(page.locator("body")).toBeVisible();
  });

  test("landing page has hero section and CTA", async ({ page }) => {
    await page.goto("/");
    // Should have navigation and hero content
    await expect(page.locator("nav, header")).toBeVisible();
    // Should have at least one CTA button
    const ctaLinks = page.locator('a[href="/login"], button:has-text("Entrar"), a:has-text("Entrar")');
    await expect(ctaLinks.first()).toBeVisible();
  });

  test("login page renders complete form", async ({ page }) => {
    await page.goto("/login");
    // Brand
    await expect(page.getByText("Leva e Traz")).toBeVisible();
    // Form fields
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    // Remember me
    await expect(page.locator("#remember")).toBeVisible();
    await expect(page.getByText("Manter conectado")).toBeVisible();
    // Submit button
    await expect(page.getByRole("button", { name: /entrar na plataforma/i })).toBeVisible();
    // Forgot password link
    await expect(page.getByText("Esqueceu a senha?")).toBeVisible();
  });

  test("login form validates empty fields client-side", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /entrar na plataforma/i }).click();
    // Should show validation errors
    await expect(page.getByText(/email inválido|obrigatório/i)).toBeVisible();
  });

  test("login form validates invalid email", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("not-an-email");
    await page.locator("#password").fill("123456");
    await page.getByRole("button", { name: /entrar na plataforma/i }).click();
    // May show validation error or Supabase error — either way, should not navigate away
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/\/login$/);
  });

  test("login form validates short password", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("test@test.com");
    await page.locator("#password").fill("123");
    await page.getByRole("button", { name: /entrar na plataforma/i }).click();
    await expect(page.getByText(/mínimo 6 caracteres/i)).toBeVisible();
  });

  test("forgot-password page loads with correct content", async ({ page }) => {
    await page.goto("/login/reset");
    await expect(page.getByText("Recuperar senha")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.getByRole("button", { name: /enviar link/i })).toBeVisible();
    await expect(page.getByText("Voltar para login")).toBeVisible();
  });

  test("forgot-password validates empty email", async ({ page }) => {
    await page.goto("/login/reset");
    await page.getByRole("button", { name: /enviar link/i }).click();
    await expect(page.getByText(/email inválido/i)).toBeVisible();
  });

  test("navigate from login to forgot-password and back", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("Esqueceu a senha?").click();
    await page.waitForURL(/\/login\/reset/);
    await expect(page.getByText("Recuperar senha")).toBeVisible();

    await page.getByText("Voltar para login").click();
    await page.waitForURL(/\/login$/);
    await expect(page.getByText("Bem-vindo de volta")).toBeVisible();
  });

  test("404 page shows correct content", async ({ page }) => {
    await page.goto("/rota-que-nao-existe");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText(/page not found/i)).toBeVisible();
    await expect(page.getByText(/return to home/i)).toBeVisible();
  });

  test("theme toggle on login page works", async ({ page }) => {
    await page.goto("/login");
    const themeToggle = page.getByRole("button", { name: /alternar tema/i });
    await expect(themeToggle).toBeVisible();
    // Click should toggle without errors
    await themeToggle.click();
    // Page should still be usable
    await expect(page.locator("#email")).toBeVisible();
  });
});

test.describe("Auth Guard Redirects — SPEC 15 item 14", () => {
  test("unauthenticated /admin → redirect to landing or login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/(login)?$/);
    expect(page.url()).toMatch(/\/(login)?$/);
  });

  test("unauthenticated /admin/clientes → redirect", async ({ page }) => {
    await page.goto("/admin/clientes");
    await page.waitForURL(/\/(login)?$/);
    expect(page.url()).toMatch(/\/(login)?$/);
  });

  test("unauthenticated /admin/configuracoes → redirect", async ({ page }) => {
    await page.goto("/admin/configuracoes");
    await page.waitForURL(/\/(login)?$/);
    expect(page.url()).toMatch(/\/(login)?$/);
  });

  test("unauthenticated /cliente → redirect", async ({ page }) => {
    await page.goto("/cliente");
    await page.waitForURL(/\/(login)?$/);
    expect(page.url()).toMatch(/\/(login)?$/);
  });

  test("unauthenticated /entregador → redirect", async ({ page }) => {
    await page.goto("/entregador");
    await page.waitForURL(/\/(login)?$/);
    expect(page.url()).toMatch(/\/(login)?$/);
  });

  test("unauthenticated /admin/financeiro → redirect", async ({ page }) => {
    await page.goto("/admin/financeiro");
    await page.waitForURL(/\/(login)?$/);
    expect(page.url()).toMatch(/\/(login)?$/);
  });

  test("unauthenticated /admin/faturas → redirect", async ({ page }) => {
    await page.goto("/admin/faturas");
    await page.waitForURL(/\/(login)?$/);
    expect(page.url()).toMatch(/\/(login)?$/);
  });
});

test.describe("Convenience Redirects", () => {
  test("/clientes → /admin/clientes (then auth redirect)", async ({ page }) => {
    await page.goto("/clientes");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/404/)).not.toBeVisible();
  });

  test("/entregadores → /admin/entregadores (then auth redirect)", async ({ page }) => {
    await page.goto("/entregadores");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/404/)).not.toBeVisible();
  });

  test("/solicitacoes → /admin/solicitacoes (then auth redirect)", async ({ page }) => {
    await page.goto("/solicitacoes");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/404/)).not.toBeVisible();
  });

  test("/faturas → /admin/faturas (then auth redirect)", async ({ page }) => {
    await page.goto("/faturas");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/404/)).not.toBeVisible();
  });

  test("/financeiro → /admin/financeiro (then auth redirect)", async ({ page }) => {
    await page.goto("/financeiro");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/404/)).not.toBeVisible();
  });

  test("/configuracoes → /admin/configuracoes (then auth redirect)", async ({ page }) => {
    await page.goto("/configuracoes");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/404/)).not.toBeVisible();
  });
});

test.describe("No Console Errors — SPEC 15 requirement", () => {
  test("landing page has no critical JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const critical = errors.filter(
      (e) => !e.includes("supabase") && !e.includes("fetch") && !e.includes("net::ERR")
    );
    expect(critical).toEqual([]);
  });

  test("login page has no critical JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const critical = errors.filter(
      (e) => !e.includes("supabase") && !e.includes("fetch") && !e.includes("net::ERR")
    );
    expect(critical).toEqual([]);
  });
});
