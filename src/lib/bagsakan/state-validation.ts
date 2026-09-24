import type { CropKey } from '../domain/types';
import { isValidIsoDate } from '../domain/validation';
import { todayInManila } from '../state/url-state';
import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
import { LAGUNA_MAP_BOUNDS } from '../map/map-config';
import type {
  BagsakanDemoDemand, BagsakanDemoProfile, BagsakanDemoState,
  DemandValidationErrors, ProfileValidationErrors,
} from './state-types';

const cropKeys = new Set<CropKey>(['tomato', 'eggplant', 'calamansi', 'banana', 'papaya', 'pechay', 'sitaw', 'other']);
const idValid = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-z0-9-]{1,80}$/.test(value);
const timestampValid = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value)) && /(?:Z|[+-]\d\d:\d\d)$/.test(value);
const optionalTextValid = (value: unknown, max = 500) =>
  value === undefined || (typeof value === 'string' && value.length <= max);
const optionalNumberValid = (value: unknown, zeroAllowed = false) =>
  value === undefined || (typeof value === 'number' && Number.isFinite(value) && (zeroAllowed ? value >= 0 : value > 0));
const timeValid = (value: unknown) =>
  value === undefined || (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value));

export function validateProfile(profile: Partial<BagsakanDemoProfile>): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};
  if (!idValid(profile.id)) errors.id = 'A valid profile ID is required.';
  if (typeof profile.name !== 'string' || !profile.name.trim() || profile.name.length > 100)
    errors.name = 'Enter a Bagsakan name of up to 100 characters.';
  const municipality = LAGUNA_MUNICIPALITIES.find((item) => item.id === profile.municipalityId);
  if (!municipality) errors.municipalityId = 'Choose a listed Laguna municipality.';
  const [[west, south], [east, north]] = LAGUNA_MAP_BOUNDS;
  if (typeof profile.lat !== 'number' || !Number.isFinite(profile.lat) || profile.lat < south || profile.lat > north)
    errors.lat = 'Enter a latitude inside the Laguna map.';
  if (typeof profile.lng !== 'number' || !Number.isFinite(profile.lng) || profile.lng < west || profile.lng > east)
    errors.lng = 'Enter a longitude inside the Laguna map.';
  if (profile.locationBasis !== 'municipality_center' && profile.locationBasis !== 'exact_pin')
    errors.locationBasis = 'Choose a location basis.';
  if (profile.locationBasis === 'municipality_center' && municipality &&
    (profile.lat !== municipality.lat || profile.lng !== municipality.lng))
    errors.locationBasis = 'Reset coordinates to the selected municipality center.';
  if (!timestampValid(profile.updatedAt)) errors.updatedAt = 'A valid update time is required.';
  return errors;
}

export function validateDemand(
  demand: Partial<BagsakanDemoDemand>,
  today = todayInManila(),
  requireCurrentActive = true
): DemandValidationErrors {
  const errors: DemandValidationErrors = {};
  if (!idValid(demand.id)) errors.id = 'A valid need ID is required.';
  if (!idValid(demand.profileId)) errors.profileId = 'A valid Bagsakan profile is required.';
  if (!cropKeys.has(demand.cropKey as CropKey)) errors.cropKey = 'Choose a crop.';
  if (demand.cropKey === 'other' && (!demand.customCropLabel?.trim() || demand.customCropLabel.length > 80))
    errors.customCropLabel = 'Name the other crop in up to 80 characters.';
  else if (!optionalTextValid(demand.customCropLabel, 80)) errors.customCropLabel = 'Use up to 80 characters.';
  if (!optionalNumberValid(demand.maxKg)) errors.maxKg = 'Enter a positive capacity or leave it unknown.';
  if (!optionalNumberValid(demand.minKg, true)) errors.minKg = 'Minimum quantity cannot be negative.';
  if (typeof demand.minKg === 'number' && typeof demand.maxKg === 'number' && demand.minKg > demand.maxKg)
    errors.minKg = 'Minimum quantity cannot exceed capacity.';
  if (!optionalNumberValid(demand.pricePerKg)) errors.pricePerKg = 'Price must be positive or left blank.';
  if (!['draft', 'active', 'paused'].includes(demand.status ?? '')) errors.status = 'Choose a valid need status.';
  if (!isValidIsoDate(demand.validFrom)) errors.validFrom = 'Enter a valid start date.';
  if (!isValidIsoDate(demand.validUntil)) errors.validUntil = 'Enter a valid end date.';
  if (isValidIsoDate(demand.validFrom) && isValidIsoDate(demand.validUntil) && demand.validFrom! > demand.validUntil!)
    errors.validUntil = 'End date must be on or after the start date.';
  if (requireCurrentActive && demand.status === 'active' && isValidIsoDate(demand.validFrom) && isValidIsoDate(demand.validUntil) &&
    (demand.validFrom! > today || demand.validUntil! < today))
    errors.status = 'Activate only while this buying window includes today.';
  if (demand.receivingWeekdays !== undefined &&
    (!Array.isArray(demand.receivingWeekdays) || demand.receivingWeekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
      new Set(demand.receivingWeekdays).size !== demand.receivingWeekdays.length))
    errors.receivingWeekdays = 'Choose unique weekdays from Sunday through Saturday.';
  if (!timeValid(demand.receivingStartTime)) errors.receivingStartTime = 'Use a 24-hour HH:MM time.';
  if (!timeValid(demand.receivingEndTime)) errors.receivingEndTime = 'Use a 24-hour HH:MM time.';
  if (Boolean(demand.receivingStartTime) !== Boolean(demand.receivingEndTime))
    errors.receivingEndTime = 'Enter both receiving times or leave both blank.';
  if (demand.receivingStartTime && demand.receivingEndTime && demand.receivingStartTime >= demand.receivingEndTime)
    errors.receivingEndTime = 'End time must be after start time.';
  for (const field of ['variety', 'grade', 'packaging', 'notes'] as const)
    if (!optionalTextValid(demand[field])) errors[field] = 'Use up to 500 characters.';
  if (!timestampValid(demand.updatedAt)) errors.updatedAt = 'A valid update time is required.';
  return errors;
}

export function effectiveDemandStatus(
  demand: BagsakanDemoDemand,
  today = todayInManila()
): 'draft' | 'active' | 'paused' | 'expired' {
  if (!isValidIsoDate(demand.validFrom) || !isValidIsoDate(demand.validUntil) || demand.validFrom > demand.validUntil)
    return 'draft';
  if (demand.validUntil < today) return 'expired';
  if (demand.validFrom > today) return 'draft';
  return demand.status;
}

export function validBagsakanState(value: unknown): value is BagsakanDemoState {
  if (!value || typeof value !== 'object') return false;
  const state = value as BagsakanDemoState;
  if (state.version !== 1 || !Array.isArray(state.demands)) return false;
  if (state.profile !== null && (!state.profile || Object.keys(validateProfile(state.profile)).length > 0)) return false;
  if (!state.profile && state.demands.length > 0) return false;
  const crops = new Set<CropKey>();
  const ids = new Set<string>();
  for (const demand of state.demands) {
    if (!demand || Object.keys(validateDemand(demand, todayInManila(), false)).length > 0 ||
      demand.profileId !== state.profile?.id || crops.has(demand.cropKey) || ids.has(demand.id)) return false;
    crops.add(demand.cropKey);
    ids.add(demand.id);
  }
  return true;
}
