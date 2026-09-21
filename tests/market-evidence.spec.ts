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
