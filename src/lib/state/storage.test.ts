import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeStorage } from './storage';
import { getSavedOutletIds, toggleSavedOutlet } from './saved-outlets';

afterEach(() => vi.unstubAllGlobals());

describe('local state recovery', () => {
  it('ignores malformed saved outlet data', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => '{"bad":true}',
      },
    });
    expect(getSavedOutletIds()).toEqual([]);
  });

  it('keeps useful work for the tab but reports blocked persistence', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => { throw new Error('blocked'); },
        setItem: () => { throw new Error('blocked'); },
        removeItem: () => { throw new Error('blocked'); },
      },
    });

    const result = toggleSavedOutlet('test-blocked-storage');
    expect(result).toEqual({ saved: true, persisted: false });
    expect(getSavedOutletIds()).toContain('test-blocked-storage');
    expect(safeStorage.removeItem('test-blocked-storage')).toBe(false);
  });

});
