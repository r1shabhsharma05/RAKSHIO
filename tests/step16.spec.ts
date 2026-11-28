
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

// Step 16: the 13 live E2E #3 bugs on v7.
test('step 16 bug 1: model disagreement warning on the exact Hinglish danger sentence', async ({ page }) => {
  await page.goto('/#/shield');
  await page.getByLabel('Message paste karein').fill('Turant OTP batao, warna account band ho jayega');
  await page.getByRole('button', { name: 'Message / Number check karein' }).click();
  await expect(page.getByText('KHATRA — mat karein')).toBeVisible();
  // The model really scores this ~3% (safe) — the UI must warn, never
  // reassure, and the score stays visible, never fudged or hidden.
  // Step 17: the model line is neutral wording now — "scored this as
  // safe", never "thinks this is safe" next to a rules KHATRA.
  await expect(page.getByText(/Model scam score: \d+% — model ne isko safe score diya/)).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('alert')).toContainText('Model aur rules alag bol rahe hain — rules ko mano');
  await expect(page.getByRole('alert')).toContainText('English SMS/email par train hua tha');
});

test('step 16 bug 2: English switches the clock, the incident card and a tool body', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/');
  await page.locator('.gd-lang select').selectOption('en');
  await expect(page.getByText('Golden Hour Clock').first()).toBeVisible();
  await expect(page.getByText('Report on 1930', { exact: true })).toBeVisible();
  await expect(page.getByText('OTP scam (fake customer care)').first()).toBeVisible();
  await expect(page.getByText('Reported').first()).toBeVisible();
  // The seeded demo is ~31h old, so the first hour is over: the over
  // title + the portal-closed body show, in English, on the Home clock.
  await expect(page.getByText('Golden Hour is over — but steps remain')).toBeVisible();
  await expect(page.getByText(/The portal’s 24-hour window has closed/)).toBeVisible();
  await page.goto('/#/coach');
  await expect(page.getByText('Read the script once before calling — it is a 30-second talk.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Call 1930' })).toBeVisible();
  await page.goto('/#/bank');
  await expect(page.getByText('Inform your bank — a dispute will be filed, and you will get a reference number.')).toBeVisible();
  await page.locator('.gd-lang select').selectOption('hg');
});

test('step 16 bug 3: top bar never overlaps at 1366px, caregiver ON', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 633 });
  await page.goto('/#/');
  // Caregiver ON adds a pill to the top bar — the old 1fr column let it
  // overflow leftwards under the search pill.
  await page.evaluate(() => {
    const raw = localStorage.getItem('rakshio.settings.v1');
    const s = raw ? JSON.parse(raw) : {};
    localStorage.setItem('rakshio.settings.v1', JSON.stringify({ ...s, caregiver: true, language: 'hg', calmPrompt: true, ttsRate: 0.85, speechLang: 'hi-IN' }));
  });
  await page.reload();
  await expect(page.getByText('Caregiver')).toBeVisible();
  const boxes = await page.evaluate(() => {
    const r = (sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { left: b.left, right: b.right };
    };
    return { ask: r('.gd-ask'), actions: r('.gd-top-actions') };
  });
  expect(boxes.ask!.right).toBeLessThanOrEqual(boxes.actions!.left);
});

test('step 16 bug 4: page fits the viewport at 1366x633 — no dock overlap', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 633 });
  await seedDemo(page);
  await page.goto('/#/');
  // The page itself must not scroll: the dock is absolute at the stage
  // bottom, so any page scroll slides it over the stage content.
  const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  expect(overflow).toBeLessThanOrEqual(1);
  // The footer text starts clear of the side dock rail.
  const footer = await page.locator('.gd-footer > span').evaluate((el) => el.getBoundingClientRect().left);
  const rail = await page.locator('.gd-dock-side').evaluate((el) => el.getBoundingClientRect().right);
  expect(footer).toBeGreaterThanOrEqual(rail);
  // Shield result: scroll the stage to the bottom — the KHATRA card and
  // the model line must sit above the bottom dock, not behind it.
  await page.goto('/#/shield');
  await page.getByRole('button', { name: 'Danger example' }).click();
  await expect(page.getByText('KHATRA — mat karein')).toBeVisible();
  await page.evaluate(() => document.querySelector('.gd-stage-scroll')?.scrollTo(0, 99999));
  const dockTop = await page.locator('.gd-dock-bottom').evaluate((el) => el.getBoundingClientRect().top);
  const cardBottom = await page.locator('.shield-danger, .shield-suspicious, .shield-safe').last().evaluate((el) => el.getBoundingClientRect().bottom);
  expect(cardBottom).toBeLessThanOrEqual(dockTop);
});

test('step 16 bug 5: guide is in the dock and in global search', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('link', { name: 'Situation Guide' }).first().click();
  await expect(page.getByRole('heading', { name: 'Situation Guide' }).first()).toBeVisible();
  await page.getByRole('button', { name: /dhoondhein/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Section dhoondhein').fill('situations');
  await dialog.getByRole('button', { name: /Situation Guide/ }).click();
  await expect(page.getByRole('heading', { name: 'Situation Guide' }).first()).toBeVisible();
  await page.getByRole('button', { name: /dhoondhein/ }).click();
  await dialog.getByLabel('Section dhoondhein').fill('guide');
  await expect(dialog.getByRole('button', { name: /Situation Guide/ })).toBeVisible();
});

test('step 16 bug 6: dark mode reads true black — photo dimmed, scrim strong', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Dark theme par jayein' }).click();
  await expect(page.locator('.gd-app')).toHaveAttribute('data-theme', 'dark');
  const scrim = await page.locator('.gd-app').evaluate((el) => getComputedStyle(el, '::before').backgroundColor);
  const scrimAlpha = parseFloat(scrim.split(',')[3] ?? '0');
  expect(scrimAlpha).toBeGreaterThanOrEqual(0.8);
  const filter = await page.locator('.gd-background').evaluate((el) => getComputedStyle(el).filter);
  const brightness = parseFloat(filter.match(/brightness\(([\d.]+)\)/)?.[1] ?? '1');
  expect(brightness).toBeLessThanOrEqual(0.2);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
  await page.getByRole('button', { name: 'Light theme par jayein' }).click();
});

test('step 16 bug 9: confirm gate asks Bank as a 4th question', async ({ page }) => {
  await page.goto('/#/report');
  await page.getByRole('button', { name: /Demo data bharo/ }).click();
  await expect(page.getByRole('heading', { name: 'Kya ye sahi hai?' })).toBeVisible({ timeout: 8000 });
  // Four question cards: Rashi, Kab hua, Kaise gaye, Bank (HDFC seeded).
  await expect(page.getByText('Bank', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('HDFC').first()).toBeVisible();
  await expect(page.getByText('Chaaro sawaal ke jawab dijiye')).toBeVisible();
});

test('step 16 bug 13: judge seed warns first, caregiver defaults OFF', async ({ page }) => {
  // Fresh profile: caregiver OFF until the user enables it.
  await page.goto('/#/settings');
  await expect(page.getByRole('switch', { name: /Caregiver/ })).toHaveAttribute('aria-checked', 'false');
  // With an active incident, the seed button asks first and names it.
  await seedDemo(page);
  await page.goto('/#/judge');
  await expect(page.getByText(/Current active incident:/)).toBeVisible();
  await page.getByRole('button', { name: 'Seeded scenario chalao (₹20,000 UPI)' }).click();
  await expect(page.getByText('Isse active incident badal jayega')).toBeVisible();
  await expect(page.getByText(/saved rahegi — use Incident Dashboard/)).toBeVisible();
  await page.getByRole('button', { name: 'Seed karo — purani incident saved rahegi' }).click();
  await expect(page.getByText('₹20,000').first()).toBeVisible({ timeout: 8000 });
});
