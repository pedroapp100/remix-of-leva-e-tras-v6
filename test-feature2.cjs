const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\TRABALHO\\AppData\\Local\\Temp';

async function screenshot(page, name) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`[SCREENSHOT] ${filepath}`);
  return filepath;
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    // Navigate to login
    console.log('Navigating to login...');
    await page.goto('http://127.0.0.1:5174/login', { timeout: 15000 });
    await page.waitForTimeout(2000);
    await screenshot(page, '01-login-page');

    // Debug all inputs
    const inputs = await page.$$eval('input', els => els.map(el => ({
      type: el.type, name: el.name, placeholder: el.placeholder, id: el.id, label: el.labels?.[0]?.textContent
    })));
    console.log('Inputs:', JSON.stringify(inputs, null, 2));

    // Find email input - try by placeholder or type
    const emailInput = await page.$('input[placeholder*="Email" i], input[type="email"], input[name="email"]');
    if (emailInput) {
      console.log('Found email input');
      await emailInput.click();
      await emailInput.fill('pedro@levaetraz.com.br');
    } else {
      // Try all text inputs
      const allInputs = await page.$$('input');
      for (let i = 0; i < allInputs.length; i++) {
        const type = await allInputs[i].getAttribute('type');
        const placeholder = await allInputs[i].getAttribute('placeholder');
        console.log(`Input ${i}: type=${type}, placeholder=${placeholder}`);
      }
      // Fill first input as email
      if (allInputs.length > 0) {
        await allInputs[0].fill('pedro@levaetraz.com.br');
      }
    }

    // Find password input
    const pwInput = await page.$('input[type="password"]');
    if (pwInput) {
      console.log('Found password input');
      await pwInput.fill('123456');
    }

    await screenshot(page, '02-login-filled');

    // Find and click login button
    const submitBtn = await page.$('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
    if (submitBtn) {
      const btnText = await submitBtn.textContent();
      console.log(`Clicking button: ${btnText}`);
      await submitBtn.click();
    } else {
      console.log('No submit button found, pressing Enter');
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(4000);
    await screenshot(page, '03-after-login');
    console.log('URL after login:', page.url());

    // Check if we need tenant selection
    const tenantText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('After login body:', tenantText);

    // Navigate to /admin/solicitacoes
    console.log('\nNavigating to solicitacoes...');
    await page.goto('http://127.0.0.1:5174/admin/solicitacoes', { timeout: 15000 });
    await page.waitForTimeout(3000);
    await screenshot(page, '04-solicitacoes');

    console.log('URL:', page.url());
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
    console.log('Solicitacoes page text:', pageText.substring(0, 500));

    // Get all tabs
    const tabTexts = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"], .tab, button[data-state]'));
      return tabs.map(t => t.textContent.trim());
    });
    console.log('Tabs:', tabTexts);

    // Look for any solicitacao rows/cards
    const rows = await page.evaluate(() => {
      // Look for table rows or card containers
      const containers = Array.from(document.querySelectorAll('tr, [class*="SolicitacaoCard"], [class*="solicitacao-card"]'));
      return containers.slice(0, 5).map(c => c.textContent.trim().substring(0, 100));
    });
    console.log('Rows:', rows);

    await screenshot(page, '05-final');

  } catch (err) {
    console.error('Error:', err.message);
    await screenshot(page, 'error').catch(() => {});
  } finally {
    await browser.close();
  }
})();
