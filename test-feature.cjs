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
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    // Navigate and login
    console.log('Navigating to app...');
    await page.goto('http://127.0.0.1:5174', { timeout: 15000 });
    await page.waitForTimeout(2000);
    await screenshot(page, '01-initial');

    console.log('URL:', page.url());

    // Try login
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      console.log('Login form found, logging in...');
      await emailInput.fill('pedro@levaetraz.com.br');
      const pwInput = await page.$('input[type="password"]');
      if (pwInput) {
        await pwInput.fill('123456');
      }
      await screenshot(page, '02-login-filled');

      // Press Enter or click submit
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
      await screenshot(page, '03-after-login');
      console.log('URL after login:', page.url());
    } else {
      console.log('No email input found, maybe already logged in or different UI');
      // Print page content for debugging
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
      console.log('Body:', bodyText);
    }

    // Navigate to /admin/solicitacoes
    console.log('Going to /admin/solicitacoes...');
    await page.goto('http://127.0.0.1:5174/admin/solicitacoes', { timeout: 15000 });
    await page.waitForTimeout(3000);
    await screenshot(page, '04-solicitacoes-page');

    console.log('URL:', page.url());
    const bodyText2 = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log('Page text:', bodyText2.substring(0, 800));

    // Look at the page structure
    const tabTexts = await page.$$eval('[role="tab"]', els => els.map(el => el.textContent.trim()));
    console.log('Tabs:', tabTexts);

    // ===== TEST 1: Find pendente with 2+ routes =====
    console.log('\n=== TEST 1: Finding pendente solicitacao ===');

    // Click Pendente tab if exists
    const tabs = await page.$$('[role="tab"]');
    for (const tab of tabs) {
      const text = await tab.textContent();
      if (text && (text.includes('Pendente') || text.includes('pendente'))) {
        console.log('Clicking Pendente tab...');
        await tab.click();
        await page.waitForTimeout(1000);
        break;
      }
    }
    await screenshot(page, '05-pendente-tab');

    // Find all rows/cards that have edit buttons
    // Try multiple selectors for edit/pencil buttons
    const editBtns = await page.$$('[aria-label*="ditar" i], [title*="ditar" i], button svg[class*="pencil" i], [data-action="edit"]');
    console.log(`Edit buttons by aria/title: ${editBtns.length}`);

    // Let's look for lucide icons more specifically
    const svgBtns = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.map((btn, i) => {
        const svg = btn.querySelector('svg');
        const svgPath = btn.querySelector('path')?.getAttribute('d') ?? '';
        return { index: i, text: btn.textContent.trim().substring(0, 30), hasSvg: !!svg, class: btn.className.substring(0, 50) };
      }).filter(b => b.hasSvg && b.text === '').slice(0, 20);
    });
    console.log('Icon-only buttons:', JSON.stringify(svgBtns, null, 2));

    // Check if we see any solicitacao data
    const statusBadges = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const badges = all.filter(el => {
        const t = el.textContent.trim();
        return (t === 'pendente' || t === 'aceita' || t === 'em_andamento' || t === 'Em Andamento' || t === 'Pendente') && el.children.length === 0;
      });
      return badges.map(b => ({ text: b.textContent.trim(), tag: b.tagName, class: b.className.substring(0, 50) })).slice(0, 10);
    });
    console.log('Status badges:', JSON.stringify(statusBadges));

    // Get all visible text in page
    const allCards = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[class*="card" i], [class*="Card" i], [class*="row" i]'));
      return cards.slice(0, 5).map(c => c.textContent.trim().substring(0, 100));
    });
    console.log('Cards text:', JSON.stringify(allCards));

    // Find buttons that might be edit buttons (pencil icon buttons)
    // Try clicking the first edit-looking button
    const allButtons = await page.$$('button');
    let editButtonFound = false;
    for (let i = 0; i < Math.min(allButtons.length, 50); i++) {
      const btn = allButtons[i];
      const isVisible = await btn.isVisible();
      if (!isVisible) continue;
      const txt = await btn.textContent();
      if (txt && txt.trim().length > 2) continue; // skip buttons with text
      const ariaLabel = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');
      console.log(`Button ${i}: aria="${ariaLabel}", title="${title}", text="${txt?.trim()}"`);
    }

    await screenshot(page, '06-debug-state');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    await screenshot(page, 'error-state').catch(() => {});
  } finally {
    await browser.close();
  }
})();
