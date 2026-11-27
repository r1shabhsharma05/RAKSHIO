import { test, expect, type Page } from '@playwright/test';

// Step 4 production checks: offline PWA, graceful corrupt storage,
// lazy Proof load + toast, toast on Ack save/copy, keyboard reachability.

// Demo flow up to the confirmed incident card (no mic needed).
async function reachIncident(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Demo data bharo/ }).click();
  await expect(page.getByRole('heading', { name: 'Kya ye sahi hai?' })).toBeVisible({ timeout: 8000 });
  const yes = page.getByRole('button', { name: 'Haan, sahi hai' });
  for (let i = 0; i < 3; i++) await yes.nth(0).click();
  await page.getByRole('button', { name: 'Ye sahi hai — aage badhein' }).click();
  await expect(page.getByRole('heading', { name: 'Aapka incident card' })).toBeVisible();
}

test('offline reload serves the Panic screen from the service worker', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Boliye, kya hua?' })).toBeVisible();
  // Wait for the worker to activate, then one reload so it takes control.
  await page.waitForFunction(
    () => navigator.serviceWorker.getRegistration().then((r) => r?.active?.state === 'activated'),
    { timeout: 10000 },
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Boliye, kya hua?' })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Boliye, kya hua?' })).toBeVisible();
  await context.setOffline(false);
});

test('corrupt stored incident falls back to Panic, never a blank page', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rakshio.incident.v1', '{broken json'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Boliye, kya hua?' })).toBeVisible();
});

test('lazy Proof screen loads, downloads the PDF, and toasts', async ({ page }) => {
  await reachIncident(page);
  await page.getByRole('button', { name: /Proof Pack/ }).click();
  await expect(page.getByRole('heading', { name: 'Proof Pack' })).toBeVisible({ timeout: 10000 });
  const download = page.waitForEvent('download', { timeout: 15000 });
  await page.getByRole('button', { name: 'PDF download karein' }).click();
  expect((await download).suggestedFilename()).toBe('RAKSHIO-proof.pdf');
  // getByText, not getByRole('status', {name}) — the toast's accessible
  // name also folds in the close button's label, so the role query with
  // a bare message never matches; the visible text is the assertion.
  await expect(page.getByText('PDF download ho gaya')).toBeVisible();
});

test('Ack save and copy-deck copy both toast', async ({ page }) => {
  await reachIncident(page);
  await page.getByRole('button', { name: /Ack Bridge/ }).click();
  await expect(page.getByRole('heading', { name: 'Ack Bridge' })).toBeVisible();
  await page.getByLabel('Ack number (1930 call se)').fill('1930TEST123');
  await page.getByRole('button', { name: 'Save karein' }).click();
  await expect(page.getByText('Ack number save ho gaya')).toBeVisible();
  await page.getByRole('button', { name: 'Copy', exact: true }).first().click();
  await expect(page.getByText(/Copy ho gaya/)).toBeVisible();
});

test('mic button is keyboard-focusable', async ({ page }) => {
  await page.goto('/');
  const mic = page.getByRole('button', { name: 'Boliye kya hua — mic se batayein' });
  await mic.focus();
  await expect(mic).toBeFocused();
});

test('a render crash shows the calm fallback, never a blank page', async ({ page }) => {
  // Fault injection: the incident card formats dates during render, so a
  // throwing toLocaleString is a genuine render error for the boundary.
  // The flow is inlined (not reachIncident) because the incident card
  // itself is what throws — the fallback, not the card, is the expectation.
  await page.addInitScript(() => {
    Date.prototype.toLocaleString = () => {
      throw new Error('injected render fault');
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Demo data bharo/ }).click();
  await expect(page.getByRole('heading', { name: 'Kya ye sahi hai?' })).toBeVisible({ timeout: 8000 });
  const yes = page.getByRole('button', { name: 'Haan, sahi hai' });
  for (let i = 0; i < 3; i++) await yes.nth(0).click();
  await page.getByRole('button', { name: 'Ye sahi hai — aage badhein' }).click();
  await expect(page.getByRole('heading', { name: 'Kuch gadbad ho gayi' })).toBeVisible();
  await expect(page.getByRole('link', { name: '1930 par call karein' })).toBeVisible();
  await expect(page.getByText('report file nahi karta')).toBeVisible();
});
