import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Step 21: new features (Do-Not-Pay, Judge tour + restore, Coach live
// clocks, Chakshu draft, 30d/90d follow-ups, Vault capture guide,
// large-type mode) and gap fixes (H1/H4/T2/T4/P1/P2 spot checks).
// Default language is Hinglish ('hg'), so assertions use HG strings.

async function seedDemo(page: Page) {
  await page.goto('/#/report');
  await page.getByRole('button', { name: /Demo data bharo/ }).click();
  await expect(page.getByRole('heading', { name: 'Kya ye sahi hai?' })).toBeVisible({ timeout: 8000 });
  const yes = page.getByRole('button', { name: 'Haan, sahi hai' });
  for (let i = 0; i < 4; i++) await yes.nth(0).click();
  await page.getByRole('button', { name: 'Ye sahi hai — aage badhein' }).click();
  await expect(page.getByRole('heading', { name: 'Aapka incident card' })).toBeVisible();
}

async function seedReal(page: Page) {
  // A real (non-demo) incident via text mode, with all four confirm fields.
  await page.goto('/#/report?mode=text');
  await page.getByLabel('Kya hua, apne shabdon me likhiye').fill('Mere SBI account se kal subah das baje bees hazaar UPI se kat gaye. Customer care ne OTP manga tha.');
  await page.getByRole('button', { name: 'Samjhaao' }).click();
  await expect(page.getByRole('heading', { name: 'Kya ye sahi hai?' })).toBeVisible({ timeout: 8000 });
  const yes = page.getByRole('button', { name: 'Haan, sahi hai' });
  for (let i = 0; i < 4; i++) await yes.nth(0).click();
  await page.getByRole('button', { name: 'Ye sahi hai — aage badhein' }).click();
  await expect(page.getByRole('heading', { name: 'Aapka incident card' })).toBeVisible();
}

test('step 21: do-not-pay page loads, axe 0, 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/donotpay');
  await expect(page.getByRole('heading', { name: /Paisa wapas paane ke liye/ }).first()).toBeVisible();
  await expect(page.locator('a[href="tel:1930"]').first()).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('step 21: judge tour, demo banner, restore hands back the real incident', async ({ page }) => {
  await seedReal(page);
  await page.goto('/#/judge');
  await expect(page.getByText('DEMO — fictional data', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Judge walkthrough/ })).toBeVisible();
  await page.getByRole('button', { name: /Seeded scenario chalao/ }).click();
  await page.getByRole('button', { name: /Seed karo — purani incident saved rahegi/ }).click();
  await expect(page.getByRole('heading', { name: 'Aapka incident card' })).toBeVisible();
  // The seeded demo is 20 minutes old — never a stale "Time over".
  await expect(page.getByText('Time over')).toHaveCount(0);
  await page.goto('/#/judge');
  await expect(page.getByRole('button', { name: 'Meri asli incident par wapas jayein' })).toBeVisible();
  await page.getByRole('button', { name: 'Meri asli incident par wapas jayein' }).click();
  await expect(page.getByText('₹20,000').first()).toBeVisible();
  await expect(page.getByText('SBI').first()).toBeVisible();
});

test('step 21: coach live clocks + bank due date', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/coach');
  await expect(page.getByRole('heading', { name: /Aapki ghadiyaan/ }).first()).toBeVisible();
  await expect(page.getByText(/Bank zero-liability deadline/)).toBeVisible();
});

test('step 21: chakshu draft card on the portal page', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/portal');
  await expect(page.getByRole('heading', { name: /Chakshu/ }).first()).toBeVisible();
  await expect(page.getByText(/sancharsaathi.gov.in/)).toBeVisible();
});

test('step 21: follow-ups run to 30d and 90d', async ({ page }) => {
  await seedDemo(page);
  // Home shows only the NEXT reminder (compact); the full list lives on
  // the incident detail page.
  await page.goto('/#/incidents');
  await page.getByRole('link', { name: /₹20,000/ }).first().click();
  await expect(page.getByText(/30 din baad/)).toBeVisible();
  await expect(page.getByText(/90 din baad/)).toBeVisible();
});

test('step 21: vault capture guide + large-type setting', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/vault');
  await expect(page.getByRole('heading', { name: /Kya save karein/ }).first()).toBeVisible();
  await page.goto('/#/settings');
  const toggle = page.getByRole('switch', { name: /Bade akshar/ });
  await toggle.click();
  expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('18px');
  await toggle.click();
  expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('');
});

test('step 21 gaps: 1930 overdue + portal pending shows its own ring text (P2 fallout)', async ({ page }) => {
  await seedDemo(page);
  await page.evaluate(() => {
    const raw = localStorage.getItem('rakshio.incidents.v1');
    if (!raw) return;
    const list = JSON.parse(raw) as { fraudAt: string }[];
    list[0].fraudAt = new Date(Date.now() - 30 * 3600 * 1000).toISOString();
    localStorage.setItem('rakshio.incidents.v1', JSON.stringify(list));
  });
  await page.reload();
  await page.goto('/#/');
  // No 1930 call saved: the portal clock never started, and the ring must
  // say the 1930 window closed — not "deadlines still open".
  await expect(page.getByText('1930 ki 4 ghante ki window beet gayi')).toBeVisible();
});

test('step 21 gaps: portal chip is pending with no 1930 call (P2)', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/');
  await expect(page.getByText('1930 call se 24 ghante')).toBeVisible();
});

test('step 21 gaps: unknown fraud time shows no countdown (P1)', async ({ page }) => {
  await seedDemo(page);
  await page.evaluate(() => {
    const raw = localStorage.getItem('rakshio.incidents.v1');
    if (!raw) return;
    const list = JSON.parse(raw) as { fraudAt: string | null }[];
    list[0].fraudAt = null;
    localStorage.setItem('rakshio.incidents.v1', JSON.stringify(list));
  });
  // The store is in-memory: a hash navigation alone does not reload it.
  await page.reload();
  await page.goto('/#/');
  await expect(page.getByText('Fraud ka time pata nahi')).toBeVisible();
  await expect(page.getByText('00:00:00')).toHaveCount(0);
});

test('step 21 gaps: ack warning on a wrong-format number (H4)', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/portal');
  await page.getByLabel(/Ack number|acknowledgement/i).fill('12345');
  await expect(page.getByText(/14 digits ka hota hai/)).toBeVisible();
  await page.getByLabel(/Ack number|acknowledgement/i).fill('32912345678901');
  await expect(page.getByText(/14 digits ka hota hai/)).toHaveCount(0);
});

test('step 21 gaps: 6 MB vault file is rejected with no row (T2)', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/vault');
  // The file picker only renders once kind 'file' is chosen.
  await page.selectOption('#ev-kind', 'file');
  const big = Buffer.alloc(6 * 1024 * 1024, 0);
  await page.setInputFiles('input[type="file"]', { name: 'big.png', mimeType: 'image/png', buffer: big });
  await expect(page.getByText(/5 MB se badi hai/)).toBeVisible();
  await expect(page.getByText('big.png')).toHaveCount(0);
});

test('step 21 gaps: wipe clears caches (T4)', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/');
  // Warm a cache entry so wipe has something to clear.
  await page.evaluate(async () => {
    const c = await caches.open('rakshio-test');
    await c.put('/test', new Response('x'));
  });
  expect(await page.evaluate(() => caches.keys())).toContain('rakshio-test');
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Sab kuch saaf karein' }).click();
  await page.getByRole('button', { name: 'Pakka — sab kuch saaf karein' }).click();
  // Wipe is async (Dexie + caches + SW) — wait for its toast first.
  await expect(page.getByText('Sab kuch saaf ho gaya')).toBeVisible();
  await expect(page.evaluate(() => caches.keys())).resolves.toEqual([]);
});

test('step 21: axe 0 on judge, coach and portal', async ({ page }) => {
  await seedDemo(page);
  for (const route of ['/#/judge', '/#/coach', '/#/portal']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  }
});
