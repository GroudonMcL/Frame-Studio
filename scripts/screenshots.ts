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
await page.getByRole('radio', { name: 'Basic' }).click();

// 5. Phase 2: shapes and paths in a group, with the drawn gems selected (mirrored left and right).
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Jewelled' }).click();
await page.getByRole('option', { name: /Gems/ }).click();
await page.screenshot({ path: `${out}/05-shapes-paths-groups.png` });

// 6. Editing the gem's points: square points, round curve handles.
await page.getByRole('button', { name: 'Edit points' }).click();
const box = (await page.getByTestId('overlay').boundingBox())!;
const r = box.width / 2;
const bw = r * 0.14;
// The gem's bottom point (y = 1 in its own units) on the right-hand side of the band, a quarter of the way round.
await page.mouse.dblclick(box.x + r + r * (1 - 0.1 - 0.07) - (0.9 * bw) / 2, box.y + r);
await page.screenshot({ path: `${out}/06-editing-points.png` });
await page.getByRole('button', { name: 'Done editing' }).click();

// 7. The same design on a hexagon, lit from the bottom right.
await page.getByRole('radio', { name: 'Hexagon' }).click();
const dial = (await page.getByRole('slider', { name: 'Light direction' }).boundingBox())!;
await page.mouse.click(dial.x + dial.width * 0.85, dial.y + dial.height * 0.85);
await page.screenshot({ path: `${out}/07-hexagon-light.png` });

await browser.close();
console.log(`Screenshots in ${out}/`);
