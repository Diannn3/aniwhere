import type { MarketDataSnapshot, MarketRepository } from './market-repository';
import { DEMO_PLACES } from '../../content/demo-places';
import { DEMO_CAPABILITIES } from '../../content/demo-capabilities';
import { DEMO_OFFERS } from '../../content/demo-offers';
import { DEMO_SOURCES } from '../../content/demo-sources';

export const DEMO_MARKET_SNAPSHOT: MarketDataSnapshot = {
  places: DEMO_PLACES,
  capabilities: DEMO_CAPABILITIES,
  offers: DEMO_OFFERS,
  sources: DEMO_SOURCES,
};

export class DemoMarketRepository implements MarketRepository {
  async getSnapshot(): Promise<MarketDataSnapshot> {
    return DEMO_MARKET_SNAPSHOT;
  }
}
