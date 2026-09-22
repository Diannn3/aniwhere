export const ANI_TRANSPORT_EVENT = 'aniwhere:transport-update';

export interface AniTransportUpdate {
  outletId: string;
  amount: number;
}

export function publishTransportUpdate(update: AniTransportUpdate) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AniTransportUpdate>(ANI_TRANSPORT_EVENT, { detail: update }));
}

export function subscribeTransportUpdate(listener: (update: AniTransportUpdate) => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => listener((event as CustomEvent<AniTransportUpdate>).detail);
  window.addEventListener(ANI_TRANSPORT_EVENT, handler);
  return () => window.removeEventListener(ANI_TRANSPORT_EVENT, handler);
}
