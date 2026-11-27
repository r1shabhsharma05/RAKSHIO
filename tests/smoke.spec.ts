import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Full click-through of the Step 1 loop + Step 2 Vault, in a real browser.
// Catches what unit tests cannot: dead buttons, broken transitions, a11y.
test('demo flow end to end + vault tamper turns red', async ({ page }) => {
  await page.goto('/#/report');
  await expect(page.getByRole('heading', { name: 'Boliye, kya hua?' })).toBeVisible();

  // axe on the Panic screen: no violations allowed.
  // Wait for the 220ms crossfade + calm card to settle first — axe measures
  // computed colors, and mid-fade text reads lighter than it really is.
  await page.waitForTimeout(900);
  const panicAxe = await new AxeBuilder({ page }).analyze();
  expect(panicAxe.violations).toEqual([]);

  // Demo aid fills the seeded ₹20,000 UPI scenario (no mic needed).
  await page.getByRole('button', { name: /Demo data bharo/ }).click();
  await expect(page.getByRole('heading', { name: 'Kya ye sahi hai?' })).toBeVisible({ timeout: 8000 });
  await expect(page.getByText('₹20,000')).toBeVisible();

  // Confirmation gate: three "Haan" taps, then the card unlocks.
  const yes = page.getByRole('button', { name: 'Haan, sahi hai' });
  await expect(yes).toHaveCount(3);
  for (let i = 0; i < 3; i++) await yes.nth(0).click();
  await page.getByRole('button', { name: 'Ye sahi hai — aage badhein' }).click();
  await expect(page.getByRole('heading', { name: 'Aapka incident card' })).toBeVisible();

  // axe on the Incident screen (after the 300ms timeline reveal settles).
  await page.waitForTimeout(900);
  const incidentAxe = await new AxeBuilder({ page }).analyze();
  expect(incidentAxe.violations).toEqual([]);

  // Golden Hour Clock + Action Queue.
  await page.getByRole('button', { name: 'Aage ke kadam dekhein' }).click();
  await expect(page.getByRole('heading', { name: 'Golden Hour Clock' })).toBeVisible();
  await expect(page.getByText('1930 par call karein')).toBeVisible();

  // Evidence Vault: add, verify green, tamper test turns red, back works.
  await page.getByRole('button', { name: 'Evidence Vault kholein' }).click();
  await expect(page.getByRole('heading', { name: 'Evidence Vault' })).toBeVisible();
  await page.getByLabel('Text').fill('Test SMS: OTP 123456 bhejo');
  await page.getByRole('button', { name: 'Vault me save karein' }).click();
  await expect(page.getByText('Test SMS', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Chain verify karein' }).click();
  await expect(page.getByText(/Chain sahi hai/)).toBeVisible();
  await page.getByRole('button', { name: /Tamper test/ }).click();
  await expect(page.getByText(/Chain TOOTI/)).toBeVisible();
  await page.getByRole('button', { name: 'Wapas' }).click();
  await expect(page.getByRole('heading', { name: 'Aapka incident card' })).toBeVisible();
});

test('shield truth card flags a recovery scam', async ({ page }) => {
  await page.goto('/#/report');
  await page.getByRole('button', { name: /Demo data bharo/ }).click();
  await expect(page.getByRole('heading', { name: 'Kya ye sahi hai?' })).toBeVisible({ timeout: 8000 });
  const yes = page.getByRole('button', { name: 'Haan, sahi hai' });
  for (let i = 0; i < 3; i++) await yes.nth(0).click();
  await page.getByRole('button', { name: 'Ye sahi hai — aage badhein' }).click();
  await page.getByRole('button', { name: /Second-Scam Shield/ }).click();
  await expect(page.getByRole('heading', { name: 'Second-Scam Shield' })).toBeVisible();
  await page.getByLabel('Message paste karein').fill('Recovery agent hoon, paisa wapas karwa dunga, pehle fee bhejo');
  await page.getByRole('button', { name: 'Check karein' }).click();
  await expect(page.getByText('KHATRA')).toBeVisible();
  await expect(page.getByText('Paisa wapas ka vaada')).toBeVisible();
});
