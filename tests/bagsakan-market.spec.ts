import { expect, test, type Page } from '@playwright/test';
import { clearClientState, discoverPath, outletCard } from './support';
import { todayInManila } from '../src/lib/state/url-state';

const key = 'aniwhere:bagsakan:v1';
const today = todayInManila();

function dayOffset(days: number): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function seedNeed(page: Page, overrides: Record<string, unknown> = {}): Promise<void> {
  const timestamp = new Date().toISOString();
  const state = {
    version: 1,
    profile: {
      id: 'local-profile-test', name: 'Test Bagsakan', municipalityId: 'santa-cruz',
      lat: 14.281, lng: 121.417, locationBasis: 'municipality_center', updatedAt: timestamp,
    },
    demands: [{
      id: 'local-need-tomato', profileId: 'local-profile-test', cropKey: 'tomato',
      maxKg: 200, pricePerKg: 30, status: 'active', validFrom: today,
      validUntil: dayOffset(2), updatedAt: timestamp, ...overrides,
    }],
  };
  await page.evaluate(([storageKey, value]) => localStorage.setItem(storageKey, JSON.stringify(value)), [key, state] as const);
}

test.beforeEach(async ({ page }) => clearClientState(page));

test('same-device demand changes a 300 kg harvest from partial to full match', async ({ page }) => {
  await seedNeed(page);
  await page.goto(discoverPath);
  const card = outletCard(page, 'Test Bagsakan');
  await expect(card).toContainText('Accepts part of your harvest');
  await expect(card.locator('dd').nth(0)).toContainText('200');
  await expect(card.locator('dd').nth(1)).toContainText('100');
  await expect(card).toContainText('Demo Bagsakan on this device');
  await expect(card).toContainText('Demo bagsakan entry — this device');
  await expect(card).toContainText('straight-line');

  await seedNeed(page, { maxKg: 500 });
  await page.reload();
  await expect(card).toContainText('Matches your harvest');
  await expect(card.locator('dd').nth(0)).toContainText('300');
  await expect(card.locator('dd').nth(1)).toContainText('0');
});

test('unknown, paused, expired, and future needs cannot claim quantity matches', async ({ page }) => {
  await seedNeed(page, { maxKg: undefined });
  await page.goto(discoverPath);
  const card = outletCard(page, 'Test Bagsakan');
  await expect(card).toContainText('Contact to confirm');
  await expect(card).toContainText('Accepted quantity is still unknown');
  await expect(card).not.toContainText('Matches your harvest');

  await seedNeed(page, { status: 'paused' });
  await page.reload();
  await expect(card).toContainText('Contact to confirm');
  await expect(card).not.toContainText('₱30');

  await seedNeed(page, { validFrom: dayOffset(-2), validUntil: dayOffset(-1) });
  await page.reload();
  await expect(card).toContainText('Contact to confirm');
  await expect(card).not.toContainText('Accepts part of your harvest');

  await seedNeed(page, { validFrom: dayOffset(1), validUntil: dayOffset(3) });
  await page.reload();
  await expect(card).toContainText('Contact to confirm');
});

test('one local entry survives discovery, comparison, saved places, and preview', async ({ page }) => {
  await seedNeed(page);
  await page.goto(discoverPath);
  const card = outletCard(page, 'Test Bagsakan');
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Save outlet' }).click();
  await card.getByRole('button', { name: 'Add Test Bagsakan to compare' }).click();

  await page.getByRole('complementary', { name: 'Comparison dock' })
    .getByRole('link', { name: 'Compare' }).click();
  await expect(page.getByRole('table', { name: /comparison ledger/i })
    .getByRole('columnheader', { name: 'Test Bagsakan' })).toBeVisible();
  await expect(page).toHaveURL(/places=/);

  await page.goto('/saved');
  const heading = page.getByRole('heading', { name: 'Test Bagsakan' });
  await expect(heading).toBeVisible();
  await expect(heading.getByRole('link')).toHaveAttribute('href', /\/bagsakan\/preview\?/);
  await heading.getByRole('link').click();
  await expect(page).toHaveURL(/\/bagsakan\/preview\?/);
  await expect(page.getByRole('heading', { name: 'Test Bagsakan' }).first()).toBeVisible();
  await expect(page.getByText('Demo bagsakan entry — this device').first()).toBeVisible();
});
