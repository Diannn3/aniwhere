import { expect, test } from '@playwright/test';
import { clearClientState, discoverPath, outletCard } from './support';

test.beforeEach(async ({ page }) => clearClientState(page));

test('a Bagsakan can create, edit, and pause a need that changes farmer fit', async ({ page }) => {
  await page.goto('/bagsakan');
  await page.locator('#bag-profile-name').fill('Santa Cruz Test Bagsakan');
  await page.locator('#bag-profile-municipalityId').selectOption('santa-cruz');
  await expect(page.getByText(/We'll start at the center of Santa Cruz/)).toBeVisible();
  await expect(page.locator('[data-bagsakan-pin-map]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save bagsakan' }).click();
  await expect(page.getByRole('heading', { name: 'Santa Cruz Test Bagsakan' })).toBeVisible();

  await page.getByRole('button', { name: 'Add buying need' }).click();
  await page.locator('#bag-demand-maxKg').fill('200');
  await page.getByRole('button', { name: 'Save need' }).click();
  await expect(page.getByText('200 kg maximum')).toBeVisible();
  await expect(page.getByText('Sample price')).toBeVisible();
  await expect(page.getByText('Receiving dates')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Preview as farmer' })).toBeHidden();
  await page.getByText('More options').click();
  await expect(page.getByRole('link', { name: 'Preview as farmer' })).toBeVisible();

  await page.goto(discoverPath);
  const card = outletCard(page, 'Santa Cruz Test Bagsakan');
  await expect(card).toContainText('Accepts part of your harvest');
  await expect(card.locator('dd').nth(0)).toContainText('200');
  await expect(card.locator('dd').nth(1)).toContainText('100');

  await page.goto('/bagsakan');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('#bag-demand-maxKg').fill('500');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.goto(discoverPath);
  await expect(card).toContainText('Matches your harvest');
  await expect(card.locator('dd').nth(0)).toContainText('300');
  await expect(card.locator('dd').nth(1)).toContainText('0');

  await page.goto('/bagsakan');
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.goto(discoverPath);
  await expect(card).toContainText('Contact to confirm');
});

test('map clicks move the pin without recentering the camera', async ({ page }) => {
  await page.goto('/bagsakan');
  await page.locator('#bag-profile-name').fill('Map Pin Test Bagsakan');
  await page.locator('#bag-profile-municipalityId').selectOption('santa-cruz');
  await page.getByRole('button', { name: 'Set exact pin (optional)' }).click();
  await page.getByRole('button', { name: 'Choose on map' }).click();

  await expect(page.getByText('Click or tap the map to place the pin. You can also use the coordinates below.'))
    .toBeVisible({ timeout: 20_000 });

  const map = page.locator('[data-bagsakan-pin-map]');
  const canvas = map.locator('.maplibregl-canvas');
  const marker = map.locator('.maplibregl-marker');
  await expect(canvas).toBeVisible();
  await expect(marker).toBeVisible();

  const mapBox = await canvas.boundingBox();
  expect(mapBox).not.toBeNull();
  if (!mapBox) throw new Error('Bagsakan map canvas has no bounding box.');

  const markerCenterX = async () => {
    const box = await marker.boundingBox();
    if (!box) throw new Error('Bagsakan marker has no bounding box.');
    return box.x + box.width / 2;
  };

  const clickAt = async (xRatio: number, yRatio: number) => {
    const targetX = mapBox.x + mapBox.width * xRatio;
    await canvas.click({ position: { x: mapBox.width * xRatio, y: mapBox.height * yRatio } });
    await expect.poll(async () => Math.abs((await markerCenterX()) - targetX)).toBeLessThan(45);
  };

  await clickAt(0.28, 0.38);
  await expect(page.getByText('Exact pin selected')).toBeVisible();
  const firstLat = await page.locator('#bag-profile-lat').inputValue();
  const firstLng = await page.locator('#bag-profile-lng').inputValue();
  expect([firstLat, firstLng]).not.toEqual(['14.281', '121.417']);

  await clickAt(0.72, 0.62);
  await expect.poll(async () => [
    await page.locator('#bag-profile-lat').inputValue(),
    await page.locator('#bag-profile-lng').inputValue(),
  ]).not.toEqual([firstLat, firstLng]);
});

test('pin coordinates can be set without dragging and reset to municipality center', async ({ page }) => {
  await page.goto('/bagsakan');
  await page.locator('#bag-profile-name').fill('Pinned Test Bagsakan');
  await page.locator('#bag-profile-municipalityId').selectOption('santa-cruz');
  await page.getByRole('button', { name: 'Set exact pin (optional)' }).click();
  await page.getByText('Enter coordinates instead').click();
  await page.locator('#bag-profile-lat').fill('14.285');
  await page.locator('#bag-profile-lng').fill('121.42');
  await expect(page.getByText('Exact pin selected')).toBeVisible();
  await page.getByRole('button', { name: 'Save bagsakan' }).click();
  await expect(page.getByText(/Santa Cruz, Laguna · Exact pin/)).toBeVisible();

  await page.getByRole('button', { name: 'Edit bagsakan' }).click();
  await page.getByText('Enter coordinates instead').click();
  await page.getByRole('button', { name: 'Reset to municipality center' }).click();
  await expect(page.locator('#bag-profile-lat')).toHaveValue('14.281');
  await expect(page.locator('#bag-profile-lng')).toHaveValue('121.417');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText(/Santa Cruz, Laguna · Municipality center/)).toBeVisible();
});

test('buyer compatibility route shows the same local Bagsakan flow in Filipino', async ({ page }) => {
  await page.goto('/buyer?lang=fil');
  await expect(page.getByRole('heading', { name: 'Iyong bagsakan' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fil');
  await expect(page.getByText(/hindi ito live na anunsyo/i)).toBeVisible();
});

test('mobile home exposes Bagsakan setup without changing farmer navigation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/?lang=fil');
  await page.getByRole('link', { name: 'Pamahalaan ang bagsakan' }).click();
  await expect(page).toHaveURL(/\/bagsakan\?lang=fil/);
  await expect(page.getByRole('heading', { name: 'Saan ka matatagpuan?' })).toBeVisible();
  await expect(page.locator('[data-bagsakan-pin-map]')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Nabigasyon sa mobile' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('Bagsakan profile validation associates inline errors with their fields', async ({ page }) => {
  await page.goto('/bagsakan');

  await page.getByRole('button', { name: 'Save bagsakan' }).click();

  const municipality = page.locator('#bag-profile-municipalityId');
  await expect(municipality).toHaveAttribute('aria-invalid', 'true');
  await expect(municipality).toHaveAttribute(
    'aria-describedby',
    'bag-profile-municipalityId-error'
  );
  await expect(page.locator('#bag-profile-municipalityId-error')).toBeVisible();

  await page.locator('#bag-profile-name').fill('Accessible Pin Bagsakan');
  await municipality.selectOption('santa-cruz');
  await page.getByRole('button', { name: 'Set exact pin (optional)' }).click();
  await page.getByText('Enter coordinates instead').click();
  await page.locator('#bag-profile-lat').fill('');
  await page.locator('#bag-profile-lng').fill('');
  await page.getByRole('button', { name: 'Save bagsakan' }).click();

  await expect(page.locator('#bag-profile-lat')).toHaveAttribute(
    'aria-describedby',
    'bag-profile-lat-error'
  );
  await expect(page.locator('#bag-profile-lng')).toHaveAttribute(
    'aria-describedby',
    'bag-profile-lng-error'
  );
  await expect(page.locator('#bag-profile-lat-error')).toBeVisible();
  await expect(page.locator('#bag-profile-lng-error')).toBeVisible();
});
