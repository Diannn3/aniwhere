import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
import type { MarketDataSnapshot } from './market-repository';
import { composeOutletViewModels } from './outlet-adapter';
import type { BuyerOfferRecord, Outlet, StructuredRequirement } from '../domain/types';
import type { BagsakanDemoDemand, BagsakanDemoProfile, BagsakanDemoState } from '../bagsakan/state';
import { effectiveDemandStatus } from '../bagsakan/state';
import { todayInManila } from '../state/url-state';

export const LOCAL_BAGSAKAN_SOURCE_LABEL = 'Demo bagsakan entry — this device';

export function localBagsakanPlaceId(profile: BagsakanDemoProfile): string {
  return `local-bagsakan-${profile.id}`;
}

function requirementsFor(demand: BagsakanDemoDemand): StructuredRequirement[] {
  const fields = [
    { field: 'variety', label: 'Variety', labelFil: 'Barayti' },
    { field: 'grade', label: 'Grade', labelFil: 'Klase/grade' },
    { field: 'packaging', label: 'Packaging', labelFil: 'Packaging' },
  ] as const;
  return fields.flatMap(({ field, label, labelFil }) => {
    const value = demand[field];
    return value?.trim() ? [{ field, acceptedValues: [value], label, labelFil }] : [];
  });
}

function conditionsFor(demand: BagsakanDemoDemand): { en: string[]; fil: string[] } {
  const en: string[] = [];
  const fil: string[] = [];
  if (demand.receivingStartTime && demand.receivingEndTime) {
    en.push(`Receiving hours: ${demand.receivingStartTime}–${demand.receivingEndTime}. Confirm before travel.`);
    fil.push(`Oras ng pagtanggap: ${demand.receivingStartTime}–${demand.receivingEndTime}. Kumpirmahin bago bumiyahe.`);
  }
  if (demand.notes?.trim()) {
    en.push(demand.notes);
    fil.push(demand.notes);
  }
  return { en, fil };
}

/** Translate device-local profile and needs through the same market adapter as demo fixtures. */
export function composeLocalBagsakanOutlets(
  state: BagsakanDemoState,
  today = todayInManila()
): Outlet[] {
  const profile = state.profile;
  if (!profile || state.demands.length === 0) return [];
  const placeId = localBagsakanPlaceId(profile);
  const sourceId = `${placeId}-source`;
  const municipality = LAGUNA_MUNICIPALITIES.find((item) => item.id === profile.municipalityId);
  if (!municipality) return [];
  const demands = state.demands.filter((demand) => demand.profileId === profile.id);
  if (demands.length === 0) return [];

  const offers: BuyerOfferRecord[] = demands.map((demand) => {
    const status = effectiveDemandStatus(demand, today);
    const active = status === 'active';
    return {
      id: demand.id,
      placeId,
      cropKey: demand.cropKey,
      status,
      maxKg: active ? demand.maxKg : undefined,
      minKg: active ? demand.minKg : undefined,
      pricePerKg: active ? demand.pricePerKg : undefined,
      validFrom: demand.validFrom,
      validUntil: demand.validUntil,
      receivingWeekdays: demand.receivingWeekdays,
      receivingStartTime: demand.receivingStartTime,
      receivingEndTime: demand.receivingEndTime,
      variety: demand.variety,
      grade: demand.grade,
      packaging: demand.packaging,
      notes: demand.notes,
      requirements: active ? requirementsFor(demand) : undefined,
      updatedAt: demand.updatedAt,
      sourceId,
    };
  });

  const snapshot: MarketDataSnapshot = {
    places: [{
      id: placeId,
      slug: placeId,
      name: profile.name,
      category: 'market',
      municipality: municipality.name.replace(/, Laguna$/, ''),
      lat: profile.lat,
      lng: profile.lng,
      description: 'Device-local Bagsakan demo profile. Confirm terms before travel.',
      descriptionFil: 'Demo Bagsakan profile sa device na ito. Kumpirmahin ang kondisyon bago bumiyahe.',
      publicStatus: 'needs_review',
      sourceIds: [sourceId],
    }],
    capabilities: demands.map((demand) => {
      const conditions = conditionsFor(demand);
      return {
        id: `${demand.id}-capability`,
        placeId,
        cropKey: demand.cropKey,
        acceptanceState: 'accepted' as const,
        // No capability maxKg: unknown current capacity must never inherit a limit.
        conditions: conditions.en,
        conditionsFil: conditions.fil,
        sourceId,
      };
    }),
    offers,
    sources: [{ id: sourceId, kind: 'demo', label: LOCAL_BAGSAKAN_SOURCE_LABEL }],
  };
  return composeOutletViewModels(snapshot).map((outlet) => ({
    ...outlet,
    sourceLabel: LOCAL_BAGSAKAN_SOURCE_LABEL,
    isLocalBagsakan: true,
    localLocationBasis: profile.locationBasis,
  }));
}
