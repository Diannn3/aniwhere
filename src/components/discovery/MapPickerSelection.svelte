<script lang="ts">
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { outletDetailHref } from '../../lib/data/outlet-links';
  import { acceptedQuantity, routeSummary, type PickerItem } from '../../lib/map/picker';
  import type { HarvestQuery } from '../../lib/domain/types';
  import type { OutletRouteEstimate } from '../../lib/routing/routing-matrix';

  let {
    item,
    harvest,
    lang,
    routeOverride = undefined,
    routeRequestState = 'idle',
  }: {
    item: PickerItem;
    harvest: HarvestQuery;
    lang: 'en' | 'fil';
    routeOverride?: OutletRouteEstimate;
    routeRequestState?: 'idle' | 'loading' | 'ready' | 'unavailable' | 'not_configured';
  } = $props();
  const originName = $derived(
    LAGUNA_MUNICIPALITIES.find((municipality) => municipality.id === harvest.originMunicipality)?.name.split(',')[0]
      || LAGUNA_MUNICIPALITIES[0].name.split(',')[0]
  );
  const effectiveRoute = $derived(routeOverride ?? item.route);
  const displayItem = $derived({ ...item, route: effectiveRoute });
  const hasRoadRoute = $derived(effectiveRoute.source === 'road' && typeof effectiveRoute.roadDistanceKm === 'number');
</script>

<section class="map-picker__selection" aria-live="polite" aria-label={lang === 'fil' ? 'Napiling outlet' : 'Selected outlet'}>
  <p class={`map-picker__status status-${item.fit.status}`}>{lang === 'fil' ? item.fit.statusLabelFil : item.fit.statusLabel}</p>
  <h3>{item.outlet.name}</h3>
  <p class="map-picker__route">
    {routeRequestState === 'loading' && item.outlet.isLocalBagsakan && !hasRoadRoute
      ? (lang === 'fil'
          ? `Kinukuha ang road route · ${effectiveRoute.straightLineDistanceKm.toFixed(1)} km tuwid muna`
          : `Fetching road route · ${effectiveRoute.straightLineDistanceKm.toFixed(1)} km straight-line for now`)
      : routeRequestState === 'not_configured' && item.outlet.isLocalBagsakan && !hasRoadRoute
        ? (lang === 'fil'
            ? `Hindi naka-configure ang live road routing · ${effectiveRoute.straightLineDistanceKm.toFixed(1)} km tuwid muna`
            : `Live road routing not configured · ${effectiveRoute.straightLineDistanceKm.toFixed(1)} km straight-line for now`)
        : routeRequestState === 'unavailable' && item.outlet.isLocalBagsakan && !hasRoadRoute
          ? (lang === 'fil'
              ? `Pansamantalang hindi available ang road route · ${effectiveRoute.straightLineDistanceKm.toFixed(1)} km tuwid muna`
              : `Road route temporarily unavailable · ${effectiveRoute.straightLineDistanceKm.toFixed(1)} km straight-line for now`)
          : routeSummary(displayItem, lang)}
  </p>
  <p class="map-picker__quantity">{acceptedQuantity(item, lang)}</p>
  <p class="map-picker__caveat">
    {lang === 'fil'
      ? (hasRoadRoute
          ? `Tantya ng OpenRouteService mula sa sentro ng ${originName}, hindi sa eksaktong bukid. Kumpirmahin ang pagtanggap bago bumiyahe.`
          : routeRequestState === 'unavailable'
            ? `Pansamantalang hindi available ang road route. Tuwid na layo muna mula sa sentro ng ${originName}. Kumpirmahin ang pagtanggap bago bumiyahe.`
            : `Tuwid na layo mula sa sentro ng ${originName}; hindi ito direksyon sa kalsada. Kumpirmahin ang pagtanggap bago bumiyahe.`)
      : (hasRoadRoute
          ? `OpenRouteService estimate starts at ${originName} center, not the exact farm. Confirm receiving terms before travel.`
          : routeRequestState === 'unavailable'
            ? `Road routing is temporarily unavailable. Using straight-line distance from ${originName} center for now. Confirm receiving terms before travel.`
            : `Straight-line distance starts at ${originName} center; it is not road directions. Confirm receiving terms before travel.`)}
  </p>
  <a class="map-picker__details" href={outletDetailHref(item.outlet, harvest, lang, 'map')}>
    {lang === 'fil' ? 'Tingnan ang detalye' : 'View details'}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
  </a>
</section>
