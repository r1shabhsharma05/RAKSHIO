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
  await expect(page.getByText('Abhi koi incident nahi')).toBeVisible();
  await seedDemo(page);
  await page.goto('/#/');
  await expect(page.getByText('₹20,000').first()).toBeVisible();
  await expect(page.getByText('HDFC').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Golden Hour Clock' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Current Incident' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Aapka Action Plan' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Incident Snapshot' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Evidence Vault' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Progress Tracker' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Second-Scam Shield' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Care Circle' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Proof Pack aur Verify' })).toBeVisible();
});

test('all 12 sidebar routes load', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/');
  const routes: Array<[string, RegExp]> = [
    ['Home', /Panic me bhi, sahi kadam/],
    ['Fraud Report Karein', /Boliye, kya hua\?/],
    ['Incident Dashboard', /Incident Dashboard/],
    ['Action Plan', /Golden Hour Clock/],
    ['1930 Call Coach', /1930 Call Coach/],
    ['Portal Madad', /Ack Bridge/],
    ['Bank Alert Kit', /Bank Alert Kit/],
    ['Evidence Vault', /Evidence Vault/],
    ['Second-Scam Shield', /Second-Scam Shield/],
    ['Care Circle', /Care Circle/],
    ['Proof Pack aur Verify', /Proof Pack/],
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
  await expect(page.getByRole('heading', { name: 'Bank Alert Kit' }).first()).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('link', { name: /Care Circle/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Care Circle' }).first()).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Call 1930', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: '1930 Call Coach' }).first()).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Open Portal' }).click();
  await expect(page.getByRole('heading', { name: 'Ack Bridge' })).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Bank Kit' }).click();
  await expect(page.getByRole('heading', { name: 'Bank Alert Kit' }).first()).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Add Evidence' }).click();
  await expect(page.getByRole('heading', { name: 'Evidence Vault' }).first()).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Check Guide' }).click();
  await expect(page.getByRole('heading', { name: 'Second-Scam Shield' })).toBeVisible();
});

test('vault widget: add evidence, verify chain green', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/vault');
  await page.getByLabel('Text').fill('Test SMS: OTP 123456 bhejo');
  await page.getByRole('button', { name: 'Vault me save karein' }).click();
  // WHY the toast, not 'Test SMS': getByText matches the textarea's own
  // value, so asserting on it passes before the save even runs — and a
  // goto('/') fired while the Dexie write is still in flight makes Home's
  // read see a pre-write snapshot (0 rows). The toast fires only after
  // the write committed AND the re-read returned the row.
  await expect(page.getByText('Saboot save ho gaya')).toBeVisible();
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
  await expect(page.getByRole('link', { name: 'धोखाधड़ी की रिपोर्ट करें' }).first()).toBeVisible();
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

test('mobile 390: bottom dock, no horizontal scroll', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  await seedDemo(page);
  await page.goto('/#/');
  await expect(page.locator('.gd-dock-bottom')).toBeVisible();
  await expect(page.locator('.gd-dock-side')).toBeHidden();
  await page.getByRole('link', { name: 'Settings' }).last().click();
  await expect(page.getByRole('heading', { name: 'Settings' }).first()).toBeVisible();
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
  const viewport = page.viewportSize();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
});

test('unslop step 7: honest banner appears exactly once per tool page', async ({ page }) => {
  await seedDemo(page);
  for (const route of ['/vault', '/shield', '/bank', '/report']) {
    await page.goto(`/#${route}`);
    await expect(page.getByText('RAKSHIO report file nahi karta')).toHaveCount(1);
  }
});

test('unslop step 7: vault select is readable in the dark theme, incidents status is a list not a pie', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/vault');
  const select = page.locator('#ev-kind');
  await expect(select).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('.gd-app')).toHaveAttribute('data-theme', 'dark');
  // The old bug: the select fell back to the UA white default on a dark
  // page. In the dark theme its background must not be white.
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
  await page.getByRole('link', { name: 'Fraud Report Karein' }).first().click();
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
  await expect(page.locator('.gd-top-actions')).toContainText('Caregiver');
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

// Step 10 — Glassy shell + Step 9 fixes. Each test pins one reported bug.
test('step 10: language switch x3 visibly changes the UI', async ({ page }) => {
  await page.goto('/#/');
  const select = page.locator('.gd-lang select');
  await select.selectOption('en');
  await expect(page.getByRole('heading', { name: "Don't panic, take the right step." })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Report Fraud' }).first()).toBeVisible();
  await select.selectOption('hi');
  await expect(page.getByRole('heading', { name: 'घबराएँ नहीं, सही कदम उठाएँ।' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'धोखाधड़ी की रिपोर्ट करें' }).first()).toBeVisible();
  await select.selectOption('hg');
  await expect(page.getByRole('heading', { name: 'Panic me bhi, sahi kadam.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Fraud Report Karein' }).first()).toBeVisible();
});

test('step 10: language select options are dark and readable in the dark theme', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('.gd-app')).toHaveAttribute('data-theme', 'dark');
  // The reported bug: options rendered light-on-white (white box). The
  // option must carry the dark surface, not the UA white default.
  const option = page.locator('.gd-lang select option').first();
  const bg = await option.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe('rgb(36, 28, 22)');
  const color = await option.evaluate((el) => getComputedStyle(el).color);
  expect(color).toBe('rgb(255, 246, 233)');
});

test('step 10: calm card never speaks without a tap; Suniye speaks once', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __speakCalls: number }).__speakCalls = 0;
    const synth = window.speechSynthesis;
    synth.speak = () => {
      (window as unknown as { __speakCalls: number }).__speakCalls += 1;
    };
  });
  await page.goto('/#/report');
  await expect(page.getByRole('heading', { name: 'Aap safe hain' })).toBeVisible();
  await page.waitForTimeout(2000);
  expect(await page.evaluate(() => (window as unknown as { __speakCalls: number }).__speakCalls)).toBe(0);
  await page.getByRole('button', { name: 'Suniye' }).click();
  expect(await page.evaluate(() => (window as unknown as { __speakCalls: number }).__speakCalls)).toBe(1);

  // Confirm screen: no auto-readback either — only the button speaks.
  await page.getByRole('button', { name: 'Aage badhein' }).click();
  await page.getByRole('button', { name: /Demo data bharo/ }).click();
  await expect(page.getByRole('heading', { name: 'Kya ye sahi hai?' })).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => (window as unknown as { __speakCalls: number }).__speakCalls)).toBe(1);
  await page.getByRole('button', { name: 'Summary suniye' }).click();
  expect(await page.evaluate(() => (window as unknown as { __speakCalls: number }).__speakCalls)).toBe(2);
});

test('step 10: mic denied shows exact permission guidance', async ({ browser }) => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    class FakeRec {
      continuous = false; interimResults = false; lang = '';
      onresult: unknown = null; onerror: unknown = null; onend: unknown = null;
      start() {} stop() {} abort() {}
    }
    (window as unknown as Record<string, unknown>).SpeechRecognition = FakeRec;
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRec;
    Object.defineProperty(window.navigator, 'mediaDevices', {
      value: {
        getUserMedia: () =>
          Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })),
      },
    });
  });
  const page = await ctx.newPage();
  await page.goto('/#/report');
  await page.getByRole('button', { name: /Boliye/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Sun raha hoon — boliye' })).toBeVisible();
  await expect(page.getByText('Mic ki permission nahi mili.')).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole('button', { name: /Retry — mic phir se maangein/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Likh kar batayein' }).first()).toBeVisible();
  await ctx.close();
});

test('step 10: no-speech after 15s keeps listening with guidance', async ({ browser }) => {
  test.setTimeout(120000);
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    class FakeRec {
      continuous = false; interimResults = false; lang = '';
      onresult: unknown = null; onerror: unknown = null; onend: unknown = null;
      start() {} stop() {} abort() {}
    }
    (window as unknown as Record<string, unknown>).SpeechRecognition = FakeRec;
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRec;
    Object.defineProperty(window.navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.resolve({ getTracks: () => [] }) },
    });
  });
  const page = await ctx.newPage();
  await page.goto('/#/report');
  await page.getByRole('button', { name: /Boliye/ }).first().click();
  await expect(page.getByText('Sun raha hoon…')).toBeVisible({ timeout: 8000 });
  // No interim, no final, no audio peak for 15s: guidance appears, but
  // listening continues — the old "Kuch suna nahi gaya" dead-end is gone.
  await expect(page.getByText('Kuch suna nahi gaya — abhi bhi sun raha hoon.')).toBeVisible({ timeout: 25000 });
  await expect(page.getByText('Sun raha hoon…')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await ctx.close();
});

test('step 10: gated tools show section-specific empty states', async ({ page }) => {
  const empty: Array<[string, string, string]> = [
    ['/actions', 'Action Plan', '5 kadam ki list'],
    ['/coach', '1930 Call Coach', 'call ki taiyaari'],
    ['/portal', 'Portal Madad', 'complaint ka poora text'],
    ['/bank', 'Bank Alert Kit', 'aapke bank ki helpline'],
    ['/vault', 'Evidence Vault', 'saboot upload'],
    ['/care', 'Care Circle', 'WhatsApp share'],
    ['/proof', 'Proof Pack aur Verify', 'bilingual PDF'],
  ];
  for (const [route, heading, preview] of empty) {
    await page.goto(`/#${route}`);
    // Scoped to the card: the shell's view-head h1 carries the same name.
    await expect(page.locator('.db-card').getByRole('heading', { name: heading, exact: true })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(preview, { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Report Fraud shuru karein' })).toBeVisible();
  }
});

test('step 10: situation guide list, detail, and shield truth-card link', async ({ page }) => {
  await page.goto('/#/guide');
  // Scoped to the card: the shell's view-head h1 carries the same name.
  await expect(page.locator('.db-card').getByRole('heading', { name: 'Situation Guide' })).toBeVisible();
  await page.getByRole('link', { name: 'OTP dhokha (customer care)' }).click();
  await expect(page.getByRole('heading', { name: 'OTP dhokha (customer care)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pehle 5 minute' })).toBeVisible();
  await expect(page.getByText('1930 par call karein')).toBeVisible();

  await page.goto('/#/shield');
  await page.getByLabel('Message paste karein').fill('Turant OTP batao, warna account band ho jayega');
  await page.getByRole('button', { name: 'Check karein' }).click();
  await expect(page.getByText('KHATRA')).toBeVisible();
  await page.getByRole('link', { name: /Is situation me kya karein — OTP dhokha/ }).click();
  await expect(page.getByRole('heading', { name: 'OTP dhokha (customer care)' })).toBeVisible();
});

test('step 10: theme toggle and search dialog navigate', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('.gd-app')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('.gd-app')).toHaveAttribute('data-theme', 'light');

  await page.getByRole('button', { name: /Search sections/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Find a section').fill('vault');
  await dialog.getByRole('button', { name: /Evidence Vault/ }).click();
  await expect(page.getByRole('heading', { name: 'Evidence Vault' }).first()).toBeVisible({ timeout: 8000 });
});
