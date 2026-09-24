import { expect, test } from '@playwright/test';
import { CANONICAL_HARVEST, clearClientState } from './support';
import { todayInManila } from '../src/lib/state/url-state';

const storageKey = 'aniwhere:bagsakan:v1';
const profileId = 'local-profile-test';
const placeId = `local-bagsakan-${profileId}`;

test.beforeEach(async ({ page }) => clearClientState(page));

test('local Bagsakan upgrades from Haversine to a multi-point road route', async ({ page }) => {
  const timestamp = new Date().toISOString();
  const today = todayInManila();
  await page.evaluate(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [storageKey, {
    version: 1,
    profile: {
      id: profileId,
      name: 'Nagbabagsakan Dito',
      municipalityId: 'pagsanjan',
      lat: 14.275,
      lng: 121.459,
      locationBasis: 'exact_pin',
      updatedAt: timestamp,
    },
    demands: [{
      id: 'need-tomato',
      profileId,
      cropKey: 'tomato',
      maxKg: 32,
      pricePerKg: 30,
      status: 'active',
      validFrom: today,
      validUntil: today,
      updatedAt: timestamp,
    }],
  }] as const);

  let requestCount = 0;
  await page.route('**/api/route-estimate', async (route) => {
    requestCount += 1;
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({
      originMunicipalityId: 'los-banos',
      destination: { lat: 14.275, lng: 121.459 },
    });
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

  const params = new URLSearchParams({ ...CANONICAL_HARVEST, place: placeId });
  await page.goto(`/bagsakan/preview?${params.toString()}`);

  await expect(page.getByRole('heading', { name: 'Nagbabagsakan Dito' }).first()).toBeVisible();
  await expect(page.getByText(/30\.5 km by road/).first()).toBeVisible();
  await expect(page.getByText(/~38 min estimated drive/).first()).toBeVisible();

  const routeCard = page.locator('.route-card');
  await expect(routeCard).toHaveAttribute('data-route-kind', 'road');
  await expect(routeCard).toHaveAttribute('data-route-points', '4');
  expect(requestCount).toBe(1);
});

test('local Bagsakan remains usable when runtime routing fails', async ({ page }) => {
  const timestamp = new Date().toISOString();
  const today = todayInManila();
  await page.evaluate(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [storageKey, {
    version: 1,
    profile: {
      id: profileId,
      name: 'Fallback Bagsakan',
      municipalityId: 'pagsanjan',
      lat: 14.273,
      lng: 121.454,
      locationBasis: 'municipality_center',
      updatedAt: timestamp,
    },
    demands: [{
      id: 'need-tomato',
      profileId,
      cropKey: 'tomato',
      maxKg: 32,
      status: 'active',
      validFrom: today,
      validUntil: today,
      updatedAt: timestamp,
    }],
  }] as const);

  await page.route('**/api/route-estimate', (route) =>
    route.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"routing_provider_unavailable"}' })
  );
  const params = new URLSearchParams({ ...CANONICAL_HARVEST, place: placeId });
  await page.goto(`/bagsakan/preview?${params.toString()}`);

  await expect(page.getByText(/25\.7 km straight-line/).first()).toBeVisible();
  await expect(page.getByText('Road route is temporarily unavailable.')).toBeVisible();
  await expect(page.getByText('Accepts part of your harvest').first()).toBeVisible();
  await expect(page.locator('.route-card')).toHaveAttribute('data-route-kind', 'straight_line');
});

test('static reviewed outlet never calls the runtime route endpoint', async ({ page }) => {
  let requestCount = 0;
  await page.route('**/api/route-estimate', async (route) => {
    requestCount += 1;
    await route.fulfill({ status: 500, body: '{}' });
  });

  const params = new URLSearchParams({
    ...CANONICAL_HARVEST,
    place: 'demo-nagcarlan-kitchen',
  });
  await page.goto(`/places/demo-nagcarlan-kitchen?${params.toString()}`);

  await expect(page.getByText(/27\.5 km by road/).first()).toBeVisible();
  expect(requestCount).toBe(0);
});

test('comparison adopts road basis only after the local route resolves', async ({ page }) => {
  const timestamp = new Date().toISOString();
  const today = todayInManila();
  await page.evaluate(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [storageKey, {
    version: 1,
    profile: {
      id: profileId,
      name: 'Compare Bagsakan',
      municipalityId: 'pagsanjan',
      lat: 14.275,
      lng: 121.459,
      locationBasis: 'exact_pin',
      updatedAt: timestamp,
    },
    demands: [{
      id: 'need-tomato',
      profileId,
      cropKey: 'tomato',
      maxKg: 200,
      status: 'active',
      validFrom: today,
      validUntil: today,
      updatedAt: timestamp,
    }],
  }] as const);

  await page.route('**/api/route-estimate', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
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
          coordinates: [[121.241, 14.17], [121.35, 14.22], [121.459, 14.275]],
        },
        generatedAt: '2026-09-25T00:00:00Z',
        attribution: 'Routing © openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors',
      }),
    });
  });

  const params = new URLSearchParams({
    ...CANONICAL_HARVEST,
    places: `demo-nagcarlan-kitchen,${placeId}`,
  });
  await page.goto(`/compare?${params.toString()}`);

  await expect(page.getByText(/Fetching comparable road estimates/)).toBeVisible();
  await expect(page.getByText(/All selected places have road estimates/).first()).toBeVisible();
  await expect(page.getByText(/Fetching comparable road estimates/)).toHaveCount(0);
  await expect(page.getByText(/Road distance from Los Baños municipality center/).first()).toBeVisible();
});


test('resilient map keeps resolved road metrics when MapLibre fails', async ({ page }) => {
  const timestamp = new Date().toISOString();
  const today = todayInManila();
  await page.evaluate(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [storageKey, {
    version: 1,
    profile: {
      id: profileId,
      name: 'Offline-map Bagsakan',
      municipalityId: 'pagsanjan',
      lat: 14.275,
      lng: 121.459,
      locationBasis: 'exact_pin',
      updatedAt: timestamp,
    },
    demands: [{
      id: 'need-tomato',
      profileId,
      cropKey: 'tomato',
      maxKg: 32,
      status: 'active',
      validFrom: today,
      validUntil: today,
      updatedAt: timestamp,
    }],
  }] as const);

  await page.route('https://unpkg.com/**', (route) => route.abort());
  await page.route('**/api/route-estimate', (route) =>
    route.fulfill({
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
          coordinates: [[121.241, 14.17], [121.35, 14.22], [121.459, 14.275]],
        },
        generatedAt: '2026-09-25T00:00:00Z',
        attribution: 'Routing © openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors',
      }),
    })
  );

  const params = new URLSearchParams({ ...CANONICAL_HARVEST, place: placeId });
  await page.goto(`/bagsakan/preview?${params.toString()}`);

  await expect(page.getByText('Offline map')).toBeVisible();
  await expect(page.getByText('30.5 km road')).toBeVisible();
  await expect(page.getByText('Road estimate available · line is illustrative')).toBeVisible();
  await expect(page.getByText(/30\.5 km by road/).first()).toBeVisible();
});
