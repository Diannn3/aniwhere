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
