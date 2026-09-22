import { expect, test } from '@playwright/test';

const mapPath =
  '/discover?crop=tomato&kg=300&origin=los-banos&ready=2026-09-22&view=map&place=demo-market&lang=en';

test('live map fails over to the resilient SVG map when MapLibre cannot load', async ({ page }) => {
  await page.route('https://unpkg.com/**', (route) => route.abort());
  await page.goto(mapPath);

  await expect(page.getByText('Offline map')).toBeVisible();
  await expect(page.getByText('The interactive map did not load. Using the resilient map instead.')).toBeVisible();
  await expect(page.getByText('Laguna Market Corridor')).toBeVisible();
});

test('default build never invents road distance or drive time', async ({ page }) => {
  await page.goto(
    '/compare?places=demo-processor,demo-market,demo-msme-confirm&crop=tomato&kg=300&origin=los-banos&ready=2026-09-22&view=list&lang=en'
  );

  await expect(page.getByText(/Straight-line from Los Baños municipality center; road route unavailable\./).first()).toBeVisible();
  await expect(page.getByText(/Road estimate/)).toHaveCount(0);
  await expect(page.getByText(/min drive/)).toHaveCount(0);
});


test('outlet detail labels municipality reference distance without implying exact farm routing', async ({ page }) => {
  await page.goto(
    '/places/demo-market?crop=tomato&kg=300&origin=los-banos&ready=2026-09-22&view=list&lang=en'
  );

  await expect(page.getByText(/Reference point:/).first()).toBeVisible();
  await expect(page.getByText(/Los Baños municipality center/).first()).toBeVisible();
  await expect(page.getByText('Road route unavailable.').first()).toBeVisible();
});


test('mobile map selection stays on the map until the farmer asks for the list', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://unpkg.com/**', (route) => route.abort());
  await page.goto(
    '/discover?crop=tomato&kg=300&origin=los-banos&ready=2026-09-22&view=map&lang=en'
  );

  await expect(page.getByText('Offline map')).toBeVisible();
  const processorPin = page.getByRole('button', { name: /Demo Processor:.*km/i });
  await processorPin.click();

  await expect(page.getByText('Offline map')).toBeVisible();
  await expect(page).toHaveURL(/view=map/);
  await expect(page).toHaveURL(/place=demo-processor/);

  await page.getByRole('button', { name: /View selected place in the list/i }).click();
  await expect(page).toHaveURL(/view=list/);
  await expect(page.locator('#outlet-card-demo-processor')).toBeVisible();
});
