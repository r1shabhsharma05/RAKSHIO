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

// Step 17: the E2E #4 findings — full English, 1034px footer + Mark done,
// neutral model wording. Caregiver OFF by default is already pinned by
// the Step 16 unit test and its Playwright test (fresh profile).
test('step 17 bug 2a: English Report flow — calm card, mic screen, text mode', async ({ page }) => {
  await page.goto('/#/report');
  await switchToEnglish(page);
  await expect(page.getByRole('heading', { name: 'You are safe' })).toBeVisible();
  await expect(page.getByText(/This card will close in \d+ seconds\./)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tell us, what happened?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Help right now' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Write it instead' })).toBeVisible();
  await page.getByRole('button', { name: 'Write it instead' }).click();
  await expect(page.getByText('Write what happened, in your own words')).toBeVisible();
  await expect(page.getByPlaceholder(/was debited from my account/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Understand this' })).toBeVisible();
  await expect(page.getByText('Aap safe hain')).toHaveCount(0);
  await expect(page.getByText('Boliye, kya hua?')).toHaveCount(0);
});

test('step 17 bug 2b: English Shield result card + neutral model line', async ({ page }) => {
  await page.goto('/#/shield');
  await switchToEnglish(page);
  await page.getByLabel('Paste the message').fill('Turant OTP batao, warna account band ho jayega');
  await page.getByRole('button', { name: 'Check a Message / Number' }).click();
  await expect(page.getByText('DANGER — do not act')).toBeVisible();
  await expect(page.getByText(/This message looks very dangerous/)).toBeVisible();
  await expect(page.getByText(/Asking for OTP\/PIN/)).toBeVisible();
  await expect(page.getByText(/What to do: delete the message/)).toBeVisible();
  // Step 17: neutral wording — "scored this as safe", never "thinks".
  // Step 21 decision (this test was the 1 remaining Playwright failure):
  // the Step 16 retrain scores this sentence 52%, and the UI used to
  // read that as "scored this as a scam" on a hardcoded 0.5 cut. 52% is
  // BELOW the model's own val-tuned 0.65 threshold (shipped in
  // model.json, the same cut its accuracy/precision/recall are measured
  // at), so the model itself classifies it safe — the UI wording was
  // wrong, not the test. Fix: Shield.tsx + modelWarning() now use the
  // shipped threshold, so the line reads "safe" and the disagree warning
  // (rules DANGER vs model safe — follow the rules) shows. No retrain,
  // no artifact change, no threshold change.
  await expect(page.getByText(/Model scam score: \d+% — scored this as safe/)).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Model and rules disagree — follow the rules.')).toBeVisible();
  await expect(page.getByText('model ko ye safe lagta hai')).toHaveCount(0);
});

test('step 17 bug 2c: English Coach script, bank draft and Portal Copy Deck', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/');
  await switchToEnglish(page);
  await page.goto('/#/coach');
  const script = page.locator('.script-box');
  await expect(script).toContainText('Hello, I am speaking from the RAKSHIO app.');
  await expect(script).toContainText(/today at \d+ (AM|PM)/);
  await expect(script).toContainText('Please register my complaint');
  await expect(script).not.toContainText('Namaste, main RAKSHIO');
  // The checklist Time row uses the same localized when-line, not the
  // raw Hinglish display string ("kal, 10 baje").
  await expect(page.getByText(/Time: today at \d+ (AM|PM)/)).toBeVisible();
  await expect(page.getByText('kal, 10 baje')).toHaveCount(0);
  await page.goto('/#/bank');
  const draft = page.getByLabel('Bank draft');
  await expect(draft).toHaveValue(/Hello,/);
  await expect(draft).toHaveValue(/today at \d+ (AM|PM)/);
  await expect(draft).toHaveValue(/Method: UPI\./);
  await expect(draft).not.toHaveValue(/Tareeka/);
  await expect(page.getByText('HDFC: block your card from the app, or SMS "Block CC".')).toBeVisible();
  await page.goto('/#/portal');
  await expect(page.getByText('Amount: ₹20,000')).toBeVisible();
  await expect(page.getByText(/Date \/ Time: today at \d+ (AM|PM)/)).toBeVisible();
  await expect(page.getByText('Method: UPI')).toBeVisible();
  await expect(page.getByText('OTP/PIN shared?: Yes')).toBeVisible();
  await expect(page.getByText('1930 Ack number: Not received yet — fill it here after the call')).toBeVisible();
  await expect(page.getByText('Rashi')).toHaveCount(0);
  await expect(page.getByText('Tareeka')).toHaveCount(0);
  // The Settings note no longer claims the panic flow stays Hinglish.
  await page.goto('/#/settings');
  await expect(page.getByText(/The whole app — Report flow, Coach script, bank draft and Portal Copy Deck included/)).toBeVisible();
  await expect(page.getByText('panic flow always stays in Hinglish')).toHaveCount(0);
});

test('step 17 bug c: page never scrolls at 1034px — footer always visible', async ({ page }) => {
  for (const height of [633, 768]) {
    await page.setViewportSize({ width: 1034, height });
    await seedDemo(page);
    await page.goto('/#/');
    await expect(page.getByText('Golden Hour Clock').first()).toBeVisible();
    const fit = await page.evaluate(() => {
      const footer = document.querySelector('.gd-footer')!;
      const b = footer.getBoundingClientRect();
      return {
        pageOverflow: document.documentElement.scrollHeight - window.innerHeight,
        footerBottom: b.bottom,
        innerH: window.innerHeight,
      };
    });
    expect(fit.pageOverflow, `page overflows by ${fit.pageOverflow}px at 1034x${height}`).toBeLessThanOrEqual(0);
    expect(fit.footerBottom, 'footer below the fold').toBeLessThanOrEqual(fit.innerH);
  }
});

test('step 17 bug b: one click advances Mark done at 1034px, even at the stage bottom edge', async ({ page }) => {
  await page.setViewportSize({ width: 1034, height: 633 });
  await seedDemo(page);
  await page.goto('/#/');
  await expect(page.getByText('Golden Hour Clock').first()).toBeVisible();
  const markDone = page.getByRole('button', { name: 'Done mark karein' });
  for (let i = 0; i < 3; i++) {
    await markDone.first().click();
    await page.waitForTimeout(200);
  }
  await expect(page.getByText('7 din baad')).toBeVisible();
  const btn = page.getByRole('button', { name: 'Done mark karein' }).first();
  // Park the button at the stage viewport's bottom edge — the exact spot
  // where the floating dock used to swallow the first click.
  await page.evaluate(() => {
    const stage = document.querySelector('.gd-stage-scroll') as HTMLElement;
    const btnEl = [...document.querySelectorAll('button')].find((x) => x.textContent?.includes('Done mark karein'))!;
    const bb = btnEl.getBoundingClientRect();
    stage.scrollTop += (bb.bottom - 10) - stage.getBoundingClientRect().bottom;
  });
  await page.waitForTimeout(200);
  // scrollIntoView must respect the stage's scroll-padding and lift the
  // button above the dock — the click target is the button itself.
  await btn.scrollIntoViewIfNeeded();
  const hit = await page.evaluate(() => {
    const btnEl = [...document.querySelectorAll('button')].find((x) => x.textContent?.includes('Done mark karein'))!;
    const bb = btnEl.getBoundingClientRect();
    const el = document.elementFromPoint(bb.x + bb.width / 2, bb.y + bb.height / 2);
    return el === btnEl;
  });
  expect(hit, 'button is under the dock after scrollIntoView').toBe(true);
  await btn.click();
  // Step 21: two more reminders now (30d, 90d) — one more click lands on
  // 30d, two more finish the list.
  await expect(page.getByText('30 din baad')).toBeVisible();
  await btn.click();
  await btn.click();
  await expect(page.getByText('Sabhi follow-ups poore ho gaye')).toBeVisible();
});

test('step 17 axe: Report page in English has 0 violations', async ({ page }) => {
  await page.goto('/#/report');
  await switchToEnglish(page);
  await expect(page.getByRole('heading', { name: 'You are safe' })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
