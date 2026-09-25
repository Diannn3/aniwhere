import { expect, test } from '@playwright/test';
import { todayInManila } from '../src/lib/state/url-state';
import { DEMO_OUTLETS } from '../src/content/demo-outlets';
import { LAGUNA_MUNICIPALITIES } from '../src/content/municipalities';
import { calculateStraightLineDistanceKm } from '../src/lib/domain/distance';
import { getOutletRouteEstimate, sharedDistanceBasis } from '../src/lib/routing/routing-matrix';

const mapPath =
  `/discover?crop=tomato&kg=300&origin=los-banos&ready=${todayInManila()}&view=map&place=demo-market&lang=en`;

function routeFor(outletId: string) {
  const origin = LAGUNA_MUNICIPALITIES.find((item) => item.id === 'los-banos')!;
  const outlet = DEMO_OUTLETS.find((item) => item.id === outletId)!;
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


test('mobile map pins and the shared outlet picker stay synchronized', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://unpkg.com/**', (route) => route.abort());
  await page.goto(
    `/discover?crop=tomato&kg=300&origin=los-banos&ready=${todayInManila()}&view=map&lang=en`
  );

  await expect(page.getByText('Offline map')).toBeVisible();
  const selectedRow = page.locator('[data-outlet-id="demo-processor"] .map-picker__select');
  await selectedRow.click();
  await expect(page).toHaveURL(/view=map/);
  await expect(page).toHaveURL(/place=demo-processor/);
  await expect(selectedRow).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.map-picker__selection')).toContainText('Kusina Verde Processing House');

  await page.locator('.map-picker').getByRole('button', { name: 'Collapse' }).click();
  await page.locator('.discovery-map-stage').scrollIntoViewIfNeeded();
  const processorPin = page.getByRole('group', { name: /Illustrative Laguna outlet map/ })
    .getByRole('button', { name: /Ani at Agos Farmers Cooperative:/i });
  await processorPin.click();
  await expect(page).toHaveURL(/place=demo-cooperative/);
  await expect(page.locator('[data-outlet-id="demo-cooperative"] .map-picker__select'))
    .toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.map-picker__selection')).toContainText('Ani at Agos Farmers Cooperative');
});


test('mobile picker details keep map and harvest context in their link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://unpkg.com/**', (route) => route.abort());
  await page.goto(
    `/discover?crop=tomato&kg=300&origin=los-banos&ready=${todayInManila()}&view=map&lang=en`
  );

  await expect(page.getByText('Offline map')).toBeVisible();
  await page.locator('[data-outlet-id="demo-processor"] .map-picker__select').click();
  await expect(page).toHaveURL(/place=demo-processor/);
  await page.locator('.map-picker__selection').getByRole('link', { name: 'View details' }).click();
  await expect(page).toHaveURL(/\/places\/demo-processor/);
  await expect(page).toHaveURL(/view=map/);
  await expect(page).toHaveURL(/kg=300/);
  await expect(page).toHaveURL(/origin=los-banos/);

  await page.getByRole('link', { name: 'Back to discovery results' }).click();
  await expect(page).toHaveURL(/\/discover\?/);
  await expect(page).toHaveURL(/view=map/);
});
