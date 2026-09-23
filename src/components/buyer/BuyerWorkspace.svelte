<script lang="ts">
  import { onMount } from 'svelte';
  import type { BuyerDemoOffer } from '../../lib/domain/types';
  import {
    getBuyerOffers,
    saveBuyerOffer,
    deleteBuyerOffer,
    resetBuyerOffers,
  } from '../../lib/state/buyer-demo';
  import BuyerOfferEditorModal from './BuyerOfferEditorModal.svelte';

  interface Props {
    initialLang?: 'en' | 'fil';
  }

  const { initialLang = 'en' } = $props();

  let lang = $state<'en' | 'fil'>(initialLang);
  let offers = $state<BuyerDemoOffer[]>([]);
  let activeFilter = $state<'all' | 'published' | 'in_review' | 'draft'>('all');
  let searchQuery = $state('');
  let isModalOpen = $state(false);
  let offerToEdit = $state<BuyerDemoOffer | null>(null);
  let toastMessage = $state<string | null>(null);
  let offerToDelete = $state<BuyerDemoOffer | null>(null);

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang === 'fil' || urlLang === 'en') {
      lang = urlLang;
    }
    refreshOffers();
  });

  function refreshOffers() {
    offers = getBuyerOffers();
  }

  const isFil = $derived(lang === 'fil');
  const counts = $derived({
    published: offers.filter((o) => o.status === 'published').length,
    inReview: offers.filter((o) => o.status === 'in_review').length,
    draft: offers.filter((o) => o.status === 'draft').length,
  });

  const filteredOffers = $derived(
    offers.filter((o) => {
      // Status filter
      if (activeFilter !== 'all' && o.status !== activeFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCrop = o.cropLabel.toLowerCase().includes(q) || o.cropKey.toLowerCase().includes(q);
        const matchLocation = o.location?.toLowerCase().includes(q) || false;
        return matchCrop || matchLocation;
      }
      return true;
    })
  );

  function openCreateModal() {
    offerToEdit = null;
    isModalOpen = true;
  }

  function openEditModal(offer: BuyerDemoOffer) {
    offerToEdit = offer;
    isModalOpen = true;
  }

  function handleSaveOffer(updated: BuyerDemoOffer) {
    saveBuyerOffer(updated);
    refreshOffers();
    isModalOpen = false;
    showToast(isFil ? 'Nai-save sa device na ito para sa demo' : 'Saved on this device for demo');
  }

  function confirmDelete(offer: BuyerDemoOffer) {
    offerToDelete = offer;
  }

  function executeDelete() {
    if (offerToDelete) {
      deleteBuyerOffer(offerToDelete.id);
      refreshOffers();
      offerToDelete = null;
      showToast(isFil ? 'Naalis ang alok sa device na ito' : 'Offer removed from this device');
    }
  }

  function handleReset() {
    resetBuyerOffers();
    refreshOffers();
    activeFilter = 'all';
    searchQuery = '';
    showToast(isFil ? 'Naibalik sa 3 orihinal na halimbawang alok' : 'Reset to original 3 sample offers');
  }

  function showToast(msg: string) {
    toastMessage = msg;
    setTimeout(() => {
      if (toastMessage === msg) {
        toastMessage = null;
      }
    }, 4000);
  }
</script>

<div class="almanac-page min-h-screen bg-[#FFFDF8] text-[#20251E]">
  <!-- Buyer field ledger -->
  <section class="border-b border-[#20251E]/15 bg-[#FFFDF8] px-4 pb-8 pt-8 sm:px-6 lg:px-8">
    <div class="max-w-6xl mx-auto">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <!-- Direct H1 & Subhead -->
        <div class="max-w-2xl">
          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#20251E]">
            {isFil ? 'Mga alok sa pagbili' : 'Your buying offers'}
          </h1>
          <p class="mt-3 text-base sm:text-lg text-[#4A5245] leading-relaxed">
            {isFil
              ? 'Pamahalaan ang iyong mga alok sa pagbili at kumonekta sa mga lokal na magsasaka sa Laguna.'
              : 'Manage your buying offers and connect with local farmers across Laguna.'}
          </p>
        </div>

        <aside class="max-w-sm border-t border-[#597928]/40 pt-3 md:border-t-0 md:border-l md:py-1 md:pl-5" aria-label={isFil ? 'Paalala tungkol sa demo' : 'Demo notice'}>
          <strong class="text-sm font-bold text-[#486320]">
            {isFil ? 'Demo — Halimbawang Datos' : 'Demo — sample data'}
          </strong>
          <p class="mt-1 text-sm leading-snug text-[#4A5245]">
            {isFil
              ? 'Ito ay isang demonstration workspace. Ang mga alok ay naka-save sa device na ito lamang at hindi naglalathala ng totoong transaksyon.'
              : 'This is a demonstration workspace. Offers are saved on this device only and do not publish real buyer demand.'}
          </p>
        </aside>
      </div>

      <!-- The action leads; status counts double as quick filters. -->
      <div class="mt-8 grid gap-4 lg:grid-cols-[minmax(260px,1.1fr)_2fr] lg:items-stretch">
        <button
          type="button"
          onclick={openCreateModal}
          class="flex min-h-16 items-center justify-center gap-3 rounded-xl bg-[#597928] px-6 py-4 text-base font-bold text-white transition-colors hover:bg-[#486320] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928] lg:min-h-24"
        >
          <span class="text-2xl font-normal leading-none" aria-hidden="true">+</span>
          {isFil ? 'Gumawa ng alok' : 'Create offer'}
        </button>
        <div class="grid grid-cols-3 border-y border-[#20251E]/15 lg:border-y-0" role="group" aria-label={isFil ? 'Salain ayon sa katayuan' : 'Filter offers by status'}>
          <button type="button" onclick={() => { activeFilter = activeFilter === 'published' ? 'all' : 'published'; }}
            aria-pressed={activeFilter === 'published'}
            class={`min-h-20 border-r border-[#20251E]/15 px-2 py-3 text-left sm:px-6 lg:border-l ${activeFilter === 'published' ? 'bg-[#EBF3DF] text-[#47661E]' : 'text-[#20251E] hover:bg-[#EBF3DF]/50'} focus-visible:outline-2 focus-visible:outline-[#597928]`}>
            <span class="block text-xs font-semibold sm:text-sm">{isFil ? 'Nailathala' : 'Published'}</span>
            <span class="mt-1 block text-2xl font-bold tabular-nums">{counts.published}</span>
          </button>
          <button type="button" onclick={() => { activeFilter = activeFilter === 'in_review' ? 'all' : 'in_review'; }}
            aria-pressed={activeFilter === 'in_review'}
            class={`min-h-20 border-r border-[#20251E]/15 px-2 py-3 text-left sm:px-6 ${activeFilter === 'in_review' ? 'bg-[#FCECD8] text-[#6E3511]' : 'text-[#20251E] hover:bg-[#FCECD8]/50'} focus-visible:outline-2 focus-visible:outline-[#597928]`}>
            <span class="block text-xs font-semibold sm:text-sm">{isFil ? 'Pagsusuri' : 'In review'}</span>
            <span class="mt-1 block text-2xl font-bold tabular-nums">{counts.inReview}</span>
          </button>
          <button type="button" onclick={() => { activeFilter = activeFilter === 'draft' ? 'all' : 'draft'; }}
            aria-pressed={activeFilter === 'draft'}
            class={`min-h-20 px-2 py-3 text-left sm:px-6 ${activeFilter === 'draft' ? 'bg-[#F3F4F6] text-[#20251E]' : 'text-[#20251E] hover:bg-[#F3F4F6]'} focus-visible:outline-2 focus-visible:outline-[#597928]`}>
            <span class="block text-xs font-semibold sm:text-sm">{isFil ? 'Burador' : 'Draft'}</span>
            <span class="mt-1 block text-2xl font-bold tabular-nums">{counts.draft}</span>
          </button>
        </div>
      </div>

    </div>
  </section>

  <!-- Main Offers Workspace Content -->
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <!-- Toast Notification Banner -->
    {#if toastMessage}
      <div
        class="bg-[#EBF3DF] border border-[#597928]/30 text-[#47661E] px-4 py-3 rounded-xl flex items-center justify-between shadow-xs animate-fadeIn"
        role="status"
      >
        <div class="flex items-center gap-2.5">
          <svg class="w-5 h-5 text-[#486320]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-sm font-semibold">{toastMessage}</span>
        </div>
        <button
          type="button"
          onclick={() => { toastMessage = null; }}
          class="text-[#47661E] hover:text-[#20251E] p-1"
          aria-label="Dismiss message"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    {/if}

    <div>
      <div class="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-[#20251E]">
            {isFil ? 'Talaan ng mga Alok' : 'Offer listings'}
          </h2>
          <p class="mt-1 text-sm text-[#4A5245]">
            {isFil
              ? 'Lumikha at pamahalaan ang mga alok upang kumuha ng sariwang ani mula sa mga lokal na magsasaka.'
              : 'Create and manage your offers to source fresh produce from local farmers.'}
          </p>
        </div>
        <label class="relative block sm:w-64">
          <span class="sr-only">{isFil ? 'Maghanap ng alok' : 'Search offers'}</span>
          <svg aria-hidden="true" class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#596052]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="search" bind:value={searchQuery}
            placeholder={isFil ? 'Maghanap ng pananim...' : 'Search offers by crop...'}
            class="min-h-11 w-full rounded-lg border border-[#20251E]/20 bg-white pl-9 pr-3 text-sm text-[#20251E] focus-visible:outline-2 focus-visible:outline-[#597928]" />
        </label>
      </div>
      <div class="flex gap-2 overflow-x-auto border-b border-[#20251E]/20" role="group" aria-label={isFil ? 'Salain ayon sa katayuan' : 'Filter offers by status'}>
        <button type="button" onclick={() => { activeFilter = 'all'; }} aria-pressed={activeFilter === 'all'}
          class={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#597928] ${activeFilter === 'all' ? 'border-[#597928] text-[#20251E]' : 'border-transparent text-[#4A5245] hover:text-[#20251E]'}`}>
          {isFil ? 'Lahat' : 'All'} ({offers.length})
        </button>
        <button type="button" onclick={() => { activeFilter = 'published'; }} aria-pressed={activeFilter === 'published'}
          class={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#597928] ${activeFilter === 'published' ? 'border-[#597928] text-[#20251E]' : 'border-transparent text-[#4A5245] hover:text-[#20251E]'}`}>
          {isFil ? 'Nailathala' : 'Published'} ({counts.published})
        </button>
        <button type="button" onclick={() => { activeFilter = 'in_review'; }} aria-pressed={activeFilter === 'in_review'}
          class={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#597928] ${activeFilter === 'in_review' ? 'border-[#597928] text-[#20251E]' : 'border-transparent text-[#4A5245] hover:text-[#20251E]'}`}>
          {isFil ? 'Pagsusuri' : 'In review'} ({counts.inReview})
        </button>
        <button type="button" onclick={() => { activeFilter = 'draft'; }} aria-pressed={activeFilter === 'draft'}
          class={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#597928] ${activeFilter === 'draft' ? 'border-[#597928] text-[#20251E]' : 'border-transparent text-[#4A5245] hover:text-[#20251E]'}`}>
          {isFil ? 'Burador' : 'Draft'} ({counts.draft})
        </button>
      </div>

      <!-- Desktop Table View (>= 768px) -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-[#20251E]/20 text-xs font-semibold text-[#596052]">
              <th scope="col" class="py-3.5 px-6">Crop</th>
              <th scope="col" class="py-3.5 px-6">Quantity</th>
              <th scope="col" class="py-3.5 px-6">Target Price (PHP)</th>
              <th scope="col" class="py-3.5 px-6">Status</th>
              <th scope="col" class="py-3.5 px-6">Last Updated</th>
              <th scope="col" class="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#20251E]/10 text-sm">
            {#if filteredOffers.length === 0}
              <tr>
                <td colspan="6" class="py-12 px-6 text-center text-[#596052]">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <svg class="w-8 h-8 text-[#596052]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p class="text-sm font-medium">
                      {isFil ? 'Walang alok na tumutugma sa filter na ito.' : 'No offers match this search or filter.'}
                    </p>
                  </div>
                </td>
              </tr>
            {:else}
              {#each filteredOffers as offer (offer.id)}
                <tr class="hover:bg-[#FCECD8]/20 transition-colors">
                  <!-- Crop -->
                  <td class="py-5 px-6">
                    <div class="flex items-center gap-3">
                      <span aria-hidden="true" class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EBF3DF] text-sm font-bold text-[#47661E]">{offer.cropLabel.slice(0, 1)}</span>
                      <div>
                        <div class="font-bold text-base text-[#20251E]">
                          {offer.cropLabel}
                        </div>
                        {#if offer.location}
                          <div class="text-xs text-[#596052] flex items-center gap-1 mt-0.5">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span>{offer.location}</span>
                          </div>
                        {/if}
                      </div>
                    </div>
                  </td>

                  <!-- Quantity -->
                  <td class="py-4 px-6 font-semibold text-[#20251E]">
                    {offer.quantityKg.toLocaleString()} kg
                  </td>

                  <!-- Target Price -->
                  <td class="py-4 px-6">
                    {#if offer.pricePerKg !== undefined && offer.pricePerKg > 0}
                      <span class="font-bold text-[#486320]">
                        PHP {offer.pricePerKg} / kg
                      </span>
                    {:else}
                      <span class="text-[#596052] italic text-xs">
                        {isFil ? 'Walang nakasaad na presyo' : 'Price not posted'}
                      </span>
                    {/if}
                  </td>

                  <!-- Status (strictly NO decorative dot) -->
                  <td class="py-4 px-6">
                    {#if offer.status === 'published'}
                      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF3DF] text-[#47661E] border border-[#D1E3BA]">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{isFil ? 'Nailathala' : 'Published'}</span>
                      </div>
                    {:else if offer.status === 'in_review'}
                      <div class="inline-flex flex-col">
                        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FCECD8] text-[#6E3511] border border-[#F6D3AD]">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{isFil ? 'Nasa pagsusuri' : 'In review'}</span>
                        </div>
                        <span class="text-xs text-[#6E3511] mt-0.5 pl-1">
                          Sample workflow state
                        </span>
                      </div>
                    {:else}
                      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>{isFil ? 'Burador' : 'Draft'}</span>
                      </div>
                    {/if}
                  </td>

                  <!-- Last Updated -->
                  <td class="py-4 px-6 text-xs text-[#596052]">
                    {#if offer.status === 'published'}
                      <span>Sample offer &middot; 17 Sep 2026</span>
                    {:else if offer.status === 'in_review'}
                      <span>Needs review before publication</span>
                    {:else}
                      <span>&mdash;</span>
                    {/if}
                  </td>

                  <!-- Actions -->
                  <td class="py-4 px-6 text-right">
                    <div class="inline-flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        onclick={() => openEditModal(offer)}
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#4A5245] hover:text-[#20251E] hover:bg-[#FCECD8]/50 border border-[#20251E]/15 transition-colors flex items-center gap-1.5 min-h-11 focus-visible:outline-2 focus-visible:outline-[#597928]"
                        aria-label={`Edit offer for ${offer.cropLabel}`}
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onclick={() => confirmDelete(offer)}
                        class="p-1.5 rounded-lg text-[#596052] hover:text-[#9B1C1C] hover:bg-[#FDE8E8] transition-colors min-h-11 min-w-11 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[#597928]"
                        aria-label={`Delete offer for ${offer.cropLabel}`}
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <!-- Mobile Stacked Card View (< 768px, matching 03-mobile-buyer.png) -->
      <div class="md:hidden divide-y divide-[#20251E]/10">
        {#if filteredOffers.length === 0}
          <div class="p-8 text-center text-[#596052]">
            <p class="text-sm font-medium">
              {isFil ? 'Walang alok na tumutugma sa filter na ito.' : 'No offers match this search or filter.'}
            </p>
          </div>
        {:else}
          {#each filteredOffers as offer (offer.id)}
            <div class="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-[#FFFDF8]/60 transition-colors">
              <!-- Left: Crop Badge & Info -->
              <button
                type="button"
                onclick={() => openEditModal(offer)}
                class="flex items-center gap-3.5 text-left flex-1 min-w-0"
              >
                <!-- Crop Avatar -->
                {#if offer.cropKey === 'tomato'}
                  <div class="w-12 h-12 rounded-2xl bg-[#FDE8E8] text-[#9B1C1C] flex items-center justify-center text-xl shrink-0 shadow-xs">
                    🍅
                  </div>
                {:else if offer.cropKey === 'eggplant'}
                  <div class="w-12 h-12 rounded-2xl bg-[#F3E8FF] text-[#6B21A8] flex items-center justify-center text-xl shrink-0 shadow-xs">
                    🍆
                  </div>
                {:else if offer.cropKey === 'calamansi'}
                  <div class="w-12 h-12 rounded-2xl bg-[#ECFCCB] text-[#3F6212] flex items-center justify-center text-xl shrink-0 shadow-xs">
                    🍋
                  </div>
                {:else}
                  <div class="w-12 h-12 rounded-2xl bg-[#EBF3DF] text-[#47661E] flex items-center justify-center text-xl shrink-0 shadow-xs">
                    🌱
                  </div>
                {/if}

                <!-- Text Details -->
                <div class="min-w-0 flex-1">
                  <div class="font-serif font-bold text-base text-[#20251E] truncate">
                    {offer.cropLabel}
                  </div>
                  <div class="text-xs font-semibold text-[#4A5245] mt-0.5">
                    {offer.quantityKg} kg
                    <span class="text-[#596052] font-normal">&middot;</span>
                    {#if offer.pricePerKg !== undefined && offer.pricePerKg > 0}
                      <span class="text-[#486320] font-bold">PHP {offer.pricePerKg}/kg</span>
                    {:else}
                      <span class="text-[#596052] italic font-normal">Price not posted</span>
                    {/if}
                  </div>
                  <div class="text-[11px] text-[#596052] mt-0.5 truncate">
                    {#if offer.status === 'published'}
                      Sample offer &middot; 17 Sep 2026
                    {:else if offer.status === 'in_review'}
                      Needs review before publication
                    {:else}
                      Internal draft
                    {/if}
                  </div>
                </div>
              </button>

              <!-- Right: Status Pill & Chevron -->
              <div class="flex items-center gap-2 shrink-0">
                {#if offer.status === 'published'}
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EBF3DF] text-[#47661E] border border-[#D1E3BA]">
                    Published
                  </span>
                {:else if offer.status === 'in_review'}
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FCECD8] text-[#6E3511] border border-[#F6D3AD]">
                    In review
                  </span>
                {:else}
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">
                    Draft
                  </span>
                {/if}

                <button
                  type="button"
                  onclick={() => openEditModal(offer)}
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-[#596052] hover:text-[#20251E] transition-colors"
                  aria-label="Edit offer"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Explanatory Guidance Cards (matching 09-desktop-buyer.png & 03-mobile-buyer.png) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Card 1: Review before publication -->
      <div class="bg-[#FCECD8]/40 border border-[#6E3511]/15 rounded-2xl p-5 sm:p-6 shadow-xs flex items-start gap-4">
        <div class="w-10 h-10 rounded-xl bg-[#6E3511]/15 text-[#6E3511] flex items-center justify-center shrink-0 mt-0.5">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 class="font-serif text-base font-bold text-[#20251E]">
            {isFil ? 'Pagsusuri bago Ilathala' : 'Review before publication'}
          </h3>
          <ul class="mt-2 text-xs sm:text-sm text-[#4A5245] space-y-1.5 list-disc list-inside">
            <li>{isFil ? 'Tanging ang mga nailathalang alok ang makikita sa pagtuklas ng magsasaka.' : 'Only published offers appear in farmer discovery.'}</li>
            <li>{isFil ? 'Panatilihing napapanahon ang dami, kondisyon ng pananim, at petsa ng bisa.' : 'Keep quantity, crop requirements, and validity current.'}</li>
          </ul>
        </div>
      </div>

      <!-- Card 2: Source and review -->
      <div class="bg-[#EBF3DF]/40 border border-[#597928]/20 rounded-2xl p-5 sm:p-6 shadow-xs flex items-start gap-4">
        <div class="w-10 h-10 rounded-xl bg-[#597928]/15 text-[#486320] flex items-center justify-center shrink-0 mt-0.5">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 class="font-serif text-base font-bold text-[#20251E]">
            {isFil ? 'Pinagmulan at Pagsusuri' : 'Source and review'}
          </h3>
          <p class="mt-2 text-xs sm:text-sm text-[#4A5245] leading-relaxed">
            {isFil
              ? 'Ang mga kondisyon ay sinusuri bago ilathala sa pampublikong direktoryo. Ang mga pagbabago rito ay lokal sa iyong browser lamang.'
              : 'Terms are reviewed before publication in the public directory. Changes made in this demo are stored locally on your device only.'}
          </p>
        </div>
      </div>
    </div>

    <!-- Reset / Testing Utility Link -->
    <div class="pt-4 text-center">
      <button
        type="button"
        onclick={handleReset}
        class="text-xs text-[#596052] hover:text-[#6E3511] underline transition-colors"
      >
        {isFil ? 'Ibalik sa orihinal na 3 halimbawang alok' : 'Reset to default sample offers (1 published, 1 in review, 1 draft)'}
      </button>
    </div>
  </div>
</div>

<!-- Accessible Modal Dialog for Create/Edit -->
<BuyerOfferEditorModal
  isOpen={isModalOpen}
  offerToEdit={offerToEdit}
  lang={lang}
  onSave={handleSaveOffer}
  onClose={() => { isModalOpen = false; }}
/>

<!-- Delete Confirmation Dialog -->
{#if offerToDelete}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#20251E]/60 backdrop-blur-xs animate-fadeIn"
    role="presentation"
  >
    <div
      class="bg-[#FFFDF8] border border-[#20251E]/15 rounded-2xl shadow-2xl p-6 max-w-sm w-full"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <h3 id="delete-dialog-title" class="font-serif text-lg font-bold text-[#20251E]">
        {isFil ? 'Alisin ang Alok?' : 'Delete Offer?'}
      </h3>
      <p class="text-xs sm:text-sm text-[#4A5245] mt-2">
        {isFil
          ? `Sigurado ka bang nais mong alisin ang alok para sa ${offerToDelete.cropLabel}? Maaari mo itong ibalik anumang oras gamit ang reset button.`
          : `Are you sure you want to remove the offer for ${offerToDelete.cropLabel}? You can restore default offers at any time.`}
      </p>
      <div class="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onclick={() => { offerToDelete = null; }}
          class="px-4 py-2 rounded-xl text-xs font-semibold text-[#4A5245] hover:bg-[#20251E]/5 transition-colors min-h-[40px]"
        >
          {isFil ? 'Kanselahin' : 'Cancel'}
        </button>
        <button
          type="button"
          onclick={executeDelete}
          class="px-4 py-2 rounded-xl text-xs font-bold bg-[#9B1C1C] text-white hover:bg-[#7F1D1D] transition-colors min-h-[40px]"
        >
          {isFil ? 'Alisin' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
{/if}
