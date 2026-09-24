import { expect, test } from '@playwright/test';
import { clearClientState, discoverPath, outletCard } from './support';

test.beforeEach(async ({ page }) => clearClientState(page));

test('a Bagsakan can create, edit, and pause a need that changes farmer fit', async ({ page }) => {
  await page.goto('/bagsakan');
  await page.locator('#bag-profile-name').fill('Santa Cruz Test Bagsakan');
  await page.locator('#bag-profile-municipalityId').selectOption('santa-cruz');
  await page.getByRole('button', { name: 'Save bagsakan' }).click();
  await expect(page.getByRole('heading', { name: 'Santa Cruz Test Bagsakan' })).toBeVisible();

  await page.getByRole('button', { name: 'Add buying need' }).click();
  await page.locator('#bag-demand-maxKg').fill('200');
  await page.getByRole('button', { name: 'Save need' }).click();
  await expect(page.getByText('200 kg maximum')).toBeVisible();

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

test('pin coordinates can be set without dragging and reset to municipality center', async ({ page }) => {
  await page.goto('/bagsakan');
  await page.locator('#bag-profile-name').fill('Pinned Test Bagsakan');
  await page.locator('#bag-profile-municipalityId').selectOption('santa-cruz');
  await page.locator('#bag-profile-lat').fill('14.285');
  await page.locator('#bag-profile-lng').fill('121.42');
  await expect(page.getByText('Exact pin selected')).toBeVisible();
  await page.getByRole('button', { name: 'Save bagsakan' }).click();
  await expect(page.getByText(/Santa Cruz, Laguna · Exact pin/)).toBeVisible();

  await page.getByRole('button', { name: 'Edit bagsakan' }).click();
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
  await expect(page.getByText(/hindi inilalathala sa live buyer network/i)).toBeVisible();
});
