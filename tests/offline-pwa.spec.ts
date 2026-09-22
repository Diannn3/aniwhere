import { expect, test } from '@playwright/test';

const discover =
  '/discover?crop=tomato&kg=300&origin=los-banos&ready=2026-09-22&view=list&lang=en';

test('registers the AniWhere manifest and service worker after an online load', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  const registration = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return null;
    const ready = await navigator.serviceWorker.ready;
    return {
      scope: ready.scope,
      active: Boolean(ready.active),
    };
  });

  expect(registration?.active).toBe(true);
  expect(registration?.scope).toMatch(/\/$/);
});

test('reopens a previously loaded farmer route offline without caching harvest query strings', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });

  await page.goto(discover);
  await expect(page.getByRole('heading', { name: /300 kg/i })).toBeVisible();

  const cachedCoreNavigations = await page.evaluate(async () => {
    const names = await caches.keys();
    const aniCache = names.find((name) => name.startsWith('aniwhere-core-'));
    if (!aniCache) return [];
    const cache = await caches.open(aniCache);
    const requests = await cache.keys();
    return requests
      .map((request) => new URL(request.url))
      .filter((url) => ['/', '/discover', '/saved', '/compare'].includes(url.pathname))
      .map((url) => ({ pathname: url.pathname, search: url.search }));
  });

  expect(cachedCoreNavigations.some((entry) => entry.pathname === '/discover')).toBe(true);
  expect(cachedCoreNavigations.every((entry) => entry.search === '')).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /300 kg/i })).toBeVisible();
  await expect(page).toHaveURL(/crop=tomato/);
  await expect(page).toHaveURL(/kg=300/);
  await context.setOffline(false);
});

test('service worker source explicitly leaves API requests to the network layer', async ({ page }) => {
  await page.goto('/');
  const source = await page.evaluate(async () => (await fetch('/sw.js')).text());

  expect(source).toContain("url.pathname.startsWith('/api/')");
  expect(source).toContain('networkFirstNavigation');
  expect(source).not.toContain('cache.put(request, response.clone())\n      return response;\n    } catch {\n      if (request.mode');
});
