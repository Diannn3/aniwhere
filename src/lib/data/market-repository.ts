import type {
  BuyerOfferRecord,
  PlaceCropCapabilityRecord,
  PlaceRecord,
  SourceRecord,
} from '../domain/types';

export interface MarketDataSnapshot {
  places: PlaceRecord[];
  capabilities: PlaceCropCapabilityRecord[];
  offers: BuyerOfferRecord[];
  sources: SourceRecord[];
}

export interface MarketRepository {
  getSnapshot(): Promise<MarketDataSnapshot>;
}
