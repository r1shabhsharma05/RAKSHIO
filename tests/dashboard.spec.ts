import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Dashboard Step 6: every route loads, every home button does its real job,
// multi-incident list + search/filter, settings + wipe, axe 0 on key pages.
async function seedDemo(page: Page) {
  await page.goto('/#/report');
  await page.getByRole('button', { name: /Demo data bharo/ }).click();
  await expect(page.getByRole('heading', { name: 'Kya ye sahi hai?' })).toBeVisible({ timeout: 8000 });
  const yes = page.getByRole('button', { name: 'Haan, sahi hai' });
  for (let i = 0; i < 3; i++) await yes.nth(0).click();
  await page.getByRole('button', { name: 'Ye sahi hai — aage badhein' }).click();
  await expect(page.getByRole('heading', { name: 'Aapka incident card' })).toBeVisible();
}

test('home renders empty, then shows the seeded ₹20,000 incident', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.getByRole('heading', { name: 'Panic me bhi, sahi kadam.' })).toBeVisible();
  await expect(page.getByText('No incident yet')).toBeVisible();
  await seedDemo(page);
  await page.goto('/#/');
  await expect(page.getByText('₹20,000').first()).toBeVisible();
  await expect(page.getByText('HDFC').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Golden Hour Clock' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Current Incident' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your Action Plan' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Incident Snapshot' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Evidence Vault' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Progress Tracker' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Second-Scam Shield' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Care Circle' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Proof Pack & Verify' })).toBeVisible();
});

test('all 12 sidebar routes load', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/');
  const routes: Array<[string, RegExp]> = [
    ['Home', /Panic me bhi, sahi kadam/],
    ['Report Fraud', /Boliye, kya hua\?/],
    ['Incident Dashboard', /Incident Dashboard/],
    ['Action Plan', /Golden Hour Clock/],
    ['1930 Call Coach', /1930 Call Coach/],
    ['Portal Assistance', /Ack Bridge/],
    ['Bank Alert Kit', /Bank Alert Kit/],
    ['Evidence Vault', /Evidence Vault/],
    ['Second-Scam Shield', /Second-Scam Shield/],
    ['Care Circle', /Care Circle/],
    ['Proof Pack & Verify', /Proof Pack/],
    ['Settings', /Settings/],
  ];
  for (const [label, heading] of routes) {
    await page.getByRole('link', { name: label }).first().click();
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 8000 });
  }
});

test('hero report buttons jump into voice and text listen', async ({ browser }) => {
  // Headless Chromium has no mic: stub SpeechRecognition so the voice
  // Listen screen renders without crashing the page target.
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    class FakeRec {
      continuous = false; interimResults = false; lang = '';
      onresult: unknown = null; onerror: unknown = null; onend: unknown = null;
      start() {} stop() {} abort() {}
    }
    (window as unknown as Record<string, unknown>).SpeechRecognition = FakeRec;
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRec;
  });
  const page = await ctx.newPage();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Report Fraud (Voice)' }).click();
  await expect(page.getByRole('heading', { name: 'Sun raha hoon — boliye' })).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Report Fraud (Text)' }).click();
  await expect(page.getByRole('heading', { name: 'Likh kar batayein' })).toBeVisible();
  await page.locator('#listen-text').fill('mere paise kat gaye');
  await page.getByRole('button', { name: 'Samjhaao' }).click();
  await expect(page.getByRole('heading', { name: /Kitne rupaye gaye\?/ })).toBeVisible({ timeout: 8000 });
  await ctx.close();
});

test('quick actions and action-plan buttons navigate to real tools', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/');
  await expect(page.getByRole('link', { name: /Call 1930/ }).first()).toHaveAttribute('href', 'tel:1930');
  await page.getByRole('link', { name: /Bank Alert/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Bank Alert Kit' })).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('link', { name: /Care Circle/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Care Circle' })).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Call 1930', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: '1930 Call Coach' })).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Open Portal' }).click();
  await expect(page.getByRole('heading', { name: 'Ack Bridge' })).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Bank Kit' }).click();
  await expect(page.getByRole('heading', { name: 'Bank Alert Kit' })).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Add Evidence' }).click();
  await expect(page.getByRole('heading', { name: 'Evidence Vault' })).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Check Guide' }).click();
  await expect(page.getByRole('heading', { name: 'Second-Scam Shield' })).toBeVisible();
});

test('vault widget: add evidence, verify chain green', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/vault');
  await page.getByLabel('Text').fill('Test SMS: OTP 123456 bhejo');
  await page.getByRole('button', { name: 'Vault me save karein' }).click();
  await expect(page.getByText('Test SMS', { exact: false })).toBeVisible();
  await page.goto('/#/');
  await expect(page.getByText('1 items saved', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Verify Chain Integrity' }).click();
  await expect(page.getByRole('region', { name: 'Evidence Vault' }).getByText(/Chain sahi hai/)).toBeVisible();
});

test('shield widget: recovery-scam check shows High Risk on home', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/shield');
  await page.getByLabel('Message paste karein').fill('Recovery agent hoon, paisa wapas karwa dunga, pehle fee bhejo');
  await page.getByRole('button', { name: 'Check karein' }).click();
  await expect(page.getByText('KHATRA')).toBeVisible();
  await page.goto('/#/');
  await expect(page.getByText('High Risk – Likely Scam')).toBeVisible();
});

test('proof export downloads a real PDF from home', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/');
  const download = page.waitForEvent('download', { timeout: 15000 });
  await page.getByRole('button', { name: 'Export Proof Pack (PDF)' }).click();
  expect((await download).suggestedFilename()).toBe('RAKSHIO-proof.pdf');
  await expect(page.getByText('PDF download ho gaya')).toBeVisible();
});

test('incidents page: search, filter, charts, detail status + delete', async ({ page }) => {
  await seedDemo(page);
  await seedDemo(page);
  await page.goto('/#/incidents');
  await expect(page.getByText('Total incidents')).toBeVisible();
  await expect(page.getByText('₹40,000')).toBeVisible();
  await expect(page.locator('svg.recharts-surface').first()).toBeVisible();
  await page.getByLabel('Incidents search karein').fill('HDFC');
  await expect(page.getByText('₹20,000').first()).toBeVisible();
  await page.getByLabel('Incidents search karein').fill('zzzz-no-match');
  await expect(page.getByText('Is filter me koi incident nahi mila.')).toBeVisible();
  await page.getByLabel('Incidents search karein').fill('');
  await page.getByRole('button', { name: /^Reported/ }).click();
  await expect(page.getByText('₹20,000').first()).toBeVisible();
  await page.getByRole('button', { name: /^All/ }).click();
  await page.locator('.db-incident-card').first().click();
  await expect(page.getByRole('heading', { name: 'Aapka incident card' })).toBeVisible();
  await page.getByLabel('Incident status badlein').selectOption('closed');
  await expect(page.getByText('Closed').first()).toBeVisible();
  await page.getByRole('button', { name: 'Delete karein' }).last().click();
  await page.getByRole('button', { name: 'Pakka delete karein' }).click();
  await expect(page.getByRole('heading', { name: 'Incident Dashboard' })).toBeVisible();
  await expect(page.locator('.db-incident-card')).toHaveCount(1);
});

test('follow-up guardian: mark done advances, .ics downloads', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/');
  await expect(page.getByText('1 ghante baad')).toBeVisible();
  await page.getByRole('button', { name: 'Done mark karein' }).click();
  await expect(page.getByText('24 ghante baad')).toBeVisible();
  await page.goto('/#/settings');
  const download = page.waitForEvent('download', { timeout: 10000 });
  await page.getByRole('button', { name: '.ics download' }).first().click();
  expect((await download).suggestedFilename()).toMatch(/\.ics$/);
});

test('settings: Hindi switch, toggles, export, one-tap wipe', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/settings');
  await page.getByLabel('Dashboard language').selectOption('hi');
  await expect(page.getByRole('link', { name: 'Fraud Report Karein' }).first()).toBeVisible();
  await page.getByLabel('Dashboard language').selectOption('en');
  await page.getByRole('switch', { name: 'Calm prompt' }).click();
  await expect(page.getByRole('switch', { name: 'Calm prompt' })).toHaveAttribute('aria-checked', 'false');
  const download = page.waitForEvent('download', { timeout: 10000 });
  await page.getByRole('button', { name: 'Sab kuch export karein (JSON)' }).click();
  expect((await download).suggestedFilename()).toBe('rakshio-export.json');
  await page.getByRole('button', { name: 'Sab kuch saaf karein' }).click();
  await page.getByRole('button', { name: 'Pakka — sab kuch saaf karein' }).click();
  await expect(page.getByText('No incident yet')).toBeVisible({ timeout: 8000 });
});

test('axe: 0 violations on home and incidents page', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/');
  await page.waitForTimeout(900);
  const homeAxe = await new AxeBuilder({ page }).analyze();
  expect(homeAxe.violations).toEqual([]);
  await page.goto('/#/incidents');
  await page.waitForTimeout(900);
  const listAxe = await new AxeBuilder({ page }).analyze();
  expect(listAxe.violations).toEqual([]);
});

test('mobile 390: bottom nav, drawer, no horizontal scroll', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  await seedDemo(page);
  await page.goto('/#/');
  await expect(page.locator('.db-bottomnav')).toBeVisible();
  await page.getByRole('button', { name: 'Menu kholein' }).click();
  const drawer = page.getByRole('dialog', { name: 'Navigation' });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});

// Live E2E fixes (27 Nov real-Chrome walk): each test pins one bug found on
// the Step 4 live site, so it cannot regress in the dashboard rebuild.
test('route change resets scroll — banner fully visible after report flow', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const banner = page.getByRole('note');
  await expect(banner).toBeVisible();
  const box = await banner.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThan(68); // below the sticky 68px header
});

test('unslop step 7: honest banner appears exactly once per tool page', async ({ page }) => {
  await seedDemo(page);
  for (const route of ['/vault', '/shield', '/bank', '/report']) {
    await page.goto(`/#${route}`);
    await expect(page.getByText('RAKSHIO report file nahi karta')).toHaveCount(1);
  }
});

test('unslop step 7: vault select is dark, incidents status is a list not a pie', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/vault');
  const select = page.locator('#ev-kind');
  await expect(select).toBeVisible();
  expect(await select.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgb(255, 255, 255)');
  await page.goto('/#/incidents');
  await expect(page.getByLabel('Incidents by status').getByRole('list')).toBeVisible();
  await expect(page.getByLabel('Incidents by status').getByText('Reported')).toBeVisible();
});

test('fix 1: back buttons work — Judge, Triage, and browser Back', async ({ page }) => {
  await page.goto('/#/report');
  await page.getByRole('button', { name: /Judge Mode/ }).click();
  await expect(page.getByRole('heading', { name: 'Judge Mode' })).toBeVisible();
  await page.getByRole('button', { name: 'Wapas' }).click();
  await expect(page.getByRole('heading', { name: 'Boliye, kya hua?' })).toBeVisible();

  await seedDemo(page);
  await page.goto('/#/');
  await page.getByRole('link', { name: 'Incident Dashboard' }).first().click();
  await page.getByRole('link', { name: /₹20,000/ }).first().click();
  await page.getByRole('button', { name: /Triage — mera rasta kya hai/ }).click();
  await expect(page.getByRole('heading', { name: /Paisa gaya hai|Paisa nahi gaya|Abhi saaf nahi hai/ }).first()).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: 'Wapas' }).click();
  await expect(page.getByRole('heading', { name: 'Aapka incident card' })).toBeVisible();

  // Browser Back now moves through real routes instead of exiting the app.
  await page.goto('/#/');
  await page.getByRole('link', { name: 'Report Fraud' }).first().click();
  await expect(page.getByRole('heading', { name: 'Boliye, kya hua?' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Panic me bhi, sahi kadam.' })).toBeVisible();
  await expect(page.url()).toContain('#/');
});

test('fix 2: bank draft follows the selected bank; ref number saves explicitly', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/bank');
  const draft = page.getByLabel('Bank draft');
  await expect(draft).toHaveValue(/Main HDFC ka khaata-dhaarak hoon/);
  await page.getByLabel('Bank chunein').selectOption('SBI');
  await expect(draft).toHaveValue(/Main SBI ka khaata-dhaarak hoon/);
  await expect(draft).not.toHaveValue(/HDFC/);
  await expect(page.getByRole('link', { name: /SBI: 1800 11 2211/ })).toBeVisible();

  await page.getByLabel('Bank reference number (call ke baad milega)').fill('SR123456789');
  await page.getByRole('button', { name: 'Reference number save karein' }).click();
  await expect(page.getByText('✓ Reference number save ho gaya.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Bank reference number (call ke baad milega)')).toHaveValue('SR123456789');
});

test('fix 3: caregiver mode is visibly on — badge, incident label, vault rows', async ({ page }) => {
  await page.goto('/#/report');
  await page.getByLabel(/caregiver mode/).check();
  await expect(page.getByText('Caregiver mode ON')).toBeVisible();
  await expect(page.locator('.db-header')).toContainText('Caregiver');
  await seedDemo(page);
  await expect(page.getByText('Caregiver ne bhara hai')).toBeVisible();
  await page.goto('/#/vault');
  await page.getByLabel('Text').fill('Fraud SMS — caregiver ne likha');
  await page.getByRole('button', { name: 'Vault me save karein' }).click();
  await expect(page.getByText(/\(caregiver\)/)).toBeVisible();
});

test('fix 4: every deadline shows its window; overdue portal is explained', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/');
  await expect(page.getByText('≤48 hours window')).toBeVisible();
  await expect(page.getByText('≤24 hours window')).toBeVisible();
  await expect(page.getByText('≤3 working days window')).toBeVisible();
  // Seeded demo is ~30h old: portal (24h) is over while 1930 (48h) is not.
  await expect(page.getByText(/portal \(24h\) 1930 \(48h\) se pehle/)).toBeVisible();
});

test('fix 5: timeline date is one script; calm button label never ticks', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/');
  await page.getByRole('link', { name: 'Incident Dashboard' }).first().click();
  await page.getByRole('link', { name: /₹20,000/ }).first().click();
  const timeline = page.locator('.timeline-item', { hasText: 'Aapne RAKSHIO ko bataya' });
  await expect(timeline).toBeVisible();
  await expect(timeline).toContainText(/Nov/);
  await expect(timeline).not.toContainText(/नव/);

  await page.goto('/#/report');
  const btn = page.getByRole('button', { name: 'Aage badhein', exact: true });
  await expect(btn).toBeVisible();
  await expect(page.getByText(/second me ye card band ho jayega/)).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(page.getByRole('button', { name: 'Aage badhein', exact: true })).toBeVisible();
});

test('gsap step 8: home cards end visible; reduced motion skips the entrance', async ({ page }) => {
  await page.goto('/#/');
  // Entrance finishes: every card ends at full opacity, nothing stuck hidden.
  await expect
    .poll(async () => {
      const opacities = await page
        .locator('.db-grid-home .db-card')
        .evaluateAll((els) => els.map((el) => Number.parseFloat(getComputedStyle(el).opacity)));
      return opacities.length > 0 && opacities.every((o) => o === 1);
    })
    .toBe(true);
  // Reduced motion: no entrance at all — cards are fully visible at once.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Panic me bhi, sahi kadam.' })).toBeVisible();
  const opacities = await page
    .locator('.db-grid-home .db-card')
    .evaluateAll((els) => els.map((el) => Number.parseFloat(getComputedStyle(el).opacity)));
  expect(opacities.length).toBeGreaterThan(0);
  expect(opacities.every((o) => o === 1)).toBe(true);
});
