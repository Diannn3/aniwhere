import { expect, test } from '@playwright/test';
import { todayInManila } from '../src/lib/state/url-state';
import { expectNoPageOverflow } from './support';

const harvest = `crop=tomato&kg=300&origin=los-banos&ready=${todayInManila()}&lang=en`;

for (const { width, height } of [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
  { width: 320, height: 740 },
]) {
  test(`keeps the map picker usable without page overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.route('https://unpkg.com/**', (route) => route.abort());
    await page.goto(`/discover?${harvest}&view=map`);

    const picker = page.locator('.map-picker');
    await expect(picker).toBeVisible();
    await expect(page.locator('.discovery-map-canvas')).toBeVisible();
    await expect(page.locator('.map-picker__row')).toHaveCount(11);

    if (width < 1024) {
      await expect(picker.getByRole('button', { name: 'Show all' })).toBeVisible();
      await expect(page.locator('.map-picker__row').nth(0)).toBeVisible();
      if (width <= 359 || height <= 700) {
        await expect(page.locator('.map-picker__row').nth(1)).toBeHidden();
      } else {
        await expect(page.locator('.map-picker__row').nth(1)).toBeVisible();
        await expect(page.locator('.map-picker__row').nth(2)).toBeHidden();
      }
      if (width < 768) {
        const pickerBox = await picker.boundingBox();
        const navBox = await page.locator('nav[aria-label="Mobile navigation"]').boundingBox();
        const stageBox = await page.locator('.discovery-map-stage').boundingBox();
        expect(pickerBox && navBox && stageBox).toBeTruthy();
        expect(pickerBox!.y + pickerBox!.height).toBeLessThanOrEqual(navBox!.y + 1);
        expect(pickerBox!.y - stageBox!.y).toBeGreaterThan(80);
      }
      await picker.getByRole('button', { name: 'Show all' }).click();
      await expect(page.locator('.map-picker__row').nth(width <= 359 || height <= 700 ? 1 : 2)).toBeVisible();
      await expect(page.locator('.map-picker__body')).toHaveCSS('overflow-y', 'auto');
    } else {
      await expect(picker.getByRole('button', { name: 'Show all' })).toHaveCount(0);
      await expect(page.locator('.map-picker__row').first()).toBeVisible();
    }

    await expectNoPageOverflow(page);
  });
}

test('selecting a place exposes its summary, syncs the map pin, and survives refresh', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://unpkg.com/**', (route) => route.abort());
  await page.goto(`/discover?${harvest}&view=map`);

  const picker = page.locator('.map-picker');
  await picker.getByRole('button', { name: 'Show all' }).click();
  const marketRow = page.locator('[data-outlet-id="demo-market"] .map-picker__select');
  await marketRow.focus();
  await page.keyboard.press('Space');
  await expect(marketRow).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/place=demo-market/);
  await expect(page.locator('.map-picker__selection')).toContainText('Sariwa sa Los Baños Market Collective');
  await expect(marketRow).toBeInViewport();

  await picker.getByRole('button', { name: 'Collapse' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  const map = page.getByRole('group', { name: /Illustrative Laguna outlet map/ });
  await map.getByRole('button', { name: /Kusina Verde Processing House:/ }).click();
  await expect(page).toHaveURL(/place=demo-processor/);
  await expect(page.locator('[data-outlet-id="demo-processor"] .map-picker__select')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.map-picker__selection')).toContainText('Kusina Verde Processing House');

  await page.reload();
  await expect(page).toHaveURL(/place=demo-processor/);
  await expect(page.locator('[data-outlet-id="demo-processor"] .map-picker__select')).toHaveAttribute('aria-pressed', 'true');
});

test('comparison actions are separate from selection and explain the three-place limit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://unpkg.com/**', (route) => route.abort());
  await page.goto(`/discover?${harvest}&view=map`);
  const picker = page.locator('.map-picker');
  await picker.getByRole('button', { name: 'Show all' }).click();

  const ids = ['demo-cooperative', 'demo-market', 'demo-processor', 'demo-msme-confirm'];
  for (const id of ids.slice(0, 3)) {
    await page.locator(`[data-outlet-id="${id}"] .map-picker__compare`).click();
  }
  await expect(page).not.toHaveURL(/place=/);
  await expect(picker.locator('.map-picker__footer')).toContainText('3 of 3 places selected');
  await expect(picker.locator('.map-picker__footer')).toContainText('Remove one to choose another.');
  await expect(picker.locator('.map-picker__footer').getByRole('link', { name: 'Compare' }))
    .toHaveAttribute('href', /places=demo-cooperative%2Cdemo-market%2Cdemo-processor|places=demo-cooperative,demo-market,demo-processor/);

  const fourth = page.locator(`[data-outlet-id="${ids[3]}"] .map-picker__compare`);
  await expect(fourth).toBeDisabled();
  await expect(picker.locator('.map-picker__footer')).toContainText('3 of 3 places selected');
  await expect(picker.locator('.map-picker__footer')).toContainText('Remove one to choose another.');

  await page.locator(`[data-outlet-id="${ids[3]}"] .map-picker__select`).click();
  await expect(page).toHaveURL(/place=demo-msme-confirm/);
  await expect(picker.locator('.map-picker__footer')).toContainText('3 of 3 places selected');
});

test('filtering clears a now-hidden selection while sorting retains it', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.route('https://unpkg.com/**', (route) => route.abort());
  await page.goto(`/discover?${harvest}&view=map&place=demo-market`);
  await expect(page.locator('.map-picker__selection')).toContainText('Sariwa sa Los Baños Market Collective');

  await page.locator('#sort-by-select').selectOption('distance');
  await expect(page).toHaveURL(/place=demo-market/);
  await expect(page.locator('.map-picker__selection')).toContainText('Sariwa sa Los Baños Market Collective');

  await page.getByRole('group', { name: 'Filter by fit status' }).getByRole('button', { name: /Matches harvest/ }).click();
  await expect(page).not.toHaveURL(/place=/);
  await expect(page.locator('.map-picker__selection')).toHaveCount(0);
  await expect(page.locator('.map-picker__row')).toHaveCount(2);
});

test('Filipino map picker remains readable and touchable at 200% text on a 320px screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route('https://unpkg.com/**', (route) => route.abort());
  await page.goto(`/discover?${harvest.replace('lang=en', 'lang=fil')}&view=map`);
  const picker = page.locator('.map-picker');
  await expect(picker).toContainText('Mga posibleng outlet');
  await picker.getByRole('button', { name: 'Ipakita lahat' }).click();
  await expect(picker).toContainText('Bahagi ng ani mo');
  await expect(picker).toContainText(/sa kalsada|tuwid na layo/);

  const controls = [
    picker.locator('[data-outlet-id="demo-market"] .map-picker__select'),
    picker.locator('[data-outlet-id="demo-market"] .map-picker__compare'),
  ];
  for (const control of controls) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expectNoPageOverflow(page);
});
