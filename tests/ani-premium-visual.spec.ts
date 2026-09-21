import { expect, test } from '@playwright/test';

const discovery = '/discover?crop=tomato&kg=300&origin=los-banos&ready=2026-09-22&view=list&lang=en';
const compare = '/compare?places=demo-processor,demo-market,demo-msme-confirm&crop=tomato&kg=300&origin=los-banos&ready=2026-09-22&view=list&lang=en';

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
    await expect(page.getByText('Can accept').first()).toBeVisible();
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



test('Ani text mode uses deterministic tools through the explicit mock provider', async ({ page }) => {
  await page.goto(discovery);
  await page.getByRole('button', { name: 'Ask Ani' }).click();
  await expect(page.getByText(/Preview mode\. This is not live market AI\./i)).toBeVisible();

  const input = page.getByLabel('Message Ani');
  await input.fill('What outlets fit this harvest?');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByText('What outlets fit this harvest?')).toBeVisible();
  await expect(page.getByText(/Preview only — this is demo data\./i)).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Ani' }).getByText(/full match/i)).toBeVisible();
});

test('Ani follows Filipino URL language in the static build', async ({ page }) => {
  await page.goto('/?lang=fil');
  const trigger = page.getByRole('button', { name: 'Tanungin si Ani' });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const input = page.getByLabel('Mensahe kay Ani');
  await input.fill('Saan puwedeng dalhin ang ani ko?');
  await page.getByRole('button', { name: 'Ipadala' }).click();

  await expect(page.getByText(/Preview lang — demo data ito\./i)).toBeVisible();
});

test('Ani microphone denial keeps text fallback visible', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => { throw new DOMException('Denied', 'NotAllowedError'); } },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask Ani' }).click();
  await page.getByRole('button', { name: 'Use microphone' }).click();
  await expect(page.getByText(/Microphone access is unavailable/i)).toBeVisible();
  await expect(page.getByLabel('Message Ani')).toBeVisible();
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
    ['discovery-map', '/discover?crop=tomato&kg=300&origin=los-banos&ready=2026-09-22&view=map&lang=en'],
    ['outlet-detail', '/places/demo-market?crop=tomato&kg=300&origin=los-banos&ready=2026-09-22&view=list&lang=en'],
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
  await page.getByRole('checkbox').first().check();
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
