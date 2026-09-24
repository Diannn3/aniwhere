import { describe, expect, it } from 'vitest';
import { evaluateFit } from '../domain/match';
import { todayInManila } from '../state/url-state';
import type { BagsakanDemoState } from '../bagsakan/state';
import { composeLocalBagsakanOutlets, LOCAL_BAGSAKAN_SOURCE_LABEL } from './local-bagsakan';

const today = todayInManila();
const timestamp = new Date().toISOString();
const state: BagsakanDemoState = {
  version: 1,
  profile: {
    id: 'profile-1', name: 'Test Bagsakan', municipalityId: 'santa-cruz',
    lat: 14.281, lng: 121.417, locationBasis: 'municipality_center', updatedAt: timestamp,
  },
  demands: [{
    id: 'demand-1', profileId: 'profile-1', cropKey: 'tomato', status: 'active',
    maxKg: 200, validFrom: today, validUntil: today, updatedAt: timestamp,
  }],
};
const query = { crop: 'tomato', quantityKg: 300, originMunicipality: 'santa-cruz', readyDate: today };

describe('local Bagsakan market adapter', () => {
  it('preserves canonical partial and full fit arithmetic through the existing matcher', () => {
    const [outlet] = composeLocalBagsakanOutlets(state);
    expect(outlet.isLocalBagsakan).toBe(true);
    expect(outlet.acceptedCrops.tomato?.sourceKind).toBe('demo');
    expect(outlet.acceptedCrops.tomato?.sourceLabel).toBe(LOCAL_BAGSAKAN_SOURCE_LABEL);
    const partial = evaluateFit(outlet, query);
    expect([partial.status, partial.acceptedKg, partial.remainingKg]).toEqual(['partial', 200, 100]);
    const [larger] = composeLocalBagsakanOutlets({ ...state, demands: [{ ...state.demands[0], maxKg: 500 }] });
    const full = evaluateFit(larger, query);
    expect([full.status, full.acceptedKg, full.remainingKg]).toEqual(['match', 300, 0]);
  });

  it('keeps capacity unknown and hides inactive price and capacity', () => {
    const unknownState = { ...state, demands: [{ ...state.demands[0], maxKg: undefined }] };
    const [unknown] = composeLocalBagsakanOutlets(unknownState);
    expect(evaluateFit(unknown, query).status).toBe('confirm');
    expect(evaluateFit(unknown, query).acceptedKg).toBeNull();
    for (const status of ['draft', 'paused'] as const) {
      const [inactive] = composeLocalBagsakanOutlets({ ...state, demands: [{ ...state.demands[0], status, pricePerKg: 42 }] });
      expect(inactive.acceptedCrops.tomato?.pricePerKg).toBeUndefined();
      expect(inactive.acceptedCrops.tomato?.maxKg).toBeUndefined();
      expect(evaluateFit(inactive, query).status).toBe('confirm');
    }
    const [expired] = composeLocalBagsakanOutlets({ ...state, demands: [{ ...state.demands[0], validFrom: '2020-01-01', validUntil: '2020-01-02', pricePerKg: 42 }] });
    expect(expired.acceptedCrops.tomato?.offerStatus).toBe('expired');
    expect(expired.acceptedCrops.tomato?.pricePerKg).toBeUndefined();
    expect(evaluateFit(expired, query).status).toBe('confirm');
  });

  it('keeps the device-only source label when the farmer asks about another crop', () => {
    const [outlet] = composeLocalBagsakanOutlets(state);
    const result = evaluateFit(outlet, { ...query, crop: 'eggplant' });
    expect(result.status).toBe('confirm');
    expect(result.sourceLabel).toBe(LOCAL_BAGSAKAN_SOURCE_LABEL);
  });

  it('keeps the profile after its first saved need and removes it after the last need', () => {
    expect(composeLocalBagsakanOutlets({ ...state, demands: [] })).toEqual([]);
    expect(composeLocalBagsakanOutlets(state)).toHaveLength(1);
  });
});
