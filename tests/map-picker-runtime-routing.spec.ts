import { expect, test, type Page } from '@playwright/test';
import { todayInManila } from '../src/lib/state/url-state';
import { clearClientState } from './support';

const storageKey = 'aniwhere:bagsakan:v1';
const profileId = 'local-profile-picker';
const placeId = `local-bagsakan-${profileId}`;
const today = todayInManila();
const harvest = `crop=tomato&kg=300&origin=los-banos&ready=${today}&lang=en`;

async function seedLocalBagsakan(page: Page) {
  const timestamp = new Date().toISOString();
  await page.evaluate(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [storageKey, {
    version: 1,
    profile: {
      id: profileId,
      name: 'Picker Bagsakan',
      municipalityId: 'pagsanjan',
      lat: 14.275,
      lng: 121.459,
      locationBasis: 'exact_pin',
      updatedAt: timestamp,
    },
    demands: [{
      id: 'need-tomato-picker',
      profileId,
      cropKey: 'tomato',
      maxKg: 80,
      status: 'active',
      validFrom: today,
      validUntil: today,
      updatedAt: timestamp,
    }],
  }] as const);
}

test.beforeEach(async ({ page }) => clearClientState(page));

test('map picker shares one resolved runtime route with the map', async ({ page }) => {
  await seedLocalBagsakan(page);
  await page.route('https://unpkg.com/**', (route) => route.abort());

  let requestCount = 0;
  await page.route('**/api/route-estimate', async (route) => {
    requestCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 120));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        schemaVersion: 1,
        provider: 'openrouteservice',
        profile: 'driving-car',
        distanceMeters: 30500,
        durationSeconds: 2280,
        geometryStatus: 'ready',
        geometry: {
          type: 'LineString',
          coordinates: [
            [121.241, 14.17],
            [121.285, 14.19],
            [121.36, 14.23],
            [121.459, 14.275],
          ],
        },
        generatedAt: '2026-09-25T00:00:00Z',
        attribution: 'Routing © openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors',
      }),
    });
  });

  await page.goto(`/discover?${harvest}&view=map&place=${placeId}`);

  const selection = page.locator('.map-picker__selection');
  await expect(selection).toContainText('Picker Bagsakan');
  await expect(selection).toContainText(/Fetching road route|30\.5 km by road/);
  await expect(selection).toContainText('30.5 km by road');
  await expect(selection).toContainText(/about 38 min/);
  expect(requestCount).toBe(1);
});

test('list view does not spend runtime routing quota for a selected local Bagsakan', async ({ page }) => {
  await seedLocalBagsakan(page);
  let requestCount = 0;
  await page.route('**/api/route-estimate', async (route) => {
    requestCount += 1;
    await route.fulfill({ status: 500, body: '{}' });
  });

  await page.goto(`/discover?${harvest}&view=list&place=${placeId}`);
  await expect(page.getByText('Picker Bagsakan').first()).toBeVisible();
  await page.waitForTimeout(250);
  expect(requestCount).toBe(0);
});

test('a delayed local route cannot leak into a newly selected static outlet', async ({ page }) => {
  await seedLocalBagsakan(page);
  await page.route('https://unpkg.com/**', (route) => route.abort());

  let requestCount = 0;
  await page.route('**/api/route-estimate', async (route) => {
    requestCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        schemaVersion: 1,
        provider: 'openrouteservice',
        profile: 'driving-car',
        distanceMeters: 30500,
        durationSeconds: 2280,
        geometryStatus: 'ready',
        geometry: {
          type: 'LineString',
          coordinates: [
            [121.241, 14.17],
            [121.285, 14.19],
            [121.36, 14.23],
            [121.459, 14.275],
          ],
        },
        generatedAt: '2026-09-25T00:00:00Z',
        attribution: 'Routing © openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors',
      }),
    });
  });

  await page.goto(`/discover?${harvest}&view=map&place=${placeId}`);
  const picker = page.locator('.map-picker');
  await expect(picker.locator('.map-picker__selection')).toContainText('Picker Bagsakan');

  await picker.getByRole('button', { name: 'Show all' }).click();
  await page.locator('[data-outlet-id="demo-nagcarlan-kitchen"] .map-picker__select').click();

  const selection = picker.locator('.map-picker__selection');
  await expect(selection).toContainText('Nagcarlan Hinog Kitchen');
  await expect(selection).toContainText('27.5 km by road');
  await page.waitForTimeout(600);
  await expect(selection).toContainText('Nagcarlan Hinog Kitchen');
  await expect(selection).toContainText('27.5 km by road');
  await expect(selection).not.toContainText('30.5 km by road');
  expect(requestCount).toBe(1);
});
