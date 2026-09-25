<script lang="ts">
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { outletDetailHref } from '../../lib/data/outlet-links';
  import { acceptedQuantity, routeSummary, type PickerItem } from '../../lib/map/picker';
  import type { HarvestQuery } from '../../lib/domain/types';

  let { item, harvest, lang }: { item: PickerItem; harvest: HarvestQuery; lang: 'en' | 'fil' } = $props();
  const originName = $derived(
    LAGUNA_MUNICIPALITIES.find((municipality) => municipality.id === harvest.originMunicipality)?.name.split(',')[0]
      || LAGUNA_MUNICIPALITIES[0].name.split(',')[0]
  );
  const hasRoadRoute = $derived(item.route.source === 'road' && typeof item.route.roadDistanceKm === 'number');
</script>

<section class="map-picker__selection" aria-live="polite" aria-label={lang === 'fil' ? 'Napiling outlet' : 'Selected outlet'}>
  <p class={`map-picker__status status-${item.fit.status}`}>{lang === 'fil' ? item.fit.statusLabelFil : item.fit.statusLabel}</p>
  <h3>{item.outlet.name}</h3>
  <p class="map-picker__route">{routeSummary(item, lang)}</p>
  <p class="map-picker__quantity">{acceptedQuantity(item, lang)}</p>
  <p class="map-picker__caveat">
    {lang === 'fil'
      ? (hasRoadRoute
          ? `Tantyang ruta mula sa sentro ng ${originName}, hindi sa eksaktong bukid. Kumpirmahin ang pagtanggap bago bumiyahe.`
          : `Tuwid na layo mula sa sentro ng ${originName}; hindi ito direksyon sa kalsada. Kumpirmahin ang pagtanggap bago bumiyahe.`)
      : (hasRoadRoute
          ? `Route estimate starts at ${originName} center, not the exact farm. Confirm receiving terms before travel.`
          : `Straight-line distance starts at ${originName} center; it is not road directions. Confirm receiving terms before travel.`)}
  </p>
  <a class="map-picker__details" href={outletDetailHref(item.outlet, harvest, lang, 'map')}>
    {lang === 'fil' ? 'Tingnan ang detalye' : 'View details'}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
  </a>
</section>
