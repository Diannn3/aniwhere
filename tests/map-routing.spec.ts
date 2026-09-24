import { expect, test } from '@playwright/test';
import { todayInManila } from '../src/lib/state/url-state';
import { CURRENT_OUTLETS } from '../src/lib/data/current-market';
import { LAGUNA_MUNICIPALITIES } from '../src/content/municipalities';
import { calculateStraightLineDistanceKm } from '../src/lib/domain/distance';
import { getOutletRouteEstimate, sharedDistanceBasis } from '../src/lib/routing/routing-matrix';

const mapPath =
  `/discover?crop=tomato&kg=300&origin=los-banos&ready=${todayInManila()}&view=map&place=demo-market&lang=en`;

function routeFor(outletId: string) {
  const origin = LAGUNA_MUNICIPALITIES.find((item) => item.id === 'los-banos')!;
  const outlet = CURRENT_OUTLETS.find((item) => item.id === outletId)!;
  const straightLine = calculateStraightLineDistanceKm(
    origin.lat,
    origin.lng,
    outlet.lat,
    outlet.lng
  );
  return getOutletRouteEstimate(origin.id, outlet.id, straightLine);
}

test('live map fails over to the resilient SVG map when MapLibre cannot load', async ({ page }) => {
  await page.route('https://unpkg.com/**', (route) => route.abort());
  await page.goto(mapPath);

  await expect(page.getByText('Offline map')).toBeVisible();
  await expect(page.getByText('The interactive map did not load. Using the resilient map instead.')).toBeVisible();
  await expect(page.getByText('Laguna Market Corridor')).toBeVisible();
});

test('comparison uses one truthful distance basis for the current artifact', async ({ page }) => {
  const routes = ['demo-processor', 'demo-market', 'demo-msme-confirm'].map(routeFor);
  const basis = sharedDistanceBasis(routes);

  await page.goto(
    `/compare?places=demo-processor,demo-market,demo-msme-confirm&crop=tomato&kg=300&origin=los-banos&ready=${todayInManila()}&view=list&lang=en`
  );

  if (basis === 'road') {
    await expect(page.getByText(/All selected places have road estimates/).first()).toBeVisible();
    await expect(page.getByText(/estimated drive/).first()).toBeVisible();
  } else {
    await expect(page.getByText(/Straight-line from Los Baños municipality center; used consistently across all selected places\./).first()).toBeVisible();
    await expect(page.getByText(/All selected places have road estimates/)).toHaveCount(0);
  }
});


test('outlet detail matches the current route artifact without implying exact farm routing', async ({ page }) => {
  const route = routeFor('demo-market');
  await page.goto(
    `/places/demo-market?crop=tomato&kg=300&origin=los-banos&ready=${todayInManila()}&view=list&lang=en`
  );

  await expect(page.getByText(/Reference point:/).first()).toBeVisible();
  await expect(page.getByText(/Los Baños municipality center/).first()).toBeVisible();
  if (route.source === 'road') {
    await expect(page.getByText(/estimated drive/).first()).toBeVisible();
    await expect(page.getByText(/live-traffic ETA/).first()).toBeVisible();
  } else {
    await expect(page.getByText('Road route unavailable.').first()).toBeVisible();
  }
});

test('Nagcarlan richer-data outlet obeys the same route truth contract', async ({ page }) => {
  const route = routeFor('demo-nagcarlan-kitchen');
  await page.goto(
    `/places/demo-nagcarlan-kitchen?crop=tomato&kg=300&origin=los-banos&ready=${todayInManila()}&view=list&lang=en`
  );

  if (route.source === 'road') {
    await expect(page.getByText(/estimated drive/).first()).toBeVisible();
  } else {
    await expect(page.getByText('Road route unavailable.').first()).toBeVisible();
  }
});


test('mobile map selection stays on the map until the farmer asks for the list', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://unpkg.com/**', (route) => route.abort());
  await page.goto(
    `/discover?crop=tomato&kg=300&origin=los-banos&ready=${todayInManila()}&view=map&lang=en`
  );

  await expect(page.getByText('Offline map')).toBeVisible();
  const processorPin = page.getByRole('button', { name: /Kusina Verde Processing House:.*km/i });
  await processorPin.click();

  const preview = page.getByRole('region', { name: 'Selected map place' });
  await expect(preview.getByText('Can accept', { exact: true })).toBeVisible();
  await expect(preview.getByText('Harvest remaining', { exact: true })).toBeVisible();
  await expect(preview.getByText('300 kg', { exact: true })).toBeVisible();
  await expect(preview.getByText('0 kg', { exact: true })).toBeVisible();

  await expect(page.getByText('Offline map')).toBeVisible();
  await expect(page).toHaveURL(/view=map/);
  await expect(page).toHaveURL(/place=demo-processor/);

  await page.getByRole('button', { name: /View selected place in the list/i }).click();
  await expect(page).toHaveURL(/view=list/);
  await expect(page.locator('#outlet-card-demo-processor')).toBeVisible();
});


test('fallback map preview dismissal clears selected place state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://unpkg.com/**', (route) => route.abort());
  await page.goto(
    `/discover?crop=tomato&kg=300&origin=los-banos&ready=${todayInManila()}&view=map&lang=en`
  );

  await expect(page.getByText('Offline map')).toBeVisible();
  await page.getByRole('button', { name: /Kusina Verde Processing House:.*straight-line/i }).click();
  await expect(page).toHaveURL(/place=demo-processor/);

  await page.getByRole('button', { name: 'Close preview' }).click();
  await expect(page).not.toHaveURL(/place=/);
  await expect(page.getByRole('button', { name: /View selected place in the list/i })).toHaveCount(0);
});
