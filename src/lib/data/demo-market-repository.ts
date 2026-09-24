import type { MarketDataSnapshot, MarketRepository } from './market-repository';
import { DEMO_PLACES } from '../../content/demo-places';
import { DEMO_CAPABILITIES } from '../../content/demo-capabilities';
import { DEMO_OFFERS } from '../../content/demo-offers';
import { DEMO_SOURCES } from '../../content/demo-sources';
import { todayInManila } from '../state/url-state';
// Keep fictional buying windows usable offline without treating them as live evidence.
// Shift every dated demo record together so validity and provenance stay consistent.
const dayOffset = Math.round(
  (Date.parse(`${todayInManila()}T00:00:00Z`) - Date.parse('2026-09-18T00:00:00Z')) / 86_400_000
);

function shifted(value: string | undefined): string | undefined {
  if (!value) return value;
  const date = new Date(value.slice(0, 10) + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10) + value.slice(10);
}

export const DEMO_MARKET_SNAPSHOT: MarketDataSnapshot = {
  places: DEMO_PLACES.map((place) => ({ ...place, lastReviewedAt: shifted(place.lastReviewedAt) })),
  capabilities: DEMO_CAPABILITIES.map((capability) => ({
    ...capability,
    verifiedAt: shifted(capability.verifiedAt),
  })),
  offers: DEMO_OFFERS.map((offer) => ({
    ...offer,
    validFrom: shifted(offer.validFrom)!,
    validUntil: shifted(offer.validUntil)!,
    updatedAt: shifted(offer.updatedAt)!,
  })),
  sources: DEMO_SOURCES.map((source) => ({ ...source, observedAt: shifted(source.observedAt) })),
};

export class DemoMarketRepository implements MarketRepository {
  async getSnapshot(): Promise<MarketDataSnapshot> {
    return DEMO_MARKET_SNAPSHOT;
  }
}
