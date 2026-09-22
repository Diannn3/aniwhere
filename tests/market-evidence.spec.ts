import { expect, test } from '@playwright/test';
import { clearClientState, comparisonPath, metricRow } from './support';

test.beforeEach(async ({ page }) => {
  await clearClientState(page);
});

test('keeps partial quantities and unknown capacity distinct in the comparison ledger', async ({ page }) => {
  await page.goto(comparisonPath(['demo-market', 'demo-msme-confirm']));

  const ledger = page.getByRole('table', { name: /comparison ledger for selected outlets/i });
  await expect(ledger).toBeVisible();

  const fit = metricRow(ledger, 'Fit');
  const accepted = metricRow(ledger, 'Accepted quantity');
  const remaining = metricRow(ledger, 'Remaining harvest');
  const gross = metricRow(ledger, 'Gross amount');
  const afterTransport = metricRow(ledger, 'After entered transport');
  const confirmation = metricRow(ledger, 'Confirm before travel');

  await expect(fit.getByRole('cell').first()).toContainText(/accepts part of your harvest/i);
  await expect(accepted.getByRole('cell').first()).toHaveText('200 kg');
  await expect(remaining.getByRole('cell').first()).toHaveText('100 kg');

  const unknownAccepted = accepted.getByRole('cell').nth(1);
  const unknownRemaining = remaining.getByRole('cell').nth(1);
  const unknownGross = gross.getByRole('cell').nth(1);
  const unknownAfterTransport = afterTransport.getByRole('cell').nth(1);

  await expect(fit.getByRole('cell').nth(1)).toContainText(/contact to confirm/i);
  await expect(unknownAccepted).toHaveText('Confirm');
  await expect(unknownRemaining).toHaveText('Confirm');
  await expect(unknownGross).toHaveText('Not calculated');
  await expect(unknownAfterTransport).toContainText('Not calculated');
  await expect(confirmation.getByRole('cell').nth(1)).toContainText(/still unknown: current capacity/i);
});


test('prepared inquiry never turns demo price into a buyer claim', async ({ page }) => {
  await page.goto(
    '/places/demo-processor?crop=tomato&kg=300&origin=los-banos&ready=2026-09-24&view=list&lang=en'
  );

  await page.getByRole('button', { name: 'Prepare message' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(/current price, capacity, receiving schedule/i);
  await expect(dialog).not.toContainText(/demo price of/i);
  await expect(dialog).toContainText(/AniWhere does not send automated SMS/i);
});

test('Filipino outlet guidance localizes crop and confirmation questions', async ({ page }) => {
  await page.goto(
    '/places/demo-processor?crop=tomato&kg=300&origin=los-banos&ready=2026-09-24&view=list&lang=fil'
  );

  await expect(page.getByText(/Anong grade at antas ng pagkahinog.*kamatis/i)).toBeVisible();
  await expect(page.getByText(/Anong packaging o uri ng crate/i)).toBeVisible();
  await expect(page.getByText(/Ano ang eksaktong oras ng pagtanggap/i)).toBeVisible();
  await expect(page.getByText(/Uri ng datos:/i)).toBeVisible();

  await page.getByRole('button', { name: 'Ihanda ang mensahe' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(/300 kg na kamatis/i);
  await expect(dialog).toContainText(/kasalukuyang presyo, kapasidad/i);
});


test('demo contact fields are never presented as verified real-world contacts', async ({ page }) => {
  await page.goto(
    '/places/demo-processor?crop=tomato&kg=300&origin=los-banos&ready=2026-09-24&view=list&lang=en'
  );

  await page.getByRole('button', { name: 'Contact details' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Recorded contact field');
  await expect(dialog).toContainText(/demo field, not a verified real-world contact/i);
  await expect(dialog).not.toContainText('Verified public contact');
});


test('outlet dialogs focus safely and return the farmer to the triggering action', async ({ page }) => {
  await page.goto(
    '/places/demo-processor?crop=tomato&kg=300&origin=los-banos&ready=2026-09-24&view=list&lang=en'
  );

  const prepare = page.getByRole('button', { name: 'Prepare message' });
  await prepare.focus();
  await prepare.click();

  const dialog = page.getByRole('dialog', { name: 'Prepare Inquiry Message' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('button[aria-label="Close"]')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(prepare).toBeFocused();
});


test('prepared inquiry reports clipboard failure instead of claiming a copy succeeded', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException('Clipboard blocked', 'NotAllowedError');
        },
      },
    });
  });

  await page.goto(
    '/places/demo-processor?crop=tomato&kg=300&origin=los-banos&ready=2026-09-24&view=list&lang=en'
  );

  await page.getByRole('button', { name: 'Prepare message' }).click();
  await page.getByRole('button', { name: 'Copy message' }).click();

  const dialog = page.getByRole('dialog', { name: 'Prepare Inquiry Message' });
  await expect(dialog.getByRole('status')).toContainText(/could not be copied/i);
  await expect(dialog.getByText('Copied to clipboard!')).toHaveCount(0);
});


test('outlet detail never turns unknown capacity into a full-harvest claim', async ({ page }) => {
  await page.goto(
    '/places/demo-msme-confirm?crop=tomato&kg=300&origin=los-banos&ready=2026-09-24&view=list&lang=en'
  );

  await expect(page.getByText('Contact to confirm').first()).toBeVisible();
  await expect(page.getByText('Confirm first').first()).toBeVisible();
  await expect(page.getByText('Remaining harvest is not known yet')).toBeVisible();
  await expect(page.getByText('Full harvest match')).toHaveCount(0);
  await expect(page.getByText('Recorded Transport Estimate')).toBeVisible();
  await expect(page.getByText(/Demo-record estimate, not an actual hauling quote/i)).toBeVisible();
  await expect(page.getByText(/not profit or guaranteed income/i)).toBeVisible();
});

test('Filipino decision summary uses localized crop and uncertainty language', async ({ page }) => {
  await page.goto(
    '/places/demo-msme-confirm?crop=tomato&kg=300&origin=los-banos&ready=2026-09-24&view=list&lang=fil'
  );

  await expect(page.getByText('300 kg Kamatis')).toBeVisible();
  await expect(page.getByText('Kamatis', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Hindi pa alam ang matitirang ani')).toBeVisible();
  await expect(page.getByText('Nakatalaang Tantiya sa Biyahe')).toBeVisible();
  await expect(page.getByText(/Tantiya sa demo record, hindi aktuwal na quote sa biyahe/i)).toBeVisible();
});


test('no-match outlet detail prioritizes other selling options over outreach', async ({ page }) => {
  await page.goto(
    '/places/demo-organic-shop?crop=tomato&kg=300&origin=los-banos&ready=2026-09-24&view=list&lang=en'
  );

  await expect(page.getByText('Does not match').first()).toBeVisible();
  const alternatives = page.getByRole('link', { name: 'Check other selling options' });
  await expect(alternatives).toBeVisible();
  await expect(page.getByRole('button', { name: 'Prepare message' })).toHaveCount(0);
  await expect(alternatives).toHaveAttribute('href', /crop=tomato/);
  await expect(alternatives).toHaveAttribute('href', /kg=300/);
});
