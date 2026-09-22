// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { getSavedOutletIds, toggleSavedOutlet } from './saved-outlets';

const STORAGE_KEY = 'aniwhere_saved_outlets';

describe('saved outlet persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('ignores malformed, duplicate, and unsafe persisted ids', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(['demo-market', 'demo-market', '<script>', 'UPPER_CASE', 'demo-processor'])
    );

    expect(getSavedOutletIds()).toEqual(['demo-market', 'demo-processor']);
  });

  it('fails closed when persisted saved state is not an array', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 'demo-market' }));
    expect(getSavedOutletIds()).toEqual([]);
  });

  it('does not persist malformed ids through toggle', () => {
    expect(toggleSavedOutlet('<script>')).toBe(false);
    expect(getSavedOutletIds()).toEqual([]);
  });
});
