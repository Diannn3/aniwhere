import { expect, test } from '@playwright/test';
import { todayInManila } from '../src/lib/state/url-state';

const discovery = `/discover?crop=tomato&kg=300&origin=los-banos&ready=${todayInManila()}&view=list&lang=en`;
const compare = `/compare?places=demo-processor,demo-market,demo-msme-confirm&crop=tomato&kg=300&origin=los-banos&ready=${todayInManila()}&view=list&lang=en`;

for (const viewport of [
  { name: '320x568', width: 320, height: 568 },
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1440x900', width: 1440, height: 900 },
]) {
  test(`premium visual surfaces ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.screenshot({ path: `tests/.artifacts/visual/${viewport.name}-home.png`, fullPage: true });

    await page.goto(discovery);
    await expect(page.getByRole('heading', { name: /300 kg/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Potential outlets/ }).first()).toBeVisible();
    await page.screenshot({ path: `tests/.artifacts/visual/${viewport.name}-discovery.png`, fullPage: true });

    await page.goto(compare);
    await expect(page.getByRole('heading', { name: /Compare options/i })).toBeVisible();
    await page.screenshot({ path: `tests/.artifacts/visual/${viewport.name}-compare.png`, fullPage: true });

    await page.goto('/');
    const ani = page.getByRole('button', { name: 'Ask Ani' });
    await ani.click();
    await expect(page.getByRole('dialog', { name: 'Ani' })).toBeVisible();
    await page.screenshot({ path: `tests/.artifacts/visual/${viewport.name}-ani-open.png`, fullPage: true });
  });
}

test('Ani shell is keyboard closable and restores focus', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Ask Ani' });
  await trigger.focus();
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Ani' });
  await expect(dialog).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('inert', '');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  await expect(trigger).toBeFocused();
});

test('Ani shows the live home harvest draft before the farmer submits discovery', async ({ page }) => {
  await page.goto('/');
  await page.locator('#harvest-quantity').fill('450');
  await page.locator('#harvest-origin').selectOption('santa-cruz');

  await page.getByRole('button', { name: 'Ask Ani' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ani' });
  await expect(dialog.getByText(/450 kg .*Santa Cruz/i)).toBeVisible();
});

test('Ani local help follows the Filipino URL language', async ({ page }) => {
  await page.goto('/?lang=fil');
  const trigger = page.getByRole('button', { name: 'Tanungin si Ani' });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const input = page.getByLabel('Mensahe kay Ani');
  await input.fill('Ano ang AniWhere?');
  await page.getByRole('button', { name: 'Ipadala' }).click();

  await expect(page.getByText(/Tinutulungan ka ng AniWhere/i)).toBeVisible();
  await expect(page.getByText(/Local na preloaded na sagot/i)).toBeVisible();
});

test('Ani local FAQ still answers after the loaded page loses signal', async ({ page, context }) => {
  await page.goto(discovery);
  await context.setOffline(true);

  await page.getByRole('button', { name: 'Ask Ani' }).click();
  const input = page.getByLabel('Message Ani');
  await input.fill('What does Matches your harvest mean?');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByText(/not a sale, reservation, or promise/i)).toBeVisible();
  await expect(page.getByText(/Preloaded local answer/i)).toBeVisible();
  await context.setOffline(false);
});

test('Ani local FAQ remains usable with an invalid home harvest', async ({ page }) => {
  await page.goto('/');
  await page.locator('#harvest-quantity').fill('0');

  await page.getByRole('button', { name: 'Ask Ani' }).click();
  await expect(page.getByText(/Local FAQ still works/i)).toBeVisible();

  const input = page.getByLabel('Message Ani');
  await input.fill('What is AniWhere?');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(/AniWhere helps you find possible places/i)).toBeVisible();
});

test('Ani local FAQ does not guess when no bundled answer matches', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask Ani' }).click();

  const input = page.getByLabel('Message Ani');
  await input.fill('kumusta ang panahon bukas');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByText(/I do not have a local answer for that yet/i)).toBeVisible();
});

test('Ani FAQ action links preserve current harvest context', async ({ page }) => {
  await page.goto(discovery);
  await page.getByRole('button', { name: 'Ask Ani' }).click();

  const input = page.getByLabel('Message Ani');
  await input.fill('How do I change my harvest details?');
  await page.getByRole('button', { name: 'Send' }).click();

  const action = page.getByRole('link', { name: /Edit harvest/i });
  await expect(action).toHaveAttribute('href', /crop=tomato/);
  await expect(action).toHaveAttribute('href', /kg=300/);
  await expect(action).toHaveAttribute('href', /origin=los-banos/);
  await expect(action).toHaveAttribute('href', new RegExp(`ready=${todayInManila()}`));
});

test('Ani shell and discovery do not introduce narrow-screen overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  for (const path of ['/', discovery, compare]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});


test('surface audit matrix at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const cases = [
    ['discovery-map', `/discover?crop=tomato&kg=300&origin=los-banos&ready=${todayInManila()}&view=map&lang=en`],
    ['outlet-detail', `/places/demo-market?crop=tomato&kg=300&origin=los-banos&ready=${todayInManila()}&view=list&lang=en`],
    ['saved-empty', '/saved?lang=en'],
    ['buyer', '/buyer?lang=en'],
    ['filipino-home', '/?lang=fil'],
    ['not-found', '/this-route-does-not-exist'],
  ] as const;

  for (const [name, path] of cases) {
    await page.goto(path);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: `tests/.artifacts/visual/390x844-${name}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, name).toBeLessThanOrEqual(1);
  }
});


test('Ani trigger stays clear of mobile comparison dock', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(discovery);
  await page.locator('.ledger-select-surface').first().click();
  const dock = page.getByLabel('Comparison dock');
  const ani = page.getByRole('button', { name: 'Ask Ani' });
  await expect(dock).toBeVisible();
  const [dockBox, aniBox] = await Promise.all([dock.boundingBox(), ani.boundingBox()]);
  expect(dockBox).not.toBeNull();
  expect(aniBox).not.toBeNull();
  const overlap = !(
    aniBox!.x + aniBox!.width <= dockBox!.x ||
    dockBox!.x + dockBox!.width <= aniBox!.x ||
    aniBox!.y + aniBox!.height <= dockBox!.y ||
    dockBox!.y + dockBox!.height <= aniBox!.y
  );
  expect(overlap).toBe(false);
});


test('Ani shared harvest state updates the real comparison surface', async ({ page }) => {
  await page.goto(compare);
  await expect(page.getByText('300 kg', { exact: true }).first()).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('aniwhere:harvest-context', {
      detail: {
        crop: 'tomato',
        quantityKg: 450,
        originMunicipality: 'los-banos',
        readyDate: '2026-09-22',
      },
    }));
  });

  await expect(page.getByText('450 kg', { exact: true }).first()).toBeVisible();
});


test('Ani transport state updates the real comparison ledger', async ({ page }) => {
  await page.goto(compare);
  const transport = page.getByLabel(/Transport for Kusina Verde Processing House/i);
  await expect(transport).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('aniwhere:transport-update', {
      detail: { outletId: 'demo-processor', amount: 750 },
    }));
  });

  await expect(transport).toHaveValue('750');
  await expect(page.getByRole('table', { name: /comparison ledger/i }).getByText(/Your edited transport amount/i)).toBeVisible();
});
