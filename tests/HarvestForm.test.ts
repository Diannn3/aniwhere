// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import type { Component } from 'svelte';
import { describe, expect, it } from 'vitest';
import HarvestForm from '../src/components/harvest/HarvestForm.svelte';

const TestHarvestForm = HarvestForm as unknown as Component<{ initialLang?: 'en' | 'fil' }>;

describe('HarvestForm', () => {
  it('moves from its invalid-submission summary to the quantity needing correction', async () => {
    render(TestHarvestForm, { props: { initialLang: 'en' } });

    const quantity = screen.getByLabelText(/quantity/i);
    await fireEvent.input(quantity, { target: { value: '0' } });
    await fireEvent.click(screen.getByRole('button', { name: /find places/i }));

    const summary = screen.getByRole('alert');
    expect(summary.textContent).toMatch(/valid quantity greater than 0 kg/i);
    await waitFor(() => expect(document.activeElement).toBe(summary));

    await fireEvent.click(screen.getByRole('button', { name: /quantity: enter a valid quantity/i }));
    await waitFor(() => expect(document.activeElement).toBe(quantity));
  });
});
