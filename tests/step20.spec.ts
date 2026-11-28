import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Step 20: Hunt 2 list (B1–B8) in one pass. Helpers copied from
// step19.spec.ts (spec files cannot import each other's helpers without
// registering their tests).
async function seedDemo(page: Page): Promise<string> {
  await page.goto('/#/report');
  await page.getByRole('button', { name: /Demo data bharo/ }).click();
  await expect(page.getByRole('heading', { name: 'Kya ye sahi hai?' })).toBeVisible({ timeout: 8000 });
  const yes = page.getByRole('button', { name: 'Haan, sahi hai' });
  for (let i = 0; i < 4; i++) await yes.nth(0).click(); // Step 16 (bug 9): Bank is the 4th confirm question.
  await page.getByRole('button', { name: 'Ye sahi hai — aage badhein' }).click();
  await expect(page.getByRole('heading', { name: 'Aapka incident card' })).toBeVisible();
  return page.evaluate(() => localStorage.getItem('rakshio.active.v1') ?? '');
}

function displayId(id: string): string {
  return `#${id.replace(/^rk-/, 'RK-').toUpperCase()}`;
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

// Confirm the 4 gate questions and finish the report.
async function confirmThrough(page: Page) {
  await expect(page.getByRole('heading', { name: 'Bas, itna hi.' })).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: 'Confirm karein' }).click();
  await expect(page.getByRole('heading', { name: 'Kya ye sahi hai?' })).toBeVisible();
  const yes = page.getByRole('button', { name: 'Haan, sahi hai' });
  for (let i = 0; i < 4; i++) await yes.nth(0).click();
  await page.getByRole('button', { name: 'Ye sahi hai — aage badhein' }).click();
  await expect(page.getByRole('heading', { name: 'Aapka incident card' })).toBeVisible();
}

// Save one Vault entry for the active incident.
async function addVaultEntry(page: Page, text: string) {
  await page.goto('/#/vault');
  await page.getByPlaceholder(/SMS ya note yahan/).fill(text);
  await page.getByRole('button', { name: 'Vault me save karein' }).click();
}

async function verifyChainOk(page: Page, n: number) {
  await page.goto('/#/vault');
  await page.getByRole('button', { name: 'Chain verify karein' }).click();
  await expect(page.getByText(`Chain sahi hai — ${n} entries`)).toBeVisible({ timeout: 8000 });
}

// B1: the E2E #7 sentence extracts ₹20,000 end to end.
// "Yesterday evening" parses with confidence 0.6 (part of day only),
// below the 0.7 gap threshold — so the flow asks the when-question
// once more before the OTP gap. That re-ask is by design; the answer
// lands via the same extractor.
test('step 20 B1: "twenty thousand" free text reaches the confirm gate as ₹20,000', async ({ page }) => {
  await textReport(page, 'Yesterday evening, twenty thousand rupees were debited from my SBI account via UPI');
  await answerGap(page, 'Paise kab gaye?', 'yesterday evening');
  await expect(page.getByRole('heading', { name: 'Kya aapne kisi ko apna OTP ya PIN bataya tha?' })).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: 'Nahi, nahi bataya' }).click();
  await confirmThrough(page);
  await expect(page.getByText('₹20,000')).toBeVisible();
  await page.screenshot({ path: 'tests/shots-local/step20-b1-amount.png' });
});

// B1: the same words as a gap answer (the placeholder invites them).
test('step 20 B1: "twenty thousand" gap answer parses to ₹20,000', async ({ page }) => {
  await textReport(page, 'Mere account se paise kat gaye');
  await answerGap(page, 'Kitne rupaye gaye?', 'twenty thousand');
  await answerGap(page, 'Paise kab gaye?', 'kal shaam 7 baje');
  await answerGap(page, 'Paise kaise gaye?', 'UPI');
  await answerGap(page, 'Konsa bank hai?', 'SBI');
  await expect(page.getByRole('heading', { name: 'Kya aapne kisi ko apna OTP ya PIN bataya tha?' })).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: 'Nahi, nahi bataya' }).click();
  await expect(page.getByRole('heading', { name: 'Bas, itna hi.' })).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: 'Confirm karein' }).click();
  await expect(page.getByRole('heading', { name: 'Kya ye sahi hai?' })).toBeVisible();
  await expect(page.getByText('₹20,000')).toBeVisible();
  const yes = page.getByRole('button', { name: 'Haan, sahi hai' });
  for (let i = 0; i < 4; i++) await yes.nth(0).click();
  await page.getByRole('button', { name: 'Ye sahi hai — aage badhein' }).click();
  await expect(page.getByRole('heading', { name: 'Aapka incident card' })).toBeVisible();
});

// B2: interleaved evidence keeps both incidents' chains green.
test('step 20 B2: evidence on two incidents keeps both chains valid', async ({ page }) => {
  const idA = await seedDemo(page);
  await addVaultEntry(page, 'Entry A1');
  await expect(page.getByRole('heading', { name: 'Saved evidence (1)' })).toBeVisible();
  await verifyChainOk(page, 1);
  await seedDemo(page); // Incident B becomes active.
  await addVaultEntry(page, 'Entry B1');
  await expect(page.getByRole('heading', { name: 'Saved evidence (1)' })).toBeVisible();
  await verifyChainOk(page, 1);
  // Back to A: its chain must still verify (its first row starts at '').
  await page.goto(`/#/incidents/${idA}`);
  await page.getByRole('button', { name: 'Is incident ko active karein' }).click();
  await verifyChainOk(page, 1);
  await page.screenshot({ path: 'tests/shots-local/step20-b2-chain.png' });
});

// B3: a double-tap on Save stores exactly one row, chain stays green.
test('step 20 B3: double-clicking Save stores one row, chain stays valid', async ({ page }) => {
  await seedDemo(page);
  await page.goto('/#/vault');
  await page.getByPlaceholder(/SMS ya note yahan/).fill('Double tap test');
  await page.getByRole('button', { name: 'Vault me save karein' }).dblclick();
  await expect(page.getByRole('heading', { name: 'Saved evidence (1)' })).toBeVisible({ timeout: 8000 });
  await verifyChainOk(page, 1);
});

// B4: Vault for an incident with no evidence names where the evidence is.
test('step 20 B4: empty Vault names the incident that holds the evidence', async ({ page }) => {
  const idA = await seedDemo(page);
  await addVaultEntry(page, 'Fraud SMS test');
  await expect(page.getByRole('heading', { name: 'Saved evidence (1)' })).toBeVisible();
  await seedDemo(page); // Incident B becomes active.
  await page.goto('/#/vault');
  await expect(page.getByRole('heading', { name: 'Saved evidence (0)' })).toBeVisible();
  await expect(page.getByText('Is incident ke liye koi evidence nahi hai')).toBeVisible();
  await expect(page.getByText(displayId(idA))).toBeVisible();
  await page.getByText('Is incident ke liye koi evidence nahi hai').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/shots-local/step20-b4-label.png' });
  // Back to A: the entry is there.
  await page.goto(`/#/incidents/${idA}`);
  await page.getByRole('button', { name: 'Is incident ko active karein' }).click();
  await page.goto('/#/vault');
  await expect(page.getByRole('heading', { name: 'Saved evidence (1)' })).toBeVisible();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
});

// B6: the empty note must never flash while stored rows are loading.
// A MutationObserver installed before the first navigation records every
// time the empty note enters the DOM. Control first (no evidence yet):
// the note genuinely appears, proving the observer catches it. Then,
// with one entry saved, a fresh Vault load must add no new sightings.
// (Hash navigations do not re-run init scripts, so the observer is
// installed before seedDemo and the event list persists across them.)
test('step 20 B6: Vault never flashes "no evidence" while rows load', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __emptyNoteEvents: number[] };
    w.__emptyNoteEvents = [];
    // Count APPEARANCES (false -> true transitions), not every mutation
    // while the note is on screen — toasts and heading updates would
    // otherwise count as fresh sightings of a note that never left.
    let wasPresent = false;
    const install = () => {
      const root = document.documentElement;
      if (!root) {
        setTimeout(install, 20);
        return;
      }
      new MutationObserver(() => {
        const present = document.body?.innerText.includes('Abhi koi saboot nahi hai') ?? false;
        if (present && !wasPresent) w.__emptyNoteEvents.push(Date.now());
        wasPresent = present;
      }).observe(root, { childList: true, subtree: true, characterData: true });
    };
    install();
  });
  await seedDemo(page);
  // Control: no evidence yet — the empty note appears, observer records it.
  await page.goto('/#/vault');
  await expect(page.getByText('Abhi koi saboot nahi hai')).toBeVisible({ timeout: 8000 });
  const controlCount = await page.evaluate(
    () => (window as unknown as { __emptyNoteEvents: number[] }).__emptyNoteEvents.length,
  );
  expect(controlCount).toBeGreaterThanOrEqual(1);
  // Now save one entry and load the Vault again: no new sightings.
  await addVaultEntry(page, 'Fraud SMS test');
  await expect(page.getByRole('heading', { name: 'Saved evidence (1)' })).toBeVisible();
  await page.goto('/#/vault');
  await expect(page.getByRole('heading', { name: 'Saved evidence (1)' })).toBeVisible();
  const afterCount = await page.evaluate(
    () => (window as unknown as { __emptyNoteEvents: number[] }).__emptyNoteEvents.length,
  );
  expect(afterCount).toBe(controlCount);
});

// B7: Triage h1 is "Smart Triage", not "Home".
test('step 20 B7: Triage page heading is Smart Triage', async ({ page }) => {
  await page.goto('/#/triage');
  await expect(page.locator('h1').first()).toHaveText('Smart Triage');
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
});

// B8: header language select is 44px tall at 390px.
test('step 20 B8: header language select is 44px tall at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/');
  const box = await page.locator('.gd-lang select').boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: 'tests/shots-local/step20-b8-390.png' });
});

// 1034px: footer reachable, no horizontal overflow, dock clear at max scroll.
test('step 20: 1034px home footer reachable, no horizontal overflow', async ({ page }) => {
  for (const height of [633, 768]) {
    await page.setViewportSize({ width: 1034, height });
    await page.goto('/#/');
    await page.evaluate(() => {
      const el = document.querySelector('.gd-stage-scroll');
      if (el) el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(400);
    await expect(page.getByText('RAKSHIO kabhi OTP / PIN / CVV nahi mangta')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
  await page.screenshot({ path: 'tests/shots-local/step20-home-1034-maxscroll.png' });
});
