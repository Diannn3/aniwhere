import type { HarvestQuery } from '../domain/types';

export const HARVEST_CONTEXT_EVENT = 'aniwhere:harvest-context';

export function publishHarvestContext(harvest: HarvestQuery) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<HarvestQuery>(HARVEST_CONTEXT_EVENT, { detail: harvest }));
}

export function subscribeHarvestContext(listener: (harvest: HarvestQuery) => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => listener((event as CustomEvent<HarvestQuery>).detail);
  window.addEventListener(HARVEST_CONTEXT_EVENT, handler);
  return () => window.removeEventListener(HARVEST_CONTEXT_EVENT, handler);
}
