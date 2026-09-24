import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CURRENT_OUTLETS } from './current-market';
import { getClientMarketOutlets, subscribeClientMarketOutlets } from './client-market';
import { BAGSAKAN_STORAGE_KEY, writeBagsakanState, type BagsakanDemoState } from '../bagsakan/state';
import { todayInManila } from '../state/url-state';

class TestWindow extends EventTarget {
  private data = new Map<string, string>();
  localStorage = {
    getItem: (key: string) => this.data.get(key) ?? null,
    setItem: (key: string, value: string) => { this.data.set(key, value); },
    removeItem: (key: string) => { this.data.delete(key); },
  };
}

const stamp = new Date().toISOString();
const today = todayInManila();
const state: BagsakanDemoState = {
  version: 1,
  profile: {
    id: 'profile-1', name: 'Test Bagsakan', municipalityId: 'santa-cruz',
    lat: 14.281, lng: 121.417, locationBasis: 'municipality_center', updatedAt: stamp,
  },
  demands: [{
    id: 'demand-1', profileId: 'profile-1', cropKey: 'tomato', status: 'active',
    maxKg: 200, validFrom: today, validUntil: today, updatedAt: stamp,
  }],
};

describe('client market registry', () => {
  let browser: TestWindow;
  beforeEach(() => { browser = new TestWindow(); vi.stubGlobal('window', browser); });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps fixtures intact and notifies same-tab and cross-tab changes', () => {
    const initialLength = CURRENT_OUTLETS.length;
    const observed: number[] = [];
    const unsubscribe = subscribeClientMarketOutlets((outlets) => observed.push(outlets.length));
    expect(observed).toEqual([initialLength]);
    expect(writeBagsakanState(state)).toBe(true);
    expect(observed.at(-1)).toBe(initialLength + 1);
    expect(CURRENT_OUTLETS).toHaveLength(initialLength);
    browser.localStorage.removeItem(BAGSAKAN_STORAGE_KEY);
    const storageEvent = Object.assign(new Event('storage'), { key: BAGSAKAN_STORAGE_KEY });
    browser.dispatchEvent(storageEvent);
    expect(observed.at(-1)).toBe(initialLength);
    unsubscribe();
    expect(getClientMarketOutlets()).toHaveLength(initialLength);
  });

  it('fails closed to fixture-only view for malformed local data', () => {
    browser.localStorage.setItem(BAGSAKAN_STORAGE_KEY, '{bad-json');
    expect(getClientMarketOutlets()).toHaveLength(CURRENT_OUTLETS.length);
  });

  it('recomputes a recorded active need at Manila midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T15:59:50Z'));
    const boundaryState: BagsakanDemoState = {
      ...state,
      demands: [{ ...state.demands[0], validFrom: '2026-09-24', validUntil: '2026-09-24' }],
    };
    expect(writeBagsakanState(boundaryState)).toBe(true);
    const statuses: (string | undefined)[] = [];
    const unsubscribe = subscribeClientMarketOutlets((outlets) =>
      statuses.push(outlets.find((item) => item.isLocalBagsakan)?.acceptedCrops.tomato?.offerStatus)
    );
    expect(statuses.at(-1)).toBe('active');
    vi.advanceTimersByTime(20_000);
    expect(statuses.at(-1)).toBe('expired');
    unsubscribe();
    vi.useRealTimers();
  });
});
