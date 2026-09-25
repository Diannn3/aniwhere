import { expect, test } from '@playwright/test';
import { todayInManila } from '../src/lib/state/url-state';
import { expectNoPageOverflow, fillHomeHarvest } from './support';

const harvest = `crop=calamansi&kg=300&origin=los-banos&ready=${todayInManila()}&lang=en`;
const widths = [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
];

for (const viewport of widths) {
  test(`keeps the Discover controls clickable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('https://unpkg.com/**', (route) => route.abort());
    await page.goto(`/discover?${harvest}&view=list`);

    const switcher = page.getByRole('group', { name: 'Choose list or map view' });
    const mapButton = switcher.getByRole('button', { name: 'Map' });
    const listButton = switcher.getByRole('button', { name: 'List' });
    const map = page.locator('.discovery-map');
    const list = page.locator('.discovery-outlets');

    await expect(switcher).toBeVisible();
    await expect(page.locator('.discovery-workspace')).toHaveAttribute('data-view', 'list');
    await expect(list).toBeVisible();
    await expect(map).toBeHidden();
    expect(await mapButton.evaluate((button) => {
      const bounds = button.getBoundingClientRect();
      const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      return hit === button || button.contains(hit);
    })).toBe(true);

    await mapButton.click();
    await expect(map).toBeVisible();
    await expect(list).toBeHidden();
    await expect(mapButton).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/view=map/);
    await listButton.click();
    await expect(list).toBeVisible();
    await expect(map).toBeHidden();
    await expect(listButton).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(list).toBeVisible();
    await expect(map).toBeHidden();
    await expectNoPageOverflow(page);
  });
}

test('resolves first visits by screen size and honors a shared view', async ({ page }) => {
  for (const [width, expected] of [[390, 'list'], [1024, 'map']] as const) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/discover?${harvest}`);
    await expect(page).toHaveURL(new RegExp(`view=${expected}`));
    await expect(page.locator(expected === 'map' ? '.discovery-map' : '.discovery-outlets')).toBeVisible();
    await page.goto(`/discover?${harvest}&view=list`);
    await expect(page.locator('.discovery-outlets')).toBeVisible();
  }
});

for (const { width, query, view } of [
  { width: 390, query: '', view: 'list' },
  { width: 1280, query: '', view: 'map' },
  { width: 390, query: '&view=map', view: 'map' },
] as const) {
  test(`shows ${view} before hydration at ${width}px with ${query || 'no view parameter'}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route(/\/_astro\/.*\.js$/, (route) => route.abort());
    await page.goto(`/discover?${harvest}${query}`);
    await expect(page.locator('.discovery-workspace')).toHaveAttribute('data-view', 'auto');
    await expect(page.locator(view === 'map' ? '.discovery-map' : '.discovery-outlets')).toBeVisible();
    await expect(page.locator(view === 'map' ? '.discovery-outlets' : '.discovery-map')).toBeHidden();
  });
}

test('the harvest form uses the phone view while desktop uses the map', async ({ page }) => {
  for (const [width, expected] of [[390, 'list'], [1280, 'map']] as const) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await fillHomeHarvest(page);
    await page.getByRole('button', { name: /find places to sell/i }).click();
    await expect(page).toHaveURL(new RegExp(`view=${expected}`));
  }
});

test('keyboard switches views and the outlet card keeps separate actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://unpkg.com/**', (route) => route.abort());
  await page.goto(`/discover?${harvest}&view=list`);
  const switcher = page.getByRole('group', { name: 'Choose list or map view' });
  await expect(page.locator('.discovery-workspace')).toHaveAttribute('data-view', 'list');
  await switcher.getByRole('button', { name: 'Map' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.discovery-map')).toBeVisible();
  await switcher.getByRole('button', { name: 'List' }).focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.discovery-outlets')).toBeVisible();

  const card = page.locator('.ledger-entry').first();
  const select = card.locator('.ledger-select-surface');
  await card.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const heading = await card.getByRole('heading').boundingBox();
  expect(heading).not.toBeNull();
  await page.mouse.click(heading!.x + heading!.width / 2, heading!.y + heading!.height / 2);
  await expect(select).toHaveAttribute('aria-pressed', 'true');
  await card.getByRole('button', { name: 'Save outlet' }).click();
  await expect(select).toHaveAttribute('aria-pressed', 'true');
  await card.locator('summary').click();
  await expect(select).toHaveAttribute('aria-pressed', 'true');
  await select.focus();
  await page.keyboard.press('Enter');
  await expect(select).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Space');
  await expect(select).toHaveAttribute('aria-pressed', 'true');
  await card.getByRole('link', { name: 'View details' }).click();
  await expect(page).toHaveURL(/\/places\//);
});

for (const width of [320, 390, 768, 1024]) {
  test(`reflows Filipino Discover with an open editor and 200% text at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/discover?${harvest.replace('lang=en', 'lang=fil')}&view=list`);
    await page.locator('.discovery-docket > .flex > button').click();
    await expect(page.locator('#edit-crop-select')).toBeVisible();
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await expectNoPageOverflow(page);
    await expect(page.getByRole('group', { name: 'Piliin ang listahan o mapa' })).toBeVisible();
  });
}
