import type { OutletRouteEstimate } from './routing-matrix';

const memory = new Map<string, OutletRouteEstimate>();
const PREFIX = 'aniwhere:runtime-route:v1:';

export function runtimeRouteCacheKey(
  originMunicipalityId: string,
  lat: number,
  lng: number
): string {
  return `${originMunicipalityId}:${lat.toFixed(6)}:${lng.toFixed(6)}:driving-car`;
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getCachedRuntimeRoute(key: string): OutletRouteEstimate | null {
  const cached = memory.get(key);
  if (cached) return cached;
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(`${PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OutletRouteEstimate;
    if (
      parsed?.source !== 'road' ||
      parsed.routeEvidence !== 'runtime_endpoint' ||
      parsed.provider !== 'openrouteservice'
    ) {
      return null;
    }
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedRuntimeRoute(key: string, route: OutletRouteEstimate): void {
  if (route.source !== 'road' || route.routeEvidence !== 'runtime_endpoint') return;
  memory.set(key, route);
  const store = storage();
  if (!store) return;
  try {
    store.setItem(`${PREFIX}${key}`, JSON.stringify(route));
  } catch {
    // Runtime routing remains optional when session storage is unavailable.
  }
}

export function clearRuntimeRouteCache(): void {
  memory.clear();
  const store = storage();
  if (!store) return;
  try {
    for (let index = store.length - 1; index >= 0; index -= 1) {
      const key = store.key(index);
      if (key?.startsWith(PREFIX)) store.removeItem(key);
    }
  } catch {
    // Best-effort cache clearing only.
  }
}
