import { describe, expect, it } from 'vitest';
import { DEMO_MARKET_SNAPSHOT } from './demo-market-repository';
import { composeOutletViewModels } from './outlet-adapter';
import { DEMO_TRANSPORT_ASSUMPTIONS } from '../../content/demo-transport';
import type { MarketDataSnapshot } from './market-repository';

describe('market data adapter', () => {
  it('keeps stable places and buyer offers as separate source records', () => {
    expect(DEMO_MARKET_SNAPSHOT.places.length).toBe(5);
    expect(DEMO_MARKET_SNAPSHOT.offers.length).toBeGreaterThan(5);

    for (const offer of DEMO_MARKET_SNAPSHOT.offers) {
      expect(
        DEMO_MARKET_SNAPSHOT.places.some((place) => place.id === offer.placeId)
      ).toBe(true);
    }
  });

  it('composes the existing frontend outlet view without losing explicit exclusions', () => {
    const outlets = composeOutletViewModels(
      DEMO_MARKET_SNAPSHOT,
      DEMO_TRANSPORT_ASSUMPTIONS
    );

    const organic = outlets.find((outlet) => outlet.id === 'demo-organic-shop')!;
    expect(organic.excludedCrops).toContain('tomato');
    expect(organic.acceptedCrops.eggplant?.maxKg).toBe(100);
    expect(organic.isDemoFixture).toBe(true);
  });

  it('preserves current offer provenance and recorded hauling assumptions', () => {
    const outlets = composeOutletViewModels(
      DEMO_MARKET_SNAPSHOT,
      DEMO_TRANSPORT_ASSUMPTIONS
    );

    const coop = outlets.find((outlet) => outlet.id === 'demo-cooperative')!;
    expect(coop.acceptedCrops.tomato?.pricePerKg).toBe(28);
    expect(coop.acceptedCrops.tomato?.maxKg).toBe(500);
    expect(coop.acceptedCrops.tomato?.defaultTransportExpense).toBe(600);
    expect(coop.acceptedCrops.tomato?.sourceKind).toBe('demo');
    expect(coop.acceptedCrops.tomato?.sourceLabel).toBe('Outlet record');
    expect(coop.acceptedCrops.tomato?.validUntil).toBe('2026-09-30');
  });

  it('does not invent an active offer when an accepted capability has no offer', () => {
    const snapshot: MarketDataSnapshot = {
      sources: DEMO_MARKET_SNAPSHOT.sources,
      places: [DEMO_MARKET_SNAPSHOT.places[0]],
      capabilities: [
        {
          id: 'cap-no-offer',
          placeId: 'demo-cooperative',
          cropKey: 'tomato',
          acceptanceState: 'accepted',
          conditions: [],
          conditionsFil: [],
          verifiedAt: '2026-09-17T08:00:00+08:00',
          sourceId: 'demo-source-market-terms',
        },
      ],
      offers: [],
    };

    const [outlet] = composeOutletViewModels(snapshot);
    expect(outlet.acceptedCrops.tomato?.offerStatus).toBeUndefined();
    expect(outlet.acceptedCrops.tomato?.pricePerKg).toBeUndefined();
    expect(outlet.acceptedCrops.tomato?.maxKg).toBeUndefined();
  });

  it('does not convert explicitly unknown capability evidence into acceptedCrops', () => {
    const snapshot: MarketDataSnapshot = {
      sources: DEMO_MARKET_SNAPSHOT.sources,
      places: [DEMO_MARKET_SNAPSHOT.places[0]],
      capabilities: [
        {
          id: 'cap-unknown',
          placeId: 'demo-cooperative',
          cropKey: 'tomato',
          acceptanceState: 'unknown',
          conditions: [],
          conditionsFil: [],
          verifiedAt: '2026-09-17T08:00:00+08:00',
          sourceId: 'demo-source-market-terms',
        },
      ],
      offers: [],
    };

    const [outlet] = composeOutletViewModels(snapshot);
    expect(outlet.acceptedCrops.tomato).toBeUndefined();
    expect(outlet.excludedCrops).toBeUndefined();
  });
});
