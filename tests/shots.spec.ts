import { test } from '@playwright/test';

test('screenshots for UI critique', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/report');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'tests/shots-local/panic.png' });
  await page.getByRole('button', { name: /Demo data bharo/ }).click();
  await page.getByRole('heading', { name: 'Kya ye sahi hai?' }).waitFor({ timeout: 8000 });
  const yes = page.getByRole('button', { name: 'Haan, sahi hai' });
  for (let i = 0; i < 4; i++) await yes.nth(0).click(); // Step 16 (bug 9): Bank is the 4th confirm question.
  await page.getByRole('button', { name: 'Ye sahi hai — aage badhein' }).click();
  await page.getByRole('heading', { name: 'Aapka incident card' }).waitFor();
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'tests/shots-local/incident.png' });
  await page.getByRole('button', { name: 'Aage ke kadam dekhein' }).click();
  await page.getByRole('heading', { name: 'Golden Hour Clock' }).waitFor();
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'tests/shots-local/actions.png' });
});
