// Takes progress screenshots of the editor into docs/screenshots/.
//   npm run dev            (in one window)
//   npm run screenshots    (in another; or pass a base address)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
const out = 'docs/screenshots';
mkdirSync(out, { recursive: true });

// CHROMIUM_PATH lets a pre-installed browser be used instead of Playwright's own.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base);
await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
await page.reload();
await page.getByRole('img', { name: /Preview of/ }).waitFor();

// 1. First visit: Token Maker's Stamped frame as one layer.
await page.screenshot({ path: `${out}/01-first-open.png` });

// 2. The template picker.
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Infernal' }).waitFor();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/02-templates.png` });

// 3. A design built from editable layers, with its beads selected.
await page.getByRole('button', { name: 'Brass & beads' }).click();
await page.getByRole('option', { name: /Beads/ }).click();
await page.screenshot({ path: `${out}/03-layered-design.png` });

// 4. Infernal plus a ring of glowing spikes, in Advanced mode.
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Infernal' }).click();
await page.getByRole('button', { name: 'Add layer' }).click();
await page.getByRole('menuitem', { name: /Repeated shapes/ }).click();
await page.getByLabel('Shape', { exact: true }).selectOption('spike');
await page.getByLabel('Position across the band value').fill('-5');
await page.getByLabel('Position across the band value').press('Enter');
await page.getByRole('radio', { name: 'Advanced' }).click();
await page.screenshot({ path: `${out}/04-frame-plus-layer.png` });

await browser.close();
console.log(`Screenshots in ${out}/`);
