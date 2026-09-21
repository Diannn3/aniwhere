import { expect, test } from '@playwright/test';

const discovery = '/discover?crop=tomato&kg=300&origin=los-banos&ready=2026-09-22&view=list&lang=en';
const compare = '/compare?places=demo-processor,demo-market,demo-msme-confirm&crop=tomato&kg=300&origin=los-banos&ready=2026-09-22&view=list&lang=en';

for (const viewport of [
  { name: '320x568', width: 320, height: 568 },
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
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
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
