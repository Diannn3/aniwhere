import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BAGSAKAN_STORAGE_KEY, discardCorruptBagsakanState, effectiveDemandStatus,
  readBagsakanState, validateDemand, validateProfile, writeBagsakanState,
  type BagsakanDemoDemand, type BagsakanDemoProfile, type BagsakanDemoState,
} from './state';
import { todayInManila } from '../state/url-state';

const today = todayInManila();
const stamp = new Date().toISOString();
const profile: BagsakanDemoProfile = {
  id: 'profile-1', name: 'Test Bagsakan', municipalityId: 'santa-cruz',
  lat: 14.281, lng: 121.417, locationBasis: 'municipality_center', updatedAt: stamp,
};
const demand: BagsakanDemoDemand = {
  id: 'demand-1', profileId: profile.id, cropKey: 'tomato', status: 'active',
  maxKg: 200, validFrom: today, validUntil: today, updatedAt: stamp,
};
const state: BagsakanDemoState = { version: 1, profile, demands: [demand] };

class TestWindow extends EventTarget {
  private data = new Map<string, string>();
  localStorage = {
    getItem: (key: string) => this.data.get(key) ?? null,
    setItem: (key: string, value: string) => { this.data.set(key, value); },
    removeItem: (key: string) => { this.data.delete(key); },
  };
}

describe('device-local Bagsakan state', () => {
  let browser: TestWindow;
  beforeEach(() => { browser = new TestWindow(); vi.stubGlobal('window', browser); });
  afterEach(() => vi.unstubAllGlobals());

  it('validates municipality center, maximum, dates, and duplicate crop state', () => {
    expect(validateProfile(profile)).toEqual({});
    expect(validateProfile({ ...profile, lat: 14.22 }).locationBasis).toBeTruthy();
    expect(validateProfile({ ...profile, lng: Infinity }).lng).toBeTruthy();
    expect(validateDemand(demand)).toEqual({});
    expect(validateDemand({ ...demand, maxKg: 0 }).maxKg).toBeTruthy();
    expect(validateDemand({ ...demand, minKg: 201 }).minKg).toBeTruthy();
    expect(validateDemand({ ...demand, validUntil: '2026-02-30' }).validUntil).toBeTruthy();
    expect(validateDemand({ ...demand, receivingStartTime: '08:00' }).receivingEndTime).toBeTruthy();
    expect(writeBagsakanState({ ...state, demands: [demand, { ...demand, id: 'demand-2' }] })).toBe(false);
  });

  it('requires a current window for activation and derives expired/future status safely', () => {
    expect(validateDemand({ ...demand, validFrom: '2099-01-01', validUntil: '2099-01-02' }).status).toBeTruthy();
    expect(effectiveDemandStatus({ ...demand, validFrom: '2099-01-01', validUntil: '2099-01-02' })).toBe('draft');
    expect(effectiveDemandStatus({ ...demand, validFrom: '2020-01-01', validUntil: '2020-01-02' })).toBe('expired');
    expect(effectiveDemandStatus({ ...demand, status: 'paused' })).toBe('paused');
  });

  it('persists atomically and refuses to overwrite malformed browser data', () => {
    expect(writeBagsakanState(state)).toBe(true);
    expect(readBagsakanState()).toEqual({ state });
    browser.localStorage.setItem(BAGSAKAN_STORAGE_KEY, '{bad-json');
    expect(readBagsakanState().error).toBe('corrupt');
    expect(writeBagsakanState(state)).toBe(false);
    expect(browser.localStorage.getItem(BAGSAKAN_STORAGE_KEY)).toBe('{bad-json');
    expect(discardCorruptBagsakanState()).toBe(true);
    expect(writeBagsakanState(state)).toBe(true);
  });

  it('treats a malformed shape as corrupt while retaining an expired active record', () => {
    browser.localStorage.setItem(BAGSAKAN_STORAGE_KEY, JSON.stringify({ ...state, demands: [{ ...demand, maxKg: '200' }] }));
    expect(readBagsakanState().error).toBe('corrupt');
    browser.localStorage.setItem(BAGSAKAN_STORAGE_KEY, JSON.stringify({ ...state, demands: [{ ...demand, validFrom: '2020-01-01', validUntil: '2020-01-02' }] }));
    expect(readBagsakanState().error).toBeUndefined();
  });

  it('reports inaccessible browser storage separately from corrupt content', () => {
    vi.spyOn(browser.localStorage, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readBagsakanState().error).toBe('unavailable');
    expect(writeBagsakanState(state)).toBe(false);
  });
});
