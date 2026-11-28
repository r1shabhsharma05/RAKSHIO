import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Step 19: the full hunt list (A1–A15) in one pass. Helpers copied from
// step18.spec.ts (spec files cannot import each other's helpers without
// registering their tests).
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

// Text-mode report: type the transcript, submit, land on the gaps screen.
async function textReport(page: Page, text: string) {
  await page.goto('/#/report');
  // Panic screen, Hinglish default: the text-mode entry is 'Likh kar
  // batayein' (panicWriteBtn) — 'Write it instead' is its English label.
  await page.getByRole('button', { name: 'Likh kar batayein' }).click();
  await page.getByPlaceholder(/Jaise: Mere account se bees hazaar/).fill(text);
  await page.getByRole('button', { name: 'Samjhaao' }).click();
}

// One gap answer in the text field, then Continue.
async function answerGap(page: Page, heading: string, answer: string) {
  await expect(page.getByRole('heading', { name: heading })).toBeVisible({ timeout: 8000 });
  await page.getByLabel('Jawaab').fill(answer);
  await page.getByRole('button', { name: 'Aage badhein' }).click();
}

// Active incident from storage (same keys the app uses).
async function activeIncident(page: Page) {
  return page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('rakshio.incidents.v1') ?? '[]') as {
      id: string;
      callTappedAt: string | null;
      coachDoneAt: string | null;
    }[];
    const activeId = localStorage.getItem('rakshio.active.v1');
    return list.find((i) => i.id === activeId) ?? null;
  });
}

// A1: the #/report Judge confirm must name the active incident.
test('step 19 A1: #/report Judge confirm names the active incident', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/report');
  await page.getByRole('button', { name: 'Judge Mode — bina mic ke demo chalao' }).click();
  await page.getByRole('button', { name: 'Seeded scenario chalao (₹20,000 UPI)' }).click();
  await expect(page.getByText(/Current active incident #RK-/)).toBeVisible();
  await expect(page.getByText('Abhi koi active incident nahi hai')).toHaveCount(0);
  await page.screenshot({ path: 'tests/shots-local/step19-a1-judge-confirm.png' });
});

// A2: Done-only must not log a call tap; a real call-button tap still does.
test('step 19 A2: Coach Done does not log a call tap; the call button does', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/coach');
  await page.getByRole('button', { name: "Call ke baad 'Done' dabaiye" }).click();
  await expect(page.getByText(/✓ Noted — aapne call step done mark kiya/)).toBeVisible();
  await expect(page.getByText('Done mark ho gaya')).toBeVisible();
  let stored = await activeIncident(page);
  expect(stored).not.toBeNull();
  expect(stored?.callTappedAt).toBeNull();
  expect(stored?.coachDoneAt).not.toBeNull();
  // The real call button (Home quick action, tel:1930) still logs the tap.
  await page.goto('/#/');
  await page.locator('.qa-green').click();
  stored = await activeIncident(page);
  expect(stored?.callTappedAt).not.toBeNull();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
});

// A3: an English time answer in the gaps flow lands on the confirm gate
// (no correct → still-wrong loop).
test('step 19 A3: "yesterday evening" gap answer reaches the confirm gate', async ({ page }) => {
  await textReport(page, 'Mere account se yesterday evening bees hazaar rupaye kat gaye');
  await answerGap(page, 'Paise kab gaye?', 'yesterday evening');
  await answerGap(page, 'Paise kaise gaye?', 'UPI');
  await answerGap(page, 'Konsa bank hai?', 'SBI');
  await expect(page.getByRole('heading', { name: 'Kya aapne kisi ko apna OTP ya PIN bataya tha?' })).toBeVisible();
  await page.getByRole('button', { name: 'Nahi, nahi bataya' }).click();
  await expect(page.getByRole('heading', { name: 'Bas, itna hi.' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm karein' }).click();
  await expect(page.getByRole('heading', { name: 'Kya ye sahi hai?' })).toBeVisible();
  // The time survived the gap answer: "kal, shaam", not "Pata nahi".
  await expect(page.getByText('kal, shaam')).toBeVisible();
  const yes = page.getByRole('button', { name: 'Haan, sahi hai' });
  for (let i = 0; i < 4; i++) await yes.nth(0).click();
  await page.getByRole('button', { name: 'Ye sahi hai — aage badhein' }).click();
  await expect(page.getByRole('heading', { name: 'Aapka incident card' })).toBeVisible();
});

// A4: answering "Haan" to the OTP gap shows the Step 18 OTP alert.
test('step 19 A4: OTP gap answer Yes shows the OTP-shared alert', async ({ page }) => {
  await textReport(page, 'Mere SBI account se kal shaam 7 baje bees hazaar rupaye kat gaye');
  // Amount, time and bank are captured; the transcript has no method word,
  // so the gaps are [method, otp] — answer the method gap first.
  await answerGap(page, 'Paise kaise gaye?', 'UPI');
  await expect(page.getByRole('heading', { name: 'Kya aapne kisi ko apna OTP ya PIN bataya tha?' })).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: 'Haan, bataya tha' }).click();
  await expect(page.getByRole('heading', { name: 'Bas, itna hi.' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm karein' }).click();
  const yes = page.getByRole('button', { name: 'Haan, sahi hai' });
  for (let i = 0; i < 4; i++) await yes.nth(0).click();
  await page.getByRole('button', { name: 'Ye sahi hai — aage badhein' }).click();
  await expect(page.getByText('Aapne OTP/PIN share kiya tha — turant card/UPI block karein, aur kisi ko OTP mat dijiye.')).toBeVisible();
  await page.screenshot({ path: 'tests/shots-local/step19-a4-otp-alert.png' });
});

// A5: Triage title + steps in English, axe 0.
test('step 19 A5: Triage fully English in EN mode', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/');
  await switchToEnglish(page);
  await page.goto('/#/triage');
  await expect(page.getByRole('heading', { name: 'Money is gone — do these 3 steps now' })).toBeVisible();
  await expect(page.getByText('Call 1930 — the chance of a fund freeze is highest in the first hour.')).toBeVisible();
  await expect(page.getByText('Paisa gaya hai')).toHaveCount(0);
  await page.screenshot({ path: 'tests/shots-local/step19-a5-triage-en.png' });
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
});

// A6: Guide detail headings in English, axe 0.
test('step 19 A6: Guide detail headings English in EN mode', async ({ page }) => {
  await page.goto('/#/');
  await switchToEnglish(page);
  await page.goto('/#/guide?id=courier-scam');
  for (const h of ['How to recognise it', 'First 5 minutes', 'How to report', 'Do not do this', 'What evidence to keep']) {
    await expect(page.getByRole('heading', { name: h })).toBeVisible();
  }
  for (const leak of ['Kaise pehchanein', 'Pehle 5 minute', 'Report kaise karein', 'Ye mat karein', 'Kya saboot rakhein']) {
    await expect(page.getByText(leak, { exact: false })).toHaveCount(0);
  }
  await page.screenshot({ path: 'tests/shots-local/step19-a6-guide-en.png' });
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
});

// A9: offline reload works on the very first visit (no reload needed).
test('step 19 A9: offline reload works on the first visit', async ({ page, context }) => {
  await page.goto('/#/report');
  await expect(page.getByRole('heading', { name: 'Boliye, kya hua?' })).toBeVisible();
  // The worker takes control on first load (skipWaiting + clients.claim).
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
  // The app posts its loaded JS/CSS to the worker for caching — wait until
  // the main bundle is cached, or the offline reload still serves a blank
  // page (the bundle loaded before the worker took control).
  await page.waitForFunction(async () => {
    for (const name of await caches.keys()) {
      const reqs = await (await caches.open(name)).keys();
      if (reqs.some((r) => /\/assets\/index-[^/]+\.js$/.test(r.url))) return true;
    }
    return false;
  }, null, { timeout: 15000 });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Boliye, kya hua?' })).toBeVisible();
  await context.setOffline(false);
});

// A10: 390px touch targets ≥ 44px; 1034px footer reachable, no overflow.
test('step 19 A10: 390px touch targets are 44px or taller', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/');
  const ask = await page.locator('.gd-ask').first().boundingBox();
  expect(ask?.height).toBeGreaterThanOrEqual(44);
  // Only visible buttons count: at 390px the top bar shows the theme
  // toggle (the Settings link lives in the dock instead).
  const icons = page.locator('.gd-top-actions .gd-icon-button:visible');
  expect(await icons.count()).toBeGreaterThanOrEqual(1);
  for (let i = 0; i < (await icons.count()); i++) {
    const b = await icons.nth(i).boundingBox();
    expect(b?.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: 'tests/shots-local/step19-a10-390.png' });
});

test('step 19 A10: 1034px home footer reachable, no horizontal overflow', async ({ page }) => {
  for (const height of [633, 768]) {
    await page.setViewportSize({ width: 1034, height });
    await page.goto('/#/');
    await page.evaluate(() => {
      const el = document.querySelector('.gd-stage-scroll');
      if (el) el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(400);
    // Default locale is Hinglish — the footer text is the HG string.
    await expect(page.getByText('RAKSHIO kabhi OTP / PIN / CVV nahi mangta')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
  await page.screenshot({ path: 'tests/shots-local/step19-home-1034-maxscroll.png' });
});

// A11: 1930 ack placeholder shows the real 14-digit format (329…).
test('step 19 A11: ack placeholder shows the real 329 format', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/portal');
  await expect(page.getByPlaceholder('Jaise: 329XXXXXXXXXXX')).toBeVisible();
  await expect(page.getByPlaceholder('1930XXXXXXXX')).toHaveCount(0);
});
