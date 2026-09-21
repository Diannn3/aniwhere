import { expect, type Locator, type Page } from '@playwright/test';

export type HarvestQuery = {
  crop: string;
  kg: string;
  origin: string;
  ready: string;
  view: string;
  lang: string;
};

export const CANONICAL_HARVEST = {
  crop: 'tomato',
  kg: '300',
  origin: 'los-banos',
  ready: '2026-09-24',
  view: 'list',
  lang: 'en',
} satisfies HarvestQuery;

export const discoverPath = `/discover?${new URLSearchParams(CANONICAL_HARVEST).toString()}`;

export function comparisonPath(places: string[]): string {
  const params = new URLSearchParams(CANONICAL_HARVEST);
  params.set('places', places.join(','));
  return `/compare?${params.toString()}`;
}

export async function clearClientState(page: Page): Promise<void> {
  // Clear once for test isolation. An init script would clear local state again
  // on every in-test navigation and invalidate save/compare persistence tests.
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

export async function fillHomeHarvest(
  page: Page,
  values: Partial<Pick<HarvestQuery, 'kg' | 'origin' | 'ready'>> = {},
): Promise<void> {
  const harvest = { ...CANONICAL_HARVEST, ...values };
  await page.locator('#harvest-quantity').fill(harvest.kg);
  await page.locator('#harvest-origin').selectOption(harvest.origin);
  await page.locator('#harvest-ready-date').fill(harvest.ready);
}

export async function expectHarvestQuery(
  page: Page,
  overrides: Partial<HarvestQuery> = {},
): Promise<void> {
  const expected = { ...CANONICAL_HARVEST, ...overrides };

  await expect.poll(() => {
    const params = new URL(page.url()).searchParams;
    return Object.fromEntries(Object.keys(CANONICAL_HARVEST).map((key) => [key, params.get(key)]));
  }).toEqual(expected);
}

export function outletCard(page: Page, outletName: string): Locator {
  return page.locator('article').filter({
    has: page.getByRole('heading', { name: outletName, exact: true }),
  });
}

export function metricRow(table: Locator, metric: string): Locator {
  return table.getByRole('row').filter({
    has: table.getByRole('rowheader', { name: metric, exact: true }),
  });
}

export async function expectNoPageOverflow(page: Page): Promise<void> {
  const { pageWidth, viewportWidth } = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(pageWidth).toBeLessThanOrEqual(viewportWidth + 1);
}
