import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  clearClientState,
  comparisonPath,
  discoverPath,
  expectHarvestQuery,
  expectNoPageOverflow,
  fillHomeHarvest,
} from './support';

test.beforeEach(async ({ page }) => {
  await clearClientState(page);
});

const viewports = [
  { name: '320x568', width: 320, height: 568 },
  { name: '360x800', width: 360, height: 800 },
  { name: '375x667', width: 375, height: 667 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1440x900', width: 1440, height: 900 },
];

for (const viewport of viewports) {
  test(`keeps critical routes within the ${viewport.name} viewport`, async ({ page }) => {
    await page.setViewportSize(viewport);

    for (const route of ['/', discoverPath, comparisonPath(['demo-processor', 'demo-market'])]) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      await expectNoPageOverflow(page);
    }

    if (viewport.width <= 390) {
      await expect(page.getByRole('heading', { name: /compare at a glance/i })).toBeVisible();
      await expect(page.getByRole('table', { name: /comparison ledger/i })).toBeHidden();
      await expect(page.locator('#transport-demo-processor')).toBeHidden();
      await expect(page.locator('#mobile-transport-demo-processor')).toBeVisible();
    } else {
      await expect(page.getByRole('table', { name: /comparison ledger/i })).toBeVisible();
    }
  });
}

test('keeps the harvest journey operable with reduced motion enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).resolves.toBe(true);

  await fillHomeHarvest(page);
  await page.getByRole('button', { name: /find places to sell/i }).click();
  await page.waitForURL(/\/discover\?/);
  await expectHarvestQuery(page);
});

test('keeps invalid-harvest recovery usable with forced colors enabled', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/');
  const quantity = page.locator('#harvest-quantity');
  await quantity.fill('0');
  await page.getByRole('button', { name: /find places to sell/i }).click();

  const summary = page.getByRole('alert');
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await summary.getByRole('button', { name: /quantity: enter a valid quantity/i }).click();
  await expect(quantity).toBeFocused();
  await expectNoPageOverflow(page);
});

type AuditTarget = {
  name: string;
  path: string;
  prepare?: (page: Page) => Promise<void>;
};

const auditTargets: AuditTarget[] = [
  { name: 'home', path: '/' },
  { name: 'discovery list', path: discoverPath },
  { name: 'discovery map', path: `${discoverPath}&view=map` },
  { name: 'outlet detail', path: `/places/demo-cooperative?${new URL(discoverPath, 'http://aniwhere.local').searchParams}` },
  { name: 'comparison', path: comparisonPath(['demo-processor', 'demo-market']) },
  { name: 'saved', path: `/saved?${new URL(discoverPath, 'http://aniwhere.local').searchParams}` },
  {
    name: 'buyer offer modal',
    path: '/buyer',
    prepare: async (page) => {
      await page.getByRole('button', { name: /create offer/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    },
  },
  { name: 'not found', path: '/does-not-exist' },
];

test('has no detectable WCAG A or AA violations on the target routes', async ({ page }) => {
  for (const target of auditTargets) {
    await page.goto(target.path);
    await expect(page.locator('main')).toBeVisible();
    await target.prepare?.(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const details = results.violations
      .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)
      .join('\n');
    expect(results.violations, `${target.name}\n${details}`).toEqual([]);
  }
});
