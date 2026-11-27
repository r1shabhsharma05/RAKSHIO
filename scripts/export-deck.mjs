// Renders docs/RAKSHIO-pitch-deck.html to docs/RAKSHIO-pitch-deck.pdf
// with Chromium's print-to-PDF (one slide per page, 960x540).
// Run: node scripts/export-deck.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file://${root}/docs/RAKSHIO-pitch-deck.html`);
await page.pdf({
  path: `${root}/docs/RAKSHIO-pitch-deck.pdf`,
  width: '960px',
  height: '540px',
  printBackground: true,
  pageRanges: '1-8',
});
await browser.close();
console.log('wrote docs/RAKSHIO-pitch-deck.pdf');
