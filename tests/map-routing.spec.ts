import { expect, test } from '@playwright/test';

const mapPath =
  '/discover?crop=tomato&kg=300&origin=los-banos&ready=2026-09-22&view=map&place=demo-market&lang=en';

test('live map fails over to the resilient SVG map when MapLibre cannot load', async ({ page }) => {
  await page.route('https://unpkg.com/**', (route) => route.abort());
  await page.goto(mapPath);

  await expect(page.getByText('Offline map')).toBeVisible();
  await expect(page.getByText('The live map did not load. Using the resilient map instead.')).toBeVisible();
  await expect(page.getByText('Laguna Market Corridor')).toBeVisible();
});

test('default build never invents road distance or drive time', async ({ page }) => {
  await page.goto(mapPath);

  const selectedRouteCard = page.getByLabel('Interactive map of Laguna market outlets').locator('..');
  await expect(page.getByText('Straight-line distance').first()).toBeVisible();
  await expect(page.getByText('Road route').first()).toBeVisible();
  await expect(page.getByText('Unavailable').first()).toBeVisible();
  await expect(page.getByText(/dashed line is geographic context only/i)).toBeVisible();
  await expect(selectedRouteCard).toBeAttached();
});
