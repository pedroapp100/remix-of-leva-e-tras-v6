import { test, expect, type Page } from "@playwright/test";

// ──────────────────────────────────────────────────────────────
// Faturamento Automático — E2E Tests
// Tests the billing configuration UI and fatura page structure
// ──────────────────────────────────────────────────────────────

const EMAIL = process.env.E2E_ADMIN_EMAIL!;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD!;

async function waitForAppReady(page: Page) {
  const loader = page.getByText("Carregando...");
  await loader.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  await loader.waitFor({ state: "hidden", timeout: 30_000 });
}

async function adminLogin(page: Page) {
  await page.goto("/login");
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

async function navigateViaSidebar(page: Page, href: string) {
  const link = page.locator(`a[href="${href}"]`);
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await page.waitForLoadState("networkidle");
}

// ─────────────────────────────────────────────
// Faturamento: Client Form Billing Fields
// ─────────────────────────────────────────────
test.describe("Faturamento — Client Billing Config", () => {
  test("billing fields appear when modalidade is faturado", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "/admin/clientes");
    await expect(page.getByRole("heading", { name: /Clientes/i })).toBeVisible({ timeout: 15_000 });

    // Open new client dialog
    await page.getByRole("button", { name: /novo cliente/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });

    // Initially, faturamento-auto checkbox should NOT be visible (default is pre_pago)
    await expect(page.locator("#faturamento-auto")).not.toBeVisible();

    // Switch to "faturado" modalidade — find the select trigger and change it
    const modalidadeSelect = page.getByText(/Modalidade de Pagamento/i)
      .locator("..").locator("..").locator("button[role='combobox']").first();

    // If the select isn't a combobox, try finding it differently
    const selectTrigger = page.locator('[role="dialog"]').getByText(/pré-pago|pre_pago|Pré-Pago/i).first();
    if (await selectTrigger.isVisible().catch(() => false)) {
      await selectTrigger.click();
      await page.getByRole("option", { name: /faturado/i }).click();
    } else {
      // Try alternative: look for radio or select near "Modalidade"
      const dialog = page.locator('[role="dialog"]');
      const faturadoOption = dialog.getByText(/faturado/i).first();
      await faturadoOption.click();
    }

    // After selecting faturado, billing auto checkbox should be visible
    await expect(page.locator("#faturamento-auto")).toBeVisible({ timeout: 5_000 });

    // Click the checkbox to enable auto-billing
    await page.locator("#faturamento-auto").check();

    // Frequency radio buttons should now be visible
    await expect(page.locator("#freq-diario")).toBeVisible();
    await expect(page.locator("#freq-semanal")).toBeVisible();
    await expect(page.locator("#freq-mensal")).toBeVisible();
    await expect(page.locator("#freq-entrega")).toBeVisible();

    // Select "por_entrega" and verify the count field appears
    await page.locator("#freq-entrega").click();
    // A number input for delivery count threshold should appear
    await expect(page.getByPlaceholder('Ex: 30')).toBeVisible({ timeout: 3_000 });

    // Select "diario" — simplest option
    await page.locator("#freq-diario").click();
  });
});

// ─────────────────────────────────────────────
// Faturamento: Faturas Page Structure
// ─────────────────────────────────────────────
test.describe("Faturamento — Faturas Page", () => {
  test("faturas page shows ativas and finalizadas tabs", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "/admin/faturas");
    await expect(page.getByRole("heading", { name: /Faturas/i })).toBeVisible({ timeout: 15_000 });

    // Check for the two main tabs
    await expect(page.getByRole("tab", { name: /Ativas/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /Finalizadas/i }).first()).toBeVisible();
  });

  test("faturas ativas tab shows data or empty state", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "/admin/faturas");
    await expect(page.getByRole("heading", { name: /Faturas/i })).toBeVisible({ timeout: 15_000 });

    // Click Ativas tab
    await page.getByRole("tab", { name: /Ativas/i }).first().click();
    await page.waitForTimeout(2000);

    // Should show table data or empty state
    const hasData = await page.locator("table tbody tr").count();
    const hasEmpty = await page.getByText(/nenhuma fatura|sem faturas|vazio/i).count();
    expect(hasData + hasEmpty).toBeGreaterThan(0);
  });

  test("faturas finalizadas tab shows data or empty state", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "/admin/faturas");
    await expect(page.getByRole("heading", { name: /Faturas/i })).toBeVisible({ timeout: 15_000 });

    // Click Finalizadas tab
    await page.getByRole("tab", { name: /Finalizadas/i }).first().click();
    await page.waitForTimeout(2000);

    const hasData = await page.locator("table tbody tr").count();
    const hasEmpty = await page.getByText(/nenhuma fatura|sem faturas|vazio/i).count();
    expect(hasData + hasEmpty).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// Faturamento: Caixas Page Structure
// ─────────────────────────────────────────────
test.describe("Faturamento — Caixas Page", () => {
  test("caixas page shows tabs and abrir caixa button", async ({ page }) => {
    await adminLogin(page);
    await navigateViaSidebar(page, "/admin/caixas-entregadores");
    await expect(page.getByRole("heading", { name: "Caixas Entregadores", exact: true })).toBeVisible({ timeout: 15_000 });

    // Check for tab structure
    await expect(page.getByRole("tab", { name: /Caixas do Dia/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /Histórico/i }).first()).toBeVisible();

    // Check for "Abrir Caixa" button
    await expect(page.getByRole("button", { name: /Abrir Caixa/i })).toBeVisible();
  });
});
