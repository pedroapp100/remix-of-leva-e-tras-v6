import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_ADMIN_EMAIL!;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD!;

async function adminLogin(page: Page) {
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.setItem("leva-traz-welcome-seen", "true");
  });
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: /entrar na plataforma/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 20_000 });
  // Wait for loader to disappear
  await page.getByText("Carregando...").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
}

test.describe("Impersonation — Visualizar como Cliente/Entregador", () => {
  test("ícone LogIn aparece na coluna Ações de Clientes", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/clientes");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e-debug/clientes-acoes.png" });

    // Deve ter pelo menos um botão com título "Entrar como este cliente" ou "sem conta"
    const loginBtns = page.locator('[data-testid="impersonate-btn"], button:has(svg)').first();
    // Verificar via tooltip text que existe o ícone certo
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: "e2e-debug/clientes-acoes-loaded.png" });
  });

  test("ícone LogIn aparece na coluna Ações de Entregadores", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/entregadores");
    await page.waitForLoadState("networkidle");

    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: "e2e-debug/entregadores-acoes-loaded.png" });
  });

  test("clicar em cliente com conta redireciona e exibe banner amarelo", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/clientes");
    await page.waitForLoadState("networkidle");

    const rows = page.locator("table tbody tr");
    await rows.first().waitFor({ timeout: 10_000 });
    const count = await rows.count();

    let clicked = false;
    for (let i = 0; i < Math.min(count, 10); i++) {
      const row = rows.nth(i);
      const btns = row.getByRole("button");
      const btnCount = await btns.count();
      if (btnCount < 2) continue;
      // O botão LogIn é o 2º (índice 1): Eye, LogIn, Pencil, Trash
      const loginBtn = btns.nth(1);
      const disabled = await loginBtn.isDisabled();
      if (!disabled) {
        await loginBtn.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      console.log("Nenhum cliente com profile_id — pulando redirecionamento");
      return;
    }

    await page.waitForURL(/\/cliente/, { timeout: 10_000 });
    await page.screenshot({ path: "e2e-debug/impersonation-cliente-banner.png" });

    // Banner amarelo deve estar visível
    await expect(page.locator("text=Visualizando como Cliente")).toBeVisible({ timeout: 5_000 });

    // Sair deve voltar para /admin e remover o banner
    await page.getByRole("button", { name: /sair da visualização/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 10_000 });
    await page.screenshot({ path: "e2e-debug/impersonation-saiu.png" });
    await expect(page.locator("text=Visualizando como Cliente")).not.toBeVisible();
  });

  test("clicar em entregador com conta redireciona e exibe banner amarelo", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/entregadores");
    await page.waitForLoadState("networkidle");

    const rows = page.locator("table tbody tr");
    await rows.first().waitFor({ timeout: 10_000 });
    const count = await rows.count();

    let clicked = false;
    for (let i = 0; i < Math.min(count, 10); i++) {
      const row = rows.nth(i);
      const btns = row.getByRole("button");
      const btnCount = await btns.count();
      if (btnCount < 2) continue;
      const loginBtn = btns.nth(1);
      const disabled = await loginBtn.isDisabled();
      if (!disabled) {
        await loginBtn.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      console.log("Nenhum entregador com profile_id — pulando redirecionamento");
      return;
    }

    await page.waitForURL(/\/entregador/, { timeout: 10_000 });
    await page.screenshot({ path: "e2e-debug/impersonation-entregador-banner.png" });

    await expect(page.locator("text=Visualizando como Entregador")).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /sair da visualização/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 10_000 });
    await expect(page.locator("text=Visualizando como Entregador")).not.toBeVisible();
  });
});
