import { expect, test } from '@playwright/test';
import {
  clearClientState,
  discoverPath,
  expectHarvestQuery,
  fillHomeHarvest,
  outletCard,
} from './support';
import { todayInManila } from '../src/lib/state/url-state';

test.beforeEach(async ({ page }) => {
  await clearClientState(page);
});

test('home rejects malformed harvest URL state before showing it to the farmer', async ({ page }) => {
  const oversized = 'x'.repeat(120);
  await page.goto(
    `/?crop=${oversized}&kg=999999&origin=not-real&ready=not-a-date&variety=${oversized}&lang=en`
  );

  await expect(page.locator('#harvest-quantity')).toHaveValue('300');
  await expect(page.locator('#harvest-origin')).toHaveValue('los-banos');
  await expect(page.locator('#harvest-ready-date')).not.toHaveValue('not-a-date');
  await expect(page.getByRole('radio', { name: /other crop/i })).toBeChecked();
  await expect(page.getByPlaceholder(/enter crop name/i)).toHaveValue('');
});

test('landing crop suggestions stay filtered, selectable, and below the mobile search bar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const input = page.locator('#landing-crop');
  const options = page.locator('#landing-crop-suggestions').getByRole('option');

  await input.focus();
  await expect(options).toHaveCount(0);
  await input.fill('kam');
  await expect(options).toHaveCount(1);
  await expect(options.first()).toContainText('Tomatoes');
  const menuTop = await page.locator('#landing-crop-suggestions').evaluate((element) => element.getBoundingClientRect().top);
  const submitBottom = await page.getByRole('button', { name: /find outlets/i }).evaluate((element) => element.getBoundingClientRect().bottom);
  expect(menuTop).toBeGreaterThan(submitBottom);

  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(input).toHaveValue('Tomatoes');
  await expect(options).toHaveCount(0);
});

test('home exposes the four harvest integration controls', async ({ page }) => {
  await page.goto('/');

  for (const id of ['harvest-crop', 'harvest-quantity', 'harvest-origin', 'harvest-ready-date']) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }

  await expect(page.locator('#harvest-crop').getByRole('radio', { name: /tomatoes/i })).toBeChecked();
});

test('submits a harvest and carries its values to discovery', async ({ page }) => {
  await page.goto('/');
  await fillHomeHarvest(page);

  await page.getByRole('button', { name: /find places to sell/i }).click();
  await page.waitForURL(/\/discover\?/);

  await expectHarvestQuery(page, { view: 'map' });
});

test('uses the invalid-submission summary to return focus to quantity', async ({ page }) => {
  await page.goto('/');
  const quantity = page.locator('#harvest-quantity');
  await quantity.fill('0');

  await page.getByRole('button', { name: /find places to sell/i }).click();

  const summary = page.getByRole('alert');
  await expect(summary).toContainText(/valid quantity greater than 0 kg/i);
  await expect(summary).toBeFocused();
  await summary.getByRole('button', { name: /quantity: enter a valid quantity/i }).click();
  await expect(quantity).toBeFocused();
  await expect(page).toHaveURL(/\/$/);
});

test('keeps Filipino selected while navigating home, discovery, and saved outlets', async ({ page }) => {
  await page.goto('/?lang=fil');
  await expect(page.getByRole('group', { name: /piliin ang wika/i }).getByRole('link', { name: 'FIL' })).toHaveAttribute('aria-current', 'true');
  await fillHomeHarvest(page);

  await page.getByRole('button', { name: /hanapin/i }).click();
  await page.waitForURL(/\/discover\?/);
  await expectHarvestQuery(page, { lang: 'fil', view: 'map' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'fil');

  const navigation = page.getByRole('navigation', { name: /pangunahing nabigasyon/i });
  await navigation.getByRole('link', { name: /nai-save/i }).click();
  await expect(page).toHaveURL(/\/saved\?/);
  await expect.poll(() => {
    const url = new URL(page.url());
    return {
      crop: url.searchParams.get('crop'),
      kg: url.searchParams.get('kg'),
      origin: url.searchParams.get('origin'),
      ready: url.searchParams.get('ready'),
      lang: url.searchParams.get('lang'),
    };
  }).toEqual({
    crop: 'tomato',
    kg: '300',
    origin: 'los-banos',
    ready: todayInManila(),
    lang: 'fil',
  });
  await expect(page.locator('html')).toHaveAttribute('lang', 'fil');

  await page.getByRole('link', { name: /aniwhere tahanan/i }).click();
  await expect(page).toHaveURL(/\/?lang=fil/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fil');
});

test('cancels discovery harvest edits without leaving stale draft values', async ({ page }) => {
  await page.goto(discoverPath);
  const originalUrl = page.url();

  await page.getByRole('button', { name: /edit harvest/i }).click();
  await page.getByLabel(/quantity.*kg/i).fill('999');
  await page.getByRole('button', { name: /cancel harvest edit/i }).click();

  expect(page.url()).toBe(originalUrl);
  await page.getByRole('button', { name: /edit harvest/i }).click();
  await expect(page.getByLabel(/quantity.*kg/i)).toHaveValue('300');
});

test('keeps invalid discovery harvest edits from changing farmer results', async ({ page }) => {
  await page.goto(discoverPath);
  const originalUrl = page.url();

  await page.getByRole('button', { name: /edit harvest/i }).click();
  await page.getByLabel(/quantity.*kg/i).fill('0');
  await page.getByRole('button', { name: /update results/i }).click();

  await expect(page.getByRole('alert')).toContainText(/valid quantity greater than 0 kg/i);
  await expect(page.getByLabel(/quantity.*kg/i)).toHaveAttribute('aria-invalid', 'true');
  expect(page.url()).toBe(originalUrl);
  await expect(page.getByRole('button', { name: /cancel harvest edit/i })).toBeVisible();
});

test('edits the discovery harvest and updates the address without discarding language', async ({ page }) => {
  await page.goto(discoverPath);
  await page.getByRole('button', { name: /edit harvest/i }).click();

  await page.getByLabel(/quantity.*kg/i).fill('450');
  await page.getByLabel(/origin municipality/i).selectOption('calamba');
  await page.getByLabel(/ready date/i).fill('2026-09-25');
  await page.getByRole('button', { name: /update results/i }).click();

  await expectHarvestQuery(page, {
    kg: '450',
    origin: 'calamba',
    ready: '2026-09-25',
  });
});


test('labels fictional price evidence as demo data across farmer decision surfaces', async ({ page }) => {
  await page.goto(discoverPath);
  const cooperative = outletCard(page, 'Ani at Agos Farmers Cooperative');
  await expect(cooperative.getByText('Demo price', { exact: true })).toBeVisible();

  await cooperative.getByRole('link', { name: /view details/i }).click();
  await expect(page.getByText('Demo price', { exact: true }).first()).toBeVisible();

  await page.goto(
    `/compare?places=demo-cooperative&crop=tomato&kg=300&origin=los-banos&ready=${todayInManila()}&lang=en`
  );
  await expect(page.getByText(/Demo price: ₱28\/kg/).first()).toBeVisible();
});

test('distance sorting explains the shared comparison basis to farmers', async ({ page }) => {
  await page.goto(discoverPath);

  await page.getByLabel(/sort/i).selectOption('distance');

  const cards = page.locator('article[id^="outlet-card-"]');
  await expect(cards.first().getByText(/km (?:straight-line|by road)/i)).toBeVisible();
});

test('makes all four fit filters understandable and exposes selected state', async ({ page }) => {
  await page.goto(discoverPath);

  const filters = page.getByRole('group', { name: /filter by fit status/i });
  const all = filters.getByRole('button', { name: /all \(\d+\)/i });
  const match = filters.getByRole('button', { name: /matches harvest \(\d+\)/i });
  const partial = filters.getByRole('button', { name: /accepts part \(\d+\)/i });
  const confirm = filters.getByRole('button', { name: /confirm first \(\d+\)/i });
  const noMatch = filters.getByRole('button', { name: /doesn't match \(\d+\)/i });

  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(match).toHaveAttribute('aria-pressed', 'false');
  await expect(partial).toBeVisible();
  await expect(confirm).toBeVisible();
  await expect(noMatch).toBeVisible();

  await match.click();
  await expect(match).toHaveAttribute('aria-pressed', 'true');
  await expect(all).toHaveAttribute('aria-pressed', 'false');
});

test('clears a selected map place when a fit filter hides it', async ({ page }) => {
  await page.goto(
    '/discover?crop=tomato&kg=300&origin=los-banos&ready=2026-09-24&view=list&place=demo-processor&lang=en'
  );
  await expect(page).toHaveURL(/place=demo-processor/);

  const filters = page.getByRole('group', { name: /filter by fit status/i });
  await filters.getByRole('button', { name: /confirm first/i }).click();

  await expect(page).not.toHaveURL(/place=/);
});

test('explains the three-place comparison limit instead of silently blocking the farmer', async ({ page }) => {
  await page.goto(discoverPath);

  const cards = page.locator('article[id^="outlet-card-"]');
  await cards.nth(0).locator('.ledger-select-surface').click();
  await cards.nth(1).locator('.ledger-select-surface').click();
  await cards.nth(2).locator('.ledger-select-surface').click();

  const fourth = cards.nth(3).locator('.ledger-select-surface');
  await expect(fourth).toHaveAttribute('aria-disabled', 'true');
  const dock = page.getByLabel('Comparison dock');
  await expect(dock.getByText(/3 of 3 places selected/i)).toBeVisible();
  await expect(dock.getByText(/Maximum of 3. Remove one before choosing another/i)).toBeVisible();
});


test('comparison ignores malformed, duplicate, and unknown outlet selections', async ({ page }) => {
  await page.goto(
    '/compare?places=demo-market,demo-market,%3Cscript%3E,missing-outlet,demo-processor&crop=tomato&kg=300&origin=los-banos&ready=2026-09-24&lang=en'
  );

  const ledger = page.getByRole('table', { name: /comparison ledger/i });
  await expect(ledger).toBeVisible();
  await expect(ledger.getByRole('columnheader', { name: /Sariwa sa Los Baños Market Collective/i })).toBeVisible();
  await expect(ledger.getByRole('columnheader', { name: /Kusina Verde Processing House/i })).toBeVisible();
  await expect(ledger.getByRole('columnheader')).toHaveCount(3);
  await expect(page.getByText('<script>')).toHaveCount(0);
});

test('comparison never preselects outlets and preserves harvest context when empty', async ({ page }) => {
  await page.goto('/compare?crop=tomato&kg=450&origin=calamba&ready=2026-09-25&view=list&lang=fil');

  await expect(page.getByRole('heading', { name: 'Walang napiling outlet' })).toBeVisible();
  const back = page.getByRole('link', { name: /Maghanap ng mapagbebentahan/i });
  await expect(back).toHaveAttribute('href', /kg=450/);
  await expect(back).toHaveAttribute('href', /origin=calamba/);
  await expect(back).toHaveAttribute('href', /ready=2026-09-25/);
  await expect(back).toHaveAttribute('href', /lang=fil/);

  await back.click();
  await expectHarvestQuery(page, {
    kg: '450',
    origin: 'calamba',
    ready: '2026-09-25',
    lang: 'fil',
  });
});

test('selects outlets in discovery and compares them in a semantic decision ledger', async ({ page }) => {
  await page.goto(discoverPath);

  await outletCard(page, 'Kusina Verde Processing House').locator('.ledger-select-surface').click();
  await outletCard(page, 'Sariwa sa Los Baños Market Collective').locator('.ledger-select-surface').click();

  const dock = page.getByRole('complementary', { name: 'Comparison dock' });
  await expect(dock).toContainText(/2 of 3 places selected/i);
  await dock.getByRole('link', { name: 'Compare' }).click();
  await page.waitForURL(/\/compare\?/);

  const ledger = page.getByRole('table', { name: /comparison ledger for selected outlets/i });
  await expect(ledger).toBeVisible();
  await expect(ledger.getByRole('columnheader', { name: 'Kusina Verde Processing House' })).toBeVisible();
  await expect(ledger.getByRole('columnheader', { name: 'Sariwa sa Los Baños Market Collective' })).toBeVisible();
  await expect(ledger.getByRole('rowheader', { name: 'Accepted quantity' })).toBeVisible();

  await ledger.getByLabel('Transport for Kusina Verde Processing House').fill('7100');
  await expect(page.locator('[aria-live="polite"]').filter({ hasText: /after transport updated/i })).toHaveCount(1);
});

test('removing a compared outlet updates the URL so refresh does not restore it', async ({ page }) => {
  await page.goto(
    '/compare?places=demo-processor,demo-market&crop=tomato&kg=300&origin=los-banos&ready=2026-09-24&view=list&lang=en'
  );

  const ledger = page.getByRole('table', { name: /comparison ledger/i });
  await ledger.getByRole('button', { name: /Remove Sariwa sa Los Baños Market Collective from comparison/i }).click();

  await expect(page).toHaveURL(/places=demo-processor/);
  await expect(page).not.toHaveURL(/demo-market/);
  await page.reload();

  await expect(page.getByRole('columnheader', { name: 'Kusina Verde Processing House' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Sariwa sa Los Baños Market Collective' })).toHaveCount(0);
});

test('saves an outlet locally and makes it available on the saved route', async ({ page }) => {
  await page.goto(discoverPath);
  const cooperative = outletCard(page, 'Ani at Agos Farmers Cooperative');

  await cooperative.getByRole('button', { name: 'Save outlet' }).click();
  await expect(cooperative.getByRole('button', { name: 'Remove from saved' })).toBeVisible();

  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Saved' }).click();
  await expect(page).toHaveURL(/\/saved/);
  await expect(page.getByRole('heading', { name: 'Ani at Agos Farmers Cooperative' })).toBeVisible();
  await expect(page.getByText('Can accept').first()).toBeVisible();
  await expect(page.getByText('Harvest remaining').first()).toBeVisible();
  await expect(page.getByText(/straight-line from Los Baños municipality center/i).first()).toBeVisible();
});


test('saved outlets require confirmation before clearing the shortlist', async ({ page }) => {
  await page.goto(discoverPath);
  await outletCard(page, 'Ani at Agos Farmers Cooperative').getByRole('button', { name: 'Save outlet' }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Saved' }).click();

  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(page.getByText('Clear every saved place?')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ani at Agos Farmers Cooperative' })).toBeVisible();

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('heading', { name: 'Ani at Agos Farmers Cooperative' })).toBeVisible();

  await page.getByRole('button', { name: 'Clear all' }).click();
  await page.getByRole('button', { name: 'Yes, clear all' }).click();
  await expect(page.getByRole('heading', { name: /no saved/i })).toBeVisible();
});


test('empty saved state preserves the farmer harvest and language', async ({ page }) => {
  await page.goto('/saved?crop=tomato&kg=450&origin=calamba&ready=2026-09-25&view=list&lang=fil');

  const explore = page.getByRole('link', { name: 'Maghanap ng mapagbebentahan' });
  await expect(explore).toHaveAttribute('href', /kg=450/);
  await expect(explore).toHaveAttribute('href', /origin=calamba/);
  await expect(explore).toHaveAttribute('href', /lang=fil/);

  await explore.click();
  await expectHarvestQuery(page, {
    kg: '450',
    origin: 'calamba',
    ready: '2026-09-25',
    lang: 'fil',
  });
});
