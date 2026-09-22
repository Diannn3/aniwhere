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


export const HARVEST_DRAFT_VALIDITY_EVENT = 'aniwhere:harvest-draft-validity';

export function publishHarvestDraftValidity(isValid: boolean) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<boolean>(HARVEST_DRAFT_VALIDITY_EVENT, { detail: isValid }));
}

export function subscribeHarvestDraftValidity(listener: (isValid: boolean) => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => listener(Boolean((event as CustomEvent<boolean>).detail));
  window.addEventListener(HARVEST_DRAFT_VALIDITY_EVENT, handler);
  return () => window.removeEventListener(HARVEST_DRAFT_VALIDITY_EVENT, handler);
}
