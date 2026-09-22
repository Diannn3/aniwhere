<script lang="ts">
  import type { Outlet, HarvestQuery, FitResult } from '../../lib/domain/types';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { serializeDiscoverQuery, todayInManila } from '../../lib/state/url-state';
  import { t } from '../../content/translations';

  interface OutletWithFit {
    outlet: Outlet;
    fit: FitResult;
    distanceKm: number;
  }

  let {
    items = [],
    harvest = {
      crop: 'tomato',
      quantityKg: 300,
      originMunicipality: 'los-banos',
      readyDate: todayInManila(),
    },
    selectedId = undefined,
    isDetailView = false,
    lang = 'en',
    onSelect = () => {},
  }: {
    items?: OutletWithFit[];
    harvest?: HarvestQuery;
    selectedId?: string;
    isDetailView?: boolean;
    lang?: 'en' | 'fil';
    onSelect?: (id: string) => void;
  } = $props();

  // Laguna Bounding Box
  const MIN_LAT = 14.03;
  const MAX_LAT = 14.34;
  const MIN_LNG = 121.10;
  const MAX_LNG = 121.48;

  const SVG_WIDTH = 480;
  const SVG_HEIGHT = 440;

  // Ergonomic projection: Biases the map coordinate space into the upper 62% of the SVG
  // to ensure zero occlusion by the mobile bottom sheet!
  function project(lat: number, lng: number): { x: number; y: number } {
    const normX = (lng - MIN_LNG) / (MAX_LNG - MIN_LNG);
    const normY = (MAX_LAT - lat) / (MAX_LAT - MIN_LAT); // Invert Y
    const paddingX = 40;
    const paddingTop = 45;
    const innerW = SVG_WIDTH - paddingX * 2;
    const innerH = 205; // Lands comfortably between y=45 and y=250
    return {
      x: Math.round((paddingX + normX * innerW) * 10) / 10,
      y: Math.round((paddingTop + normY * innerH) * 10) / 10,
    };
  }

  const originMun = $derived(
    LAGUNA_MUNICIPALITIES.find((m) => m.id === harvest.originMunicipality) ||
    LAGUNA_MUNICIPALITIES[0]
  );

  const originPos = $derived(project(originMun.lat, originMun.lng));

  const selectedItem = $derived(
    items.find((item) => item.outlet.id === selectedId)
  );

  const selectedPos = $derived(
    selectedItem ? project(selectedItem.outlet.lat, selectedItem.outlet.lng) : null
  );

  const routeMidpoint = $derived(
    selectedPos
      ? {
          x: Math.round(((originPos.x + selectedPos.x) / 2) * 10) / 10,
          y: Math.round(((originPos.y + selectedPos.y) / 2) * 10) / 10,
        }
      : null
  );

  function getStatusColor(status: FitResult['status']): string {
    switch (status) {
      case 'match':
        return '#597928'; // Green
      case 'partial':
        return '#B86A2B'; // Amber
      case 'confirm':
        return '#4E7380'; // Route Blue
      case 'no_match':
      default:
        return '#8C9388'; // Gray
    }
  }

  function formatKg(val: number | null | undefined): string {
    if (val === null || val === undefined) return lang === 'fil' ? 'Kumpirmahin' : 'Confirm';
    return `${val.toLocaleString('en-PH')} kg`;
  }
</script>

<div class="relative w-full h-full min-h-[460px] bg-[#F4F7F0] rounded-2xl border border-[#20251E]/12 overflow-hidden flex flex-col select-none shadow-xs">
  
  <!-- Map Header Bar -->
  <div class="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
    <div class="bg-[#FFFDF8]/95 backdrop-blur-md border border-[#20251E]/12 px-3 py-1.5 rounded-xl shadow-xs pointer-events-auto flex items-center gap-2">
      <svg class="w-4 h-4 text-[#486320]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
      <span class="text-xs font-bold text-[#20251E]">
        {lang === 'fil' ? 'Mapa ng Pamilihan sa Laguna' : 'Laguna Market Corridor'}
      </span>
    </div>

    <div class="flex items-center gap-1.5 pointer-events-auto">
      <span class="bg-[#FCECD8]/95 backdrop-blur-md border border-[#20251E]/10 text-[#6E3511] px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-xs">
        {lang === 'fil' ? 'Guhit-mapa' : 'Illustrative'}
      </span>
    </div>
  </div>

  <!-- SVG Spatial Canvas with Backdrop Click Dismissal -->
  <div class="w-full flex-1 flex items-center justify-center p-2 relative">
    <svg
      class="w-full h-full max-h-[540px]"
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      fill="none"
      onclick={(event) => {
        if (event.target === event.currentTarget) onSelect('');
      }}
      xmlns="http://www.w3.org/2000/svg"
      role="group"
      aria-label={lang === 'fil'
        ? 'Guhit-mapa ng mga outlet sa Laguna at batayang lokasyon ng munisipyo'
        : 'Illustrative Laguna outlet map with municipality reference point'}
    >
      <!-- Base terrain contours -->
      <defs>
        <pattern id="grid-dots-enhanced" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#20251E" fill-opacity="0.04" />
        </pattern>
      </defs>

      <!-- Background rect with backdrop tap dismissal (P1.3) -->
      <rect
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        fill="url(#grid-dots-enhanced)"
        pointer-events="none"
      />

      <!-- Laguna de Bay lake contour with ripple lines -->
      <path
        d="M 40 40 C 120 20, 260 25, 340 35 C 410 45, 460 70, 440 120 C 420 170, 360 180, 290 170 C 230 160, 180 180, 120 165 C 60 150, 20 120, 30 80 Z"
        fill="#4E7380"
        fill-opacity="0.14"
        stroke="#4E7380"
        stroke-width="1.5"
        stroke-opacity="0.3"
        pointer-events="none"
      />
      <text
        x="240"
        y="95"
        font-family="'Source Sans 3', sans-serif"
        font-size="12"
        font-weight="700"
        fill="#4E7380"
        fill-opacity="0.75"
        text-anchor="middle"
        pointer-events="none"
      >
        Laguna de Bay
      </text>

      <!-- Mt. Makiling Mountain Silhouette Area -->
      <path
        d="M 140 250 C 180 200, 215 200, 255 250 C 225 258, 170 258, 140 250 Z"
        fill="#91AC67"
        fill-opacity="0.25"
        stroke="#597928"
        stroke-width="1"
        stroke-dasharray="3 3"
        stroke-opacity="0.4"
        pointer-events="none"
      />
      <text
        x="195"
        y="238"
        font-family="'Source Sans 3', sans-serif"
        font-size="9"
        font-weight="700"
        fill="#597928"
        fill-opacity="0.75"
        text-anchor="middle"
        pointer-events="none"
      >
        Mt. Makiling
      </text>

      <!-- Highway / Transport Corridor Arteries -->
      <path
        d="M 90 180 Q 180 210, 210 220 T 380 125"
        stroke="#20251E"
        stroke-width="2"
        stroke-opacity="0.16"
        stroke-dasharray="4 4"
        fill="none"
        pointer-events="none"
      />

      <!-- Active Connection Line between Origin and Selected Outlet -->
      {#if selectedPos && routeMidpoint}
        <g>
          <line
            x1={originPos.x}
            y1={originPos.y}
            x2={selectedPos.x}
            y2={selectedPos.y}
            stroke={getStatusColor(selectedItem?.fit.status || 'match')}
            stroke-width="3"
            stroke-dasharray="6 4"
          />

          <!-- Route Distance Badge in Midpoint -->
          <g transform={`translate(${routeMidpoint.x}, ${routeMidpoint.y - 10})`}>
            <rect
              x="-28"
              y="-9"
              width="56"
              height="18"
              rx="9"
              fill="#FFFDF8"
              stroke="#20251E"
              stroke-opacity="0.2"
              stroke-width="1"
              class="shadow-xs"
            />
            <text
              x="0"
              y="3"
              font-family="'Source Sans 3', sans-serif"
              font-size="9"
              font-weight="700"
              fill="#20251E"
              text-anchor="middle"
            >
              {selectedItem?.distanceKm} km
            </text>
          </g>
        </g>
      {/if}

      <!-- Outlet Pins -->
      {#each items as item}
        {@const pos = project(item.outlet.lat, item.outlet.lng)}
        {@const isSelected = item.outlet.id === selectedId}
        {@const color = getStatusColor(item.fit.status)}

        <g class="transition-transform duration-150 {isSelected ? 'scale-110' : ''}">

          <!-- Pulsing Focus / Selection ring -->
          {#if isSelected}
            <circle cx={pos.x} cy={pos.y} r="20" fill={color} fill-opacity="0.25" stroke={color} stroke-width="1.5" pointer-events="none" />
          {/if}

          <!-- Pin Outer Circle -->
          <circle
            cx={pos.x}
            cy={pos.y}
            r={isSelected ? "11" : "9"}
            fill={color}
            stroke="#FFFDF8"
            stroke-width="2"
            class="cursor-pointer shadow-sm"
            tabindex="0"
            role="button"
            aria-label={`${item.outlet.name}: ${lang === 'fil' ? item.fit.statusLabelFil : item.fit.statusLabel}, ${item.distanceKm} km ${lang === 'fil' ? 'tuwid na layo mula sa sentro ng ' + originMun.name.split(',')[0] : 'straight-line from ' + originMun.name.split(',')[0] + ' municipality center'}`}
            onclick={(e) => {
              e.stopPropagation();
              onSelect(item.outlet.id);
            }}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onSelect(item.outlet.id);
              }
            }}
          />

          <!-- Pin Inner Core -->
          <circle cx={pos.x} cy={pos.y} r={isSelected ? "4" : "3"} fill="#FFFDF8" pointer-events="none" />

          <!-- Floating Name Label -->
          <g transform={`translate(${pos.x}, ${pos.y + 16})`} pointer-events="none">
            <rect
              x="-48"
              y="-2"
              width="96"
              height="16"
              rx="4"
              fill="#FFFDF8"
              fill-opacity="0.95"
              stroke="#20251E"
              stroke-opacity="0.15"
              stroke-width="0.75"
            />
            <text
              x="0"
              y="10"
              font-family="'Source Sans 3', sans-serif"
              font-size="9"
              font-weight={isSelected ? "700" : "600"}
              fill="#20251E"
              text-anchor="middle"
            >
              {item.outlet.name.replace('Demo ', '')}
            </text>
          </g>
        </g>
      {/each}

      <!-- Farmer Origin Pin (Always on top) -->
      <g
        transform={`translate(${originPos.x}, ${originPos.y})`}
        role="region"
        aria-label={lang === 'fil'
          ? `Batayang lokasyon: ${originMun.name}, sentro ng munisipyo`
          : `Reference point: ${originMun.name} municipality center`}
      >
        <circle cx="0" cy="0" r="14" fill="#6E3511" fill-opacity="0.2" />
        <circle cx="0" cy="0" r="8" fill="#6E3511" stroke="#FFFDF8" stroke-width="2" />
        <circle cx="0" cy="0" r="3" fill="#FFFDF8" />

        <g transform="translate(0, -14)">
          <rect
            x="-44"
            y="-14"
            width="88"
            height="15"
            rx="4"
            fill="#6E3511"
          />
          <text
            x="0"
            y="-3"
            font-family="'Source Sans 3', sans-serif"
            font-size="8.5"
            font-weight="700"
            fill="#FFFDF8"
            text-anchor="middle"
          >
            {lang === 'fil' ? 'Sentro ng bayan' : 'Municipality center'}
          </text>
        </g>
      </g>
    </svg>

    <!-- Mobile Non-Modal Pin Inspection Bottom Sheet (P1.1 44px touch targets & zero pin occlusion) -->
    {#if selectedItem && !isDetailView}
      <div
        role="region"
        aria-label={lang === 'fil' ? 'Napiling lugar sa mapa' : 'Selected map place'}
        class="lg:hidden absolute bottom-3 left-3 right-3 z-20 bg-[#FFFDF8]/98 backdrop-blur-md border border-[#597928]/30 rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-1.5 mb-1">
              <span class={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                selectedItem.fit.status === 'match'
                  ? 'bg-[#EAF3DE] text-[#3B5B16]'
                  : selectedItem.fit.status === 'partial'
                    ? 'bg-[#FCECD8] text-[#6E3511]'
                    : selectedItem.fit.status === 'confirm'
                      ? 'bg-[#EBF2F5] text-[#2A4B56]'
                      : 'bg-[#F0F2EE] text-[#555D50]'
              }`}>
                {lang === 'fil' ? selectedItem.fit.statusLabelFil : selectedItem.fit.statusLabel}
              </span>
              <span class="text-[11px] text-[#596052] font-medium">
                {lang === 'fil'
                  ? `${selectedItem.distanceKm} km tuwid · mula sa sentro ng ${originMun.name.split(',')[0]}`
                  : `${selectedItem.distanceKm} km straight-line · from ${originMun.name.split(',')[0]} municipality center`}
              </span>
            </div>

            <h3 class="font-serif text-base font-bold text-[#20251E] leading-tight">
              {selectedItem.outlet.name}
            </h3>
            <p class="text-[11px] text-[#4A5245]">
              {selectedItem.outlet.municipality}, Laguna &bull; <span class="capitalize">{selectedItem.outlet.category}</span>
            </p>
          </div>

          <!-- P1.1: 44x44px Touch Target for Close Button -->
          <button
            type="button"
            onclick={() => onSelect('')}
            aria-label={lang === 'fil' ? 'Isara ang preview' : 'Close preview'}
            class="w-11 h-11 flex items-center justify-center -mr-2 -mt-2 rounded-full text-[#596052] hover:text-[#20251E] hover:bg-[#20251E]/8 active:bg-[#20251E]/12 transition-colors cursor-pointer shrink-0"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- Decision-first quantity preview -->
        <div class="grid grid-cols-2 gap-2 bg-[#F9FBF7] rounded-xl p-2.5 px-3 border border-[#20251E]/8 text-xs">
          <div>
            <span class="block text-[10px] text-[#596052]">
              {lang === 'fil' ? 'Kayang tanggapin' : 'Can accept'}
            </span>
            <span class="font-bold text-[#20251E] font-tabular">
              {formatKg(selectedItem.fit.acceptedKg)}
            </span>
          </div>

          <div class="text-right">
            <span class="block text-[10px] text-[#596052]">
              {lang === 'fil' ? 'Matitirang ani' : 'Harvest remaining'}
            </span>
            <span class="font-bold text-[#20251E] font-tabular">
              {formatKg(selectedItem.fit.remainingKg)}
            </span>
          </div>
        </div>

        <!-- P1.1: 44px Height Standard for Primary CTA Button -->
        <a
          href={`/places/${selectedItem.outlet.slug}?${serializeDiscoverQuery(harvest, 'list', selectedItem.outlet.id, lang)}`}
          class="min-h-[44px] px-5 py-2.5 rounded-full text-xs font-bold bg-[#486320] hover:bg-[#3A5219] text-[#FFFDF8] transition-colors shadow-xs flex items-center justify-center gap-1.5 w-full cursor-pointer"
        >
          <span>{t('viewDetails', lang)}</span>
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    {/if}
  </div>

  <!-- Bottom Legend / Status Pill Bar -->
  <div class="bg-[#FFFDF8]/95 backdrop-blur-sm border-t border-[#20251E]/10 p-2 px-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#4A5245]">
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-[#486320] inline-block"></span>
        <span class="font-medium">{lang === 'fil' ? 'Tugma' : 'Match'}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-[#B86A2B] inline-block"></span>
        <span class="font-medium">{lang === 'fil' ? 'Bahagya' : 'Partial'}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-[#4E7380] inline-block"></span>
        <span class="font-medium">{lang === 'fil' ? 'Kumpirmahin' : 'Confirm'}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-[#8C9388] inline-block"></span>
        <span class="font-medium">{lang === 'fil' ? 'Hindi tugma' : 'No match'}</span>
      </div>
    </div>

    <span class="text-[10px] text-[#596052] italic">
      {lang === 'fil' ? 'Tantyang distansya lamang' : 'Approximate road corridor'}
    </span>
  </div>

</div>
