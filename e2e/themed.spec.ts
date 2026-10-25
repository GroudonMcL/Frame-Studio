import { expect, test } from '@playwright/test';
import { THEMED_TEMPLATES } from '../src/project/themedTemplates';

// The themed borders in New: every one has a picture, and picking one opens
// it as editable layers (with its own lighting where it has some).

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
  await page.reload();
  await expect(page.getByRole('img', { name: 'Preview of Stamped' })).toBeVisible();
});

test('the themed borders are offered with pictures, and open as editable layers', async ({ page }) => {
  await page.getByRole('button', { name: 'New' }).click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  const themed = dialog.getByRole('region', { name: 'Themed borders' });
  await expect(themed.locator('.tile')).toHaveCount(THEMED_TEMPLATES.length);
  // Pictures are drawn as tiles come into view.
  for (const tile of await themed.locator('.tile').all()) await tile.scrollIntoViewIfNeeded();
  await expect(themed.locator('.tile img')).toHaveCount(THEMED_TEMPLATES.length, { timeout: 30_000 });
  await themed.getByRole('button', { name: 'Hellfire ring', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Preview of Hellfire ring' })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /Burning cracks/ })).toBeVisible();

  // Its lighting came with it.
  await page.getByRole('radio', { name: 'Advanced' }).click();
  await page.getByText('Advanced: project data').click();
  const data = JSON.parse(await page.getByLabel('Project data').inputValue());
  expect(data.stage.bloom).toBeGreaterThan(0);

  // Another, then undo isn't needed: New replaces the design.
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('region', { name: 'Themed borders' }).getByRole('button', { name: 'Celtic knot', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Preview of Celtic knot' })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /Knotwork/ })).toBeVisible();
});
