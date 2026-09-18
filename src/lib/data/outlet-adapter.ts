import type {
  BuyerOfferRecord,
  CropCondition,
  Outlet,
  PlaceCropCapabilityRecord,
  SourceRecord,
} from '../domain/types';
import type { MarketDataSnapshot } from './market-repository';

export interface TransportAssumption {
  placeId: string;
  amountPhp: number;
  label?: string;
}

function chooseOffer(offers: BuyerOfferRecord[]): BuyerOfferRecord | undefined {
  if (offers.length === 0) return undefined;

  return [...offers].sort((a, b) => {
    const activeDelta = Number(b.status === 'active') - Number(a.status === 'active');
    if (activeDelta !== 0) return activeDelta;
    return b.updatedAt.localeCompare(a.updatedAt);
  })[0];
}

function findSource(sourceId: string | undefined, sources: SourceRecord[]): SourceRecord | undefined {
  if (!sourceId) return undefined;
  return sources.find((source) => source.id === sourceId);
}

function formatSampleDate(value: string | undefined): string {
  if (!value) return 'Unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function buildCondition(
  capability: PlaceCropCapabilityRecord,
  offers: BuyerOfferRecord[],
  sources: SourceRecord[],
  transport?: TransportAssumption
): CropCondition {
  const offer = chooseOffer(offers);
  const source = findSource(offer?.sourceId ?? capability.sourceId, sources);

  return {
    minKg: offer?.minKg ?? capability.minKg,
    maxKg: offer?.maxKg ?? capability.maxKg,
    pricePerKg: offer?.pricePerKg,
    defaultTransportExpense: transport?.amountPhp,
    conditions: capability.conditions,
    conditionsFil: capability.conditionsFil,
    isActive: offer ? offer.status === 'active' : undefined,
    offerStatus: offer?.status,
    validFrom: offer?.validFrom,
    validUntil: offer?.validUntil,
    receivingWeekdays: offer?.receivingWeekdays,
    sourceKind: source?.kind ?? 'unknown',
    sourceLabel: source?.label,
    lastUpdatedAt: offer?.updatedAt ?? capability.verifiedAt ?? source?.observedAt,
  };
}

/**
 * Adapter for the current frontend Outlet contract.
 *
 * Stable place facts, crop capability evidence, and time-sensitive offers remain
 * separate in source data. This function only composes them at the presentation
 * boundary so existing components do not need to own market-data semantics.
 */
export function composeOutletViewModels(
  snapshot: MarketDataSnapshot,
  transportAssumptions: TransportAssumption[] = []
): Outlet[] {
  const sourceById = new Map(snapshot.sources.map((source) => [source.id, source]));
  const transportByPlace = new Map(
    transportAssumptions.map((item) => [item.placeId, item])
  );

  return snapshot.places
    .filter((place) => place.publicStatus !== 'archived')
    .map((place) => {
      const capabilities = snapshot.capabilities.filter(
        (capability) => capability.placeId === place.id
      );

      const excludedCrops = capabilities
        .filter((capability) => capability.acceptanceState === 'excluded')
        .map((capability) => capability.cropKey);

      const acceptedCrops: Outlet['acceptedCrops'] = {};

      for (const capability of capabilities) {
        if (capability.acceptanceState !== 'accepted') continue;

        const offers = snapshot.offers.filter(
          (offer) =>
            offer.placeId === place.id &&
            offer.cropKey === capability.cropKey
        );

        acceptedCrops[capability.cropKey] = buildCondition(
          capability,
          offers,
          snapshot.sources,
          transportByPlace.get(place.id)
        );
      }

      const placeSources = place.sourceIds
        .map((sourceId) => sourceById.get(sourceId))
        .filter((source): source is SourceRecord => Boolean(source));

      const latestOffer = [...snapshot.offers]
        .filter((offer) => offer.placeId === place.id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

      const sampleDate =
        latestOffer?.updatedAt ??
        place.lastReviewedAt ??
        placeSources.map((source) => source.observedAt).find(Boolean);

      return {
        id: place.id,
        slug: place.slug,
        name: place.name,
        category: place.category,
        municipality: place.municipality,
        lat: place.lat,
        lng: place.lng,
        description: place.description ?? '',
        descriptionFil: place.descriptionFil ?? '',
        sampleOfferDate: formatSampleDate(sampleDate),
        acceptedCrops,
        excludedCrops: excludedCrops.length > 0 ? excludedCrops : undefined,
        isDemoFixture: placeSources.some((source) => source.kind === 'demo'),
      };
    });
}
