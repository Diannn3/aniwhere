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
  await page.goto(
    '/compare?places=demo-processor,demo-market,demo-msme-confirm&crop=tomato&kg=300&origin=los-banos&ready=2026-09-22&view=list&lang=en'
  );

  await expect(page.getByText('Straight-line distance; road route unavailable.').first()).toBeVisible();
  await expect(page.getByText(/Road estimate/)).toHaveCount(0);
  await expect(page.getByText(/min drive/)).toHaveCount(0);
});
