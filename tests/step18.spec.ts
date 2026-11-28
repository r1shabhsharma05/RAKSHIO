import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Same seeded-demo helper as dashboard.spec.ts (duplicated: spec files
// cannot import each other's helpers without registering their tests).
async function seedDemo(page: Page) {
  await page.goto('/#/report');
  await page.getByRole('button', { name: /Demo data bharo/ }).click();
  await expect(page.getByRole('heading', { name: 'Kya ye sahi hai?' })).toBeVisible({ timeout: 8000 });
  const yes = page.getByRole('button', { name: 'Haan, sahi hai' });
  for (let i = 0; i < 4; i++) await yes.nth(0).click(); // Step 16 (bug 9): Bank is the 4th confirm question.
  await page.getByRole('button', { name: 'Ye sahi hai — aage badhein' }).click();
  await expect(page.getByRole('heading', { name: 'Aapka incident card' })).toBeVisible();
}

async function switchToEnglish(page: Page) {
  await page.locator('.gd-lang select').selectOption('en');
}

async function openDetailEn(page: Page) {
  await seedDemo(page);
  await page.goto('/#/');
  await switchToEnglish(page);
  await page.goto('/#/incidents');
  await page.locator('.db-incident-card').first().click();
  await expect(page.getByRole('heading', { name: 'Your incident card' })).toBeVisible({ timeout: 8000 });
}

// Step 18 (a): the incident detail page — the real Step 17 miss (E2E #5).
test('step 18a: incident detail fully English in EN mode', async ({ page }) => {
  await openDetailEn(page);
  await expect(page.getByText('Amount', { exact: true })).toBeVisible();
  await expect(page.getByText('When it happened', { exact: true })).toBeVisible();
  await expect(page.getByText('yesterday at 10 AM').first()).toBeVisible();
  await expect(page.getByText('How the money went', { exact: true })).toBeVisible();
  await expect(page.getByText('Bank / App', { exact: true })).toBeVisible();
  await expect(page.getByText('UTR', { exact: true })).toBeVisible();
  await expect(page.getByText('432109876543')).toBeVisible(); // demo transcript carries a UTR, so no 'Not received' here
  await expect(page.getByText('Fraud type', { exact: true })).toBeVisible();
  await expect(page.getByText('From Panic to Proof')).toBeVisible();
  await expect(page.getByText('Fraud happened')).toBeVisible();
  await expect(page.getByText('You told RAKSHIO')).toBeVisible();
  await expect(page.getByText('Call on 1930')).toBeVisible();
  await expect(page.getByText('Within 24 hours after 1930 — cybercrime.gov.in')).toBeVisible();
  await expect(page.getByText('See the next steps')).toBeVisible();
  await expect(page.getByText('Tools to help')).toBeVisible();
  await expect(page.getByText('Evidence Vault — save proof')).toBeVisible();
  await expect(page.getByText('Second-Scam Shield — check a message')).toBeVisible();
  await expect(page.getByText('What to do in this situation')).toBeVisible();
  // No Hinglish leaks on the whole detail page.
  for (const leak of ['Aapka incident card', 'Rashi', 'Kab hua', 'Kaise gaye', 'Nahi mila', 'Panic se Proof tak', 'Fraud hua', 'Aapne RAKSHIO ko bataya', 'Baaki hai', 'Aage ke kadam dekhein', 'Madad ke tools', 'saboot save karein']) {
    await expect(page.getByText(leak, { exact: false })).toHaveCount(0);
  }
});

// Step 18 (a): the three LOW leftovers from E2E #5.
test('step 18a: leftovers — new-report button, toast dismiss, Care SOS', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/');
  await switchToEnglish(page);
  // ReportFlow button (visible once the flow is past the panic screen —
  // a fresh mount starts at panic, so step into text mode first).
  await page.goto('/#/report');
  await page.getByRole('button', { name: 'Write it instead' }).click();
  await expect(page.getByRole('button', { name: 'Start a new report' })).toBeVisible();
  await expect(page.getByText('Naya report shuru karein')).toHaveCount(0);
  // Care SOS preview follows the UI language.
  await page.goto('/#/care');
  await page.getByRole('checkbox').first().check();
  await expect(page.getByText('I have been defrauded — I need help.')).toBeVisible();
  await expect(page.getByText(/Time: yesterday at 10 AM/)).toBeVisible();
  await expect(page.getByText('Mujhe fraud hua hai')).toHaveCount(0);
  await expect(page.getByText('Samay: kal, 7 baje')).toHaveCount(0);
  // Toast dismiss label follows the UI language (Proof download toasts).
  await page.goto('/#/proof');
  await page.getByRole('button', { name: /Download PDF/ }).click();
  await expect(page.getByRole('button', { name: 'Dismiss notification' })).toBeVisible({ timeout: 8000 });
  await expect(page.getByLabel('Notification band karein')).toHaveCount(0);
});

// Step 18: English must survive a full page reload (the removed Step 10
// migration flipped a stored 'en' back to 'hg' on every load).
test('step 18: English survives a reload', async ({ page }) => {
  await page.goto('/#/');
  await switchToEnglish(page);
  await expect(page.getByText('RAKSHIO does not file reports. You must contact 1930 / your bank yourself.')).toBeVisible();
  await page.goto('/#/settings');
  await expect(page.getByText('RAKSHIO does not file reports. You must contact 1930 / your bank yourself.')).toBeVisible();
  await expect(page.locator('.gd-lang select')).toHaveValue('en');
  await expect(page.getByRole('link', { name: 'Report Fraud' }).first()).toBeVisible();
});

// Step 18 (b): ONE raw click advances the follow-up — at both true widths.
// Root cause of the E2E #5 "3 clicks" (measured): the button sits below the
// fold inside the stage scroll container, so clicks at its unscrolled
// coordinates land on <html>. Scrolled into view, one click always advanced.
test('step 18b: one click advances the follow-up at 1034 and 1366', async ({ page }) => {
  for (const width of [1034, 1366]) {
    await page.setViewportSize({ width, height: 633 });
    await seedDemo(page);
    await page.goto('/#/');
    const btn = page.getByRole('button', { name: /Mark done|Done mark|पूर्ण/ }).first();
    await expect(btn).toBeVisible({ timeout: 8000 });
    const card = page.locator('.db-card', { hasText: 'Follow-up' });
    const before = await card.innerText();
    await btn.scrollIntoViewIfNeeded();
    const box = await btn.boundingBox();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect.poll(async () => card.innerText(), { timeout: 5000 }).not.toBe(before);
  }
});

// Step 18 (c): end-of-scroll clearance, measured by bounding box — the
// Step 17 fixes ARE in the live bundle (verified 28 Nov), so this pins the
// real mechanism instead of re-applying them: at max stage scroll the last
// content bottom must sit above the floating dock top, at every width.
test('step 18c: max-scroll dock clearance at 1034/1097/1366/1920', async ({ page }) => {
  await seedDemo(page);
  for (const [w, h] of [[1034, 633], [1097, 617], [1366, 633], [1920, 1080]] as const) {
    await page.setViewportSize({ width: w, height: h });
    for (const route of ['/#/', '/#/coach', '/#/shield', '/#/portal', '/#/bank', '/#/judge']) {
      await page.goto(route);
      await page.waitForTimeout(600);
      const m = await page.evaluate(() => {
        const stage = document.querySelector('.gd-stage-scroll') as HTMLElement | null;
        const dock = document.querySelector('.gd-dock-bottom') as HTMLElement | null;
        if (!stage || !dock) return null;
        stage.scrollTop = stage.scrollHeight;
        return new Promise((resolve) => {
          requestAnimationFrame(() => {
            const dockTop = dock.getBoundingClientRect().top;
            let lowest = 0;
            for (const el of stage.querySelectorAll('.db-card, .rk-card, footer')) {
              const r = (el as HTMLElement).getBoundingClientRect();
              if (r.height > 0) lowest = Math.max(lowest, r.bottom);
            }
            resolve({
              overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              clearance: Math.round(dockTop - lowest),
            });
          });
        });
      });
      expect(m, `${route} @ ${w}x${h}`).not.toBeNull();
      expect(m!.overflowX, `${route} @ ${w}x${h} horizontal overflow`).toBe(0);
      expect(m!.clearance, `${route} @ ${w}x${h} dock clearance`).toBeGreaterThanOrEqual(0);
    }
  }
});

// Step 18: full sweep — in EN mode no Devanagari may render anywhere.
// Guides stay Hinglish by design, but their content is Latin-script Hinglish,
// so even /guide must show zero Devanagari in EN mode. Language pickers are
// excluded: they must show "हिंदी" as the Hindi option's native name.
test('step 18: no Devanagari anywhere in EN mode', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/');
  await switchToEnglish(page);
  for (const route of ['/#/', '/#/report', '/#/incidents', '/#/actions', '/#/coach', '/#/portal', '/#/bank', '/#/vault', '/#/shield', '/#/care', '/#/proof', '/#/settings', '/#/judge', '/#/guide']) {
    await page.goto(route);
    await page.waitForTimeout(700);
    const text = await page.evaluate(() => {
      // Language pickers must show "हिंदी" as the Hindi option's native
      // name — remove every <select> before sweeping the rendered copy.
      document.querySelectorAll('select').forEach((el) => el.remove());
      return document.body.innerText ?? '';
    });
    expect(text, `${route} Devanagari leak`).not.toMatch(/[\u0900-\u097F]/);
  }
});

// Step 18: axe 0 on the incident detail page in English.
test('step 18: axe 0 on incident detail in English', async ({ page }) => {
  await openDetailEn(page);
  // The timeline reveal animates on mount (~550ms); axe must run after it
  // settles, or mid-animation opacity trips the contrast rule.
  await page.waitForTimeout(900);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
