import type { HarvestQuery, Outlet } from '../domain/types';
import { serializeDiscoverQuery } from '../state/url-state';

/** Local records have no build-time Astro slug, so they use one fixed page. */
export function outletDetailHref(
  outlet: Outlet,
  harvest: HarvestQuery,
  lang: 'en' | 'fil' = 'en',
  view: 'list' | 'map' = 'list'
): string {
  const query = serializeDiscoverQuery(harvest, view, outlet.id, lang);
  return outlet.isLocalBagsakan
    ? `/bagsakan/preview?${query}`
    : `/places/${encodeURIComponent(outlet.slug)}?${query}`;
}
