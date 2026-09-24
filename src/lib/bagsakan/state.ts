import type { BagsakanDemoState } from './state-types';
import { validBagsakanState } from './state-validation';

export type {
  BagsakanDemoProfile, BagsakanDemoDemand, BagsakanDemoState,
  ProfileValidationErrors, DemandValidationErrors,
} from './state-types';
export { validateProfile, validateDemand, effectiveDemandStatus } from './state-validation';

export const BAGSAKAN_STORAGE_KEY = 'aniwhere:bagsakan:v1';
export const BAGSAKAN_CHANGE_EVENT = 'aniwhere:bagsakan:changed';
export const EMPTY_BAGSAKAN_STATE: BagsakanDemoState = { version: 1, profile: null, demands: [] };
const emptyState = (): BagsakanDemoState => ({ version: 1, profile: null, demands: [] });

export function readBagsakanState(): {
  state: BagsakanDemoState;
  error?: 'corrupt' | 'unavailable';
} {
  if (typeof window === 'undefined') return { state: emptyState() };
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(BAGSAKAN_STORAGE_KEY);
  } catch {
    return { state: emptyState(), error: 'unavailable' };
  }
  if (raw === null) return { state: emptyState() };
  try {
    const state: unknown = JSON.parse(raw);
    return validBagsakanState(state)
      ? { state }
      : { state: emptyState(), error: 'corrupt' };
  } catch {
    return { state: emptyState(), error: 'corrupt' };
  }
}

export function writeBagsakanState(state: BagsakanDemoState): boolean {
  if (typeof window === 'undefined' || !validBagsakanState(state)) return false;
  if (readBagsakanState().error) return false;
  try {
    window.localStorage.setItem(BAGSAKAN_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(BAGSAKAN_CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

/** Explicit recovery action for a user-confirmed discard of unreadable local data. */
export function discardCorruptBagsakanState(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.removeItem(BAGSAKAN_STORAGE_KEY);
    window.dispatchEvent(new Event(BAGSAKAN_CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}
