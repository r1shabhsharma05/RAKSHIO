import { test, type Page } from '@playwright/test';

// One-off: screenshot EVERY screen at 390x844 for Rishabh's review.
// Not part of the suite's pass/fail bar — run on demand:
//   npx playwright test tests/all-screens.spec.ts
const OUT = 'tests/shots-local/all';

async function dismissCalm(page: Page) {
  const btn = page.getByRole('button', { name: /Aage badhein/ });
  if (await btn.count()) await btn.first().click().catch(() => {});
  await page.waitForTimeout(400);
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

test.setTimeout(300000);

test('all screens', async ({ browser }) => {
  // ---- Flow A: main demo path (panic -> confirm -> incident -> actions -> coach -> ack -> tools)
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const a = await ctxA.newPage();
  await a.goto('/#/report');
  await a.waitForTimeout(1200);
  await a.screenshot({ path: `${OUT}/01-panic.png` });
  await dismissCalm(a);
  await a.screenshot({ path: `${OUT}/02-panic-clean.png` });

  await a.getByRole('button', { name: /Demo data bharo/ }).click();
  await a.waitForTimeout(300);
  await a.screenshot({ path: `${OUT}/03-extracting.png` });
  await a.getByRole('heading', { name: 'Kya ye sahi hai?' }).waitFor({ timeout: 8000 });
  await shot(a, '04-confirm');
  const yes = a.getByRole('button', { name: 'Haan, sahi hai' });
  for (let i = 0; i < 4; i++) await yes.nth(0).click(); // Step 16 (bug 9): Bank is the 4th confirm question.
  await a.getByRole('button', { name: 'Ye sahi hai — aage badhein' }).click();
  await a.getByRole('heading', { name: 'Aapka incident card' }).waitFor();
  await shot(a, '05-incident');

  await a.getByRole('button', { name: 'Aage ke kadam dekhein' }).click();
  await a.getByRole('heading', { name: 'Golden Hour Clock' }).waitFor();
  await shot(a, '06-actions');
  await a.getByRole('button', { name: '1930 Call Coach kholein' }).click();
  await shot(a, '07-coach');
  // Ack button only renders after Done is tapped (Coach.tsx conditional).
  await a.getByRole('button', { name: "Call ke baad 'Done' dabaiye" }).click();
  await a.getByRole('button', { name: 'Ack number bharein (Ack Bridge)' }).click();
  await shot(a, '08-ack');
  // Ack's Wapas goes straight to incident (App.tsx: ack onBack -> 'incident'),
  // not back to coach — the second Wapas click used to time out here.
  await a.getByRole('button', { name: 'Wapas' }).first().click();
  await a.getByRole('heading', { name: 'Aapka incident card' }).waitFor();

  const tools: Array<[string, string, string?]> = [
    ['Evidence Vault — saboot save karein', '09-vault', 'Chain verify karein'],
    ['Second-Scam Shield — message check karein', '10-shield'],
    ['Triage — mera rasta kya hai?', '11-triage'],
    ['Bank Alert Kit', '12-bank'],
    ['Care Circle — parivar ko batayein', '13-care'],
    ['Proof Pack — PDF / ZIP', '14-proof', 'ZIP download karein'],
  ];
  for (const [label, file, waitText] of tools) {
    await a.getByRole('button', { name: label }).click();
    if (waitText) await a.getByRole('button', { name: waitText }).waitFor({ timeout: 8000 }).catch(() => {});
    await shot(a, file);
    await a.getByRole('button', { name: 'Wapas' }).first().click();
    await a.getByRole('heading', { name: 'Aapka incident card' }).waitFor();
  }
  await ctxA.close();

  // ---- Flow B: listen (voice attempt) + listen text + gaps
  // Headless Chromium has no mic: a real SpeechRecognition.start() crashes
  // the page target. Stub the API so the Listen voice screen still renders
  // for the screenshot; the screen itself is real, only the speech backend
  // is stubbed.
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctxB.addInitScript(() => {
    class FakeRec {
      continuous = false;
      interimResults = false;
      lang = '';
      onresult: unknown = null;
      onerror: unknown = null;
      onend: unknown = null;
      start() {}
      stop() {}
      abort() {}
    }
    (window as unknown as Record<string, unknown>).SpeechRecognition = FakeRec;
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRec;
  });
  const b = await ctxB.newPage();
  await b.goto('/#/report');
  await b.waitForTimeout(1200);
  await dismissCalm(b);
  const mic = b.locator('.mic-btn').first();
  if (await mic.count()) {
    await mic.click();
    await shot(b, '15-listen-voice');
    await b.getByRole('button', { name: 'Wapas' }).first().click();
  }
  await b.getByRole('button', { name: 'Likh kar batayein' }).click();
  await shot(b, '16-listen-text');
  await b.locator('#listen-text').fill('mere paise kat gaye');
  await b.getByRole('button', { name: 'Samjhaao' }).click();
  await b.getByRole('button', { name: 'Confirm karein' }).waitFor({ timeout: 8000 }).catch(() => {});
  await shot(b, '17-gaps');
  await ctxB.close();

  // ---- Flow C: judge mode
  const ctxC = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const c = await ctxC.newPage();
  await c.goto('/#/report');
  await c.waitForTimeout(1200);
  await dismissCalm(c);
  await c.getByRole('button', { name: 'Judge Mode — bina mic ke demo chalao' }).click();
  await shot(c, '18-judge');
  await ctxC.close();
});
