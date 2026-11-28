import { test, expect, type Page } from '@playwright/test';

// Step 18 screenshots (local only, never pushed): incident detail in English,
// and Home at max scroll at 1034 / 1366 with the dock clear.
async function seedDemo(page: Page) {
  await page.goto('/#/report');
  await page.getByRole('button', { name: /Demo data bharo/ }).click();
  await expect(page.getByRole('heading', { name: 'Kya ye sahi hai?' })).toBeVisible({ timeout: 8000 });
  const yes = page.getByRole('button', { name: 'Haan, sahi hai' });
  for (let i = 0; i < 4; i++) await yes.nth(0).click();
  await page.getByRole('button', { name: 'Ye sahi hai — aage badhein' }).click();
  await expect(page.getByRole('heading', { name: 'Aapka incident card' })).toBeVisible();
}

test('step18 shots', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await seedDemo(page);
  await page.goto('/#/');
  await page.locator('.gd-lang select').selectOption('en');
  await page.goto('/#/incidents');
  await page.locator('.db-incident-card').first().click();
  await expect(page.getByRole('heading', { name: 'Your incident card' })).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(900); // timeline reveal settles
  await page.screenshot({ path: 'tests/shots-local/step18-incident-detail-en.png', fullPage: true });

  for (const [w, h, name] of [[1034, 633, 'step18-home-1034-maxscroll'], [1366, 633, 'step18-home-1366-maxscroll']] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/#/');
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const stage = document.querySelector('.gd-stage-scroll') as HTMLElement | null;
      if (stage) stage.scrollTop = stage.scrollHeight;
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `tests/shots-local/${name}.png` });
  }
});
