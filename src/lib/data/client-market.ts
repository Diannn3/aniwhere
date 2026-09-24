import { CURRENT_OUTLETS } from './current-market';
import type { Outlet } from '../domain/types';
import { BAGSAKAN_CHANGE_EVENT, BAGSAKAN_STORAGE_KEY, readBagsakanState } from '../bagsakan/state';
import { composeLocalBagsakanOutlets } from './local-bagsakan';
import { todayInManila } from '../state/url-state';

type MarketSubscriber = (outlets: Outlet[]) => void;
const subscribers = new Set<MarketSubscriber>();
let midnightTimer: ReturnType<typeof setTimeout> | undefined;

/** Read fresh on every call; server rendering never reads device storage. */
export function getClientMarketOutlets(): Outlet[] {
  if (typeof window === 'undefined') return CURRENT_OUTLETS;
  const { state, error } = readBagsakanState();
  return error ? [...CURRENT_OUTLETS] : [...CURRENT_OUTLETS, ...composeLocalBagsakanOutlets(state)];
}

export function refreshClientMarketOutlets(): void {
  if (typeof window === 'undefined') return;
  const outlets = getClientMarketOutlets();
  for (const callback of subscribers) callback(outlets);
}

function onStorage(event: StorageEvent): void {
  if (event.key === BAGSAKAN_STORAGE_KEY || event.key === null) refreshClientMarketOutlets();
}

function scheduleManilaMidnight(): void {
  if (midnightTimer !== undefined) clearTimeout(midnightTimer);
  const midnightUtc = Date.parse(`${todayInManila()}T16:00:00Z`);
  midnightTimer = setTimeout(() => {
    refreshClientMarketOutlets();
    scheduleManilaMidnight();
  }, Math.max(1000, midnightUtc - Date.now() + 100));
}

/** Subscribe to same-tab edits, cross-tab storage, focus, and Manila date rollover. */
export function subscribeClientMarketOutlets(callback: MarketSubscriber): () => void {
  if (typeof window === 'undefined') return () => undefined;
  if (subscribers.size === 0) {
    window.addEventListener(BAGSAKAN_CHANGE_EVENT, refreshClientMarketOutlets);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refreshClientMarketOutlets);
    scheduleManilaMidnight();
  }
  subscribers.add(callback);
  callback(getClientMarketOutlets());
  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      window.removeEventListener(BAGSAKAN_CHANGE_EVENT, refreshClientMarketOutlets);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refreshClientMarketOutlets);
      if (midnightTimer !== undefined) clearTimeout(midnightTimer);
      midnightTimer = undefined;
    }
  };
}
