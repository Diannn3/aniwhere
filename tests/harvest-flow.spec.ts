import { expect, test } from '@playwright/test';
import {
  clearClientState,
  discoverPath,
  expectHarvestQuery,
  fillHomeHarvest,
  outletCard,
} from './support';

test.beforeEach(async ({ page }) => {
  await clearClientState(page);
});

test('home exposes the four harvest integration controls', async ({ page }) => {
  await page.goto('/');

  for (const id of ['harvest-crop', 'harvest-quantity', 'harvest-origin', 'harvest-ready-date']) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }

  await expect(page.locator('#harvest-crop').getByRole('radio', { name: /tomatoes/i })).toBeChecked();
});

test('submits a harvest and carries its values to discovery', async ({ page }) => {
  await page.goto('/');
  await fillHomeHarvest(page);

  await page.getByRole('button', { name: /find places to sell/i }).click();
  await page.waitForURL(/\/discover\?/);

  await expectHarvestQuery(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/300 kg tomatoes/i);
});

test('uses the invalid-submission summary to return focus to quantity', async ({ page }) => {
  await page.goto('/');
  const quantity = page.locator('#harvest-quantity');
  await quantity.fill('0');

  await page.getByRole('button', { name: /find places to sell/i }).click();

  const summary = page.getByRole('alert');
  await expect(summary).toContainText(/valid quantity greater than 0 kg/i);
  await expect(summary).toBeFocused();
  await summary.getByRole('button', { name: /quantity: enter a valid quantity/i }).click();
  await expect(quantity).toBeFocused();
  await expect(page).toHaveURL(/\/$/);
});

test('keeps Filipino selected while navigating home, discovery, and saved outlets', async ({ page }) => {
  await page.goto('/?lang=fil');
  await fillHomeHarvest(page);

  await page.getByRole('button', { name: /hanapin/i }).click();
  await page.waitForURL(/\/discover\?/);
  await expectHarvestQuery(page, { lang: 'fil' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'fil');

  const navigation = page.getByRole('navigation', { name: /pangunahing nabigasyon/i });
  await navigation.getByRole('link', { name: /nai-save/i }).click();
  await expect(page).toHaveURL(/\/saved\?lang=fil/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fil');

  await page.getByRole('link', { name: /aniwhere tahanan/i }).click();
  await expect(page).toHaveURL(/\/?lang=fil/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fil');
});

test('edits the discovery harvest and updates the address without discarding language', async ({ page }) => {
  await page.goto(discoverPath);
  await page.getByRole('button', { name: /edit harvest/i }).click();

  await page.getByLabel(/quantity.*kg/i).fill('450');
  await page.getByLabel(/origin municipality/i).selectOption('calamba');
  await page.getByLabel(/ready date/i).fill('2026-09-25');
  await page.getByRole('button', { name: /update results/i }).click();

  await expectHarvestQuery(page, {
    kg: '450',
    origin: 'calamba',
    ready: '2026-09-25',
  });
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/450 kg tomatoes.*calamba/i);
});

test('selects outlets in discovery and compares them in a semantic decision ledger', async ({ page }) => {
  await page.goto(discoverPath);

  await outletCard(page, 'Demo Processor').getByRole('checkbox').check();
  await outletCard(page, 'Demo Market').getByRole('checkbox').check();

  const dock = page.getByRole('complementary', { name: 'Comparison dock' });
  await expect(dock).toContainText(/2 of 3 places selected/i);
  await dock.getByRole('link', { name: 'Compare' }).click();
  await page.waitForURL(/\/compare\?/);

  const ledger = page.getByRole('table', { name: /comparison ledger for selected outlets/i });
  await expect(ledger).toBeVisible();
  await expect(ledger.getByRole('columnheader', { name: 'Demo Processor' })).toBeVisible();
  await expect(ledger.getByRole('columnheader', { name: 'Demo Market' })).toBeVisible();
  await expect(ledger.getByRole('rowheader', { name: 'Accepted quantity' })).toBeVisible();

  await ledger.getByLabel('Transport for Demo Processor').fill('7100');
  await expect(page.locator('[aria-live="polite"]')).toContainText(/after transport updated/i);
});

test('saves an outlet locally and makes it available on the saved route', async ({ page }) => {
  await page.goto(discoverPath);
  const cooperative = outletCard(page, 'Demo Cooperative');

  await cooperative.getByRole('button', { name: 'Save outlet' }).click();
  await expect(cooperative.getByRole('button', { name: 'Remove from saved' })).toBeVisible();

  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Saved' }).click();
  await expect(page).toHaveURL(/\/saved/);
  await expect(page.getByRole('heading', { name: 'Demo Cooperative' })).toBeVisible();
});
