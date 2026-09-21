import { isOutletSaved, toggleSavedOutlet } from '../state/saved-outlets';
import { safeStorage } from '../state/storage';
import { serializeDiscoverQuery } from '../state/url-state';
import type { HarvestQuery } from '../domain/types';
import { publishHarvestContext } from './harvest-sync';
import type { AniToolRequest, AniToolResult } from './types';

export class AniActionExecutor {
  apply(request: AniToolRequest, result: AniToolResult, currentHarvest: HarvestQuery, lang: 'en' | 'fil') {
    if (!result.ok || typeof window === 'undefined') return;

    if (request.name === 'set_harvest_context') {
      const harvest = (result.data as { harvest?: HarvestQuery } | undefined)?.harvest;
      if (!harvest) return;
      publishHarvestContext(harvest);
      const view = new URLSearchParams(window.location.search).get('view') === 'map' ? 'map' : 'list';
      const query = serializeDiscoverQuery(harvest, view, undefined, lang);
      window.history.replaceState({}, '', `${window.location.pathname}?${query}`);
      return;
    }

    if (request.name === 'save_outlet') {
      const outletId = (result.data as { outletId?: string } | undefined)?.outletId;
      if (outletId && !isOutletSaved(outletId)) toggleSavedOutlet(outletId);
      return;
    }

    if (request.name === 'compare_outlets') {
      const ids = Array.isArray(request.args.outletIds)
        ? request.args.outletIds.filter((id): id is string => typeof id === 'string').slice(0, 3)
        : [];
      if (!ids.length) return;
      safeStorage.setItem('aniwhere_compare_ids', ids);
      const query = serializeDiscoverQuery(currentHarvest, 'list', undefined, lang);
      window.location.assign(`/compare?places=${encodeURIComponent(ids.join(','))}&${query}`);
      return;
    }

    if (request.name === 'navigate_to') {
      const path = (result.data as { path?: string } | undefined)?.path;
      if (!path) return;
      const hasHarvest = path === '/discover' || path === '/compare' || path.startsWith('/places/');
      const query = hasHarvest ? serializeDiscoverQuery(currentHarvest, 'list', undefined, lang) : (lang === 'fil' ? 'lang=fil' : '');
      window.location.assign(query ? `${path}?${query}` : path);
    }
  }
}
