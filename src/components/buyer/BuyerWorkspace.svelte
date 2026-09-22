<script lang="ts">
  import { onMount } from 'svelte';
  import type { BuyerDemoOffer } from '../../lib/domain/types';
  import {
    getBuyerOffers,
    saveBuyerOffer,
    deleteBuyerOffer,
    resetBuyerOffers,
    getBuyerOfferCounts,
  } from '../../lib/state/buyer-demo';
  import BuyerOfferEditorModal from './BuyerOfferEditorModal.svelte';
  import { t } from '../../content/translations';

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

  const counts = $derived(getBuyerOfferCounts());

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

<div class="min-h-screen bg-[#FFFDF8] text-[#20251E]">
  <!-- Hero Section with subtle ambient backdrop (no kicker pill above H1) -->
  <section class="relative bg-gradient-to-b from-[#FCECD8]/50 via-[#FFFDF8]/40 to-[#FFFDF8] border-b border-[#20251E]/10 pt-8 pb-10 px-4 sm:px-6 lg:px-8">
    <div class="max-w-6xl mx-auto">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <!-- Direct H1 & Subhead -->
        <div class="max-w-2xl">
          <h1 class="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#20251E]">
            {isFil ? 'Mga alok sa pagbili' : 'Your buying offers'}
          </h1>
          <p class="mt-3 text-base sm:text-lg text-[#4A5245] leading-relaxed">
            {isFil
              ? 'Pamahalaan ang iyong mga alok sa pagbili at kumonekta sa mga lokal na magsasaka sa Laguna.'
              : 'Manage your buying offers and connect with local farmers across Laguna.'}
          </p>
        </div>

        <!-- Prominent Demo Badge Card -->
        <div class="bg-[#FFFDF8] border border-[#20251E]/15 rounded-2xl p-4 sm:p-5 shadow-xs max-w-sm flex items-start gap-3.5">
          <div class="w-9 h-9 rounded-xl bg-[#597928]/15 flex items-center justify-center text-[#486320] shrink-0 mt-0.5">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div class="text-xs font-bold uppercase tracking-wider text-[#486320]">
              {isFil ? 'Demo — Halimbawang Datos' : 'Demo — sample data'}
            </div>
            <p class="text-xs text-[#4A5245] mt-1 leading-normal">
              {isFil
                ? 'Ito ay isang demonstration workspace. Ang mga alok ay naka-save sa device na ito lamang at hindi naglalathala ng totoong transaksyon.'
                : 'This is a demonstration workspace. Offers are saved on this device only and do not publish real buyer demand.'}
            </p>
          </div>
        </div>
      </div>

      <!-- Metrics Row: Mobile Compact Strip & Desktop Generous Grid -->
      <!-- Mobile View (< lg) -->
      <div class="mt-6 lg:hidden space-y-3">
        <div class="grid grid-cols-3 gap-2">
          <!-- Published Card Mobile -->
          <button
            type="button"
            onclick={() => { activeFilter = activeFilter === 'published' ? 'all' : 'published'; }}
            class={`text-center bg-white border rounded-xl p-3 shadow-2xs transition-all flex flex-col items-center justify-center min-h-[64px] ${
              activeFilter === 'published' ? 'border-[#597928] bg-[#EBF3DF]/40 ring-2 ring-[#597928]' : 'border-[#20251E]/10 hover:border-[#597928]/40'
            }`}
          >
            <span class="text-[10px] font-bold text-[#596052] uppercase tracking-wider">
              {isFil ? 'Nailathala' : 'Published'}
            </span>
            <span class="text-xl font-bold font-serif text-[#20251E] mt-0.5">
              {counts.published}
            </span>
          </button>

          <!-- In Review Card Mobile -->
          <button
            type="button"
            onclick={() => { activeFilter = activeFilter === 'in_review' ? 'all' : 'in_review'; }}
            class={`text-center bg-white border rounded-xl p-3 shadow-2xs transition-all flex flex-col items-center justify-center min-h-[64px] ${
              activeFilter === 'in_review' ? 'border-[#6E3511] bg-[#FCECD8]/40 ring-2 ring-[#6E3511]' : 'border-[#20251E]/10 hover:border-[#6E3511]/40'
            }`}
          >
            <span class="text-[10px] font-bold text-[#596052] uppercase tracking-wider">
              {isFil ? 'Pagsusuri' : 'In review'}
            </span>
            <span class="text-xl font-bold font-serif text-[#20251E] mt-0.5">
              {counts.inReview}
            </span>
          </button>

          <!-- Draft Card Mobile -->
          <button
            type="button"
            onclick={() => { activeFilter = activeFilter === 'draft' ? 'all' : 'draft'; }}
            class={`text-center bg-white border rounded-xl p-3 shadow-2xs transition-all flex flex-col items-center justify-center min-h-[64px] ${
              activeFilter === 'draft' ? 'border-[#4B5563] bg-[#F3F4F6]/60 ring-2 ring-[#4B5563]' : 'border-[#20251E]/10 hover:border-[#4B5563]/40'
            }`}
          >
            <span class="text-[10px] font-bold text-[#596052] uppercase tracking-wider">
              {isFil ? 'Burador' : 'Draft'}
            </span>
            <span class="text-xl font-bold font-serif text-[#20251E] mt-0.5">
              {counts.draft}
            </span>
          </button>
        </div>

        <!-- Mobile Primary CTA: Create Offer -->
        <button
          type="button"
          onclick={openCreateModal}
          class="w-full py-3 px-4 rounded-xl bg-[#597928] text-white hover:bg-[#47661E] font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 min-h-[48px]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>{isFil ? 'Gumawa ng alok' : 'Create offer'}</span>
        </button>
      </div>

      <!-- Desktop View (>= lg) -->
      <div class="hidden lg:grid mt-8 grid-cols-4 gap-4">
        <!-- Published Card -->
        <button
          type="button"
          onclick={() => { activeFilter = 'published'; }}
          class={`text-left bg-white border rounded-2xl p-5 shadow-xs transition-all flex items-center gap-4 ${
            activeFilter === 'published' ? 'border-[#597928] ring-2 ring-[#597928]/30' : 'border-[#20251E]/10 hover:border-[#597928]/40'
          }`}
        >
          <div class="w-12 h-12 rounded-xl bg-[#EBF3DF] text-[#47661E] flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div class="text-xs font-semibold text-[#596052] uppercase tracking-wider">
              {isFil ? 'Nailathala' : 'Published offers'}
            </div>
            <div class="text-2xl font-bold font-serif text-[#20251E] mt-0.5">
              {counts.published}
            </div>
          </div>
        </button>

        <!-- In Review Card -->
        <button
          type="button"
          onclick={() => { activeFilter = 'in_review'; }}
          class={`text-left bg-white border rounded-2xl p-5 shadow-xs transition-all flex items-center gap-4 ${
            activeFilter === 'in_review' ? 'border-[#6E3511] ring-2 ring-[#6E3511]/30' : 'border-[#20251E]/10 hover:border-[#6E3511]/40'
          }`}
        >
          <div class="w-12 h-12 rounded-xl bg-[#FCECD8] text-[#6E3511] flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div class="text-xs font-semibold text-[#596052] uppercase tracking-wider">
              {isFil ? 'Nasa pagsusuri' : 'In review'}
            </div>
            <div class="text-2xl font-bold font-serif text-[#20251E] mt-0.5">
              {counts.inReview}
            </div>
            <div class="text-[10px] text-[#6E3511] font-medium mt-0.5">
              Sample workflow state
            </div>
          </div>
        </button>

        <!-- Draft Offers Card -->
        <button
          type="button"
          onclick={() => { activeFilter = 'draft'; }}
          class={`text-left bg-white border rounded-2xl p-5 shadow-xs transition-all flex items-center gap-4 ${
            activeFilter === 'draft' ? 'border-[#4B5563] ring-2 ring-[#4B5563]/30' : 'border-[#20251E]/10 hover:border-[#4B5563]/40'
          }`}
        >
          <div class="w-12 h-12 rounded-xl bg-[#F3F4F6] text-[#4B5563] flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <div class="text-xs font-semibold text-[#596052] uppercase tracking-wider">
              {isFil ? 'Burador' : 'Draft offers'}
            </div>
            <div class="text-2xl font-bold font-serif text-[#20251E] mt-0.5">
              {counts.draft}
            </div>
          </div>
        </button>

        <!-- Primary CTA: Create Offer Desktop -->
        <div class="flex items-center">
          <button
            type="button"
            onclick={openCreateModal}
            class="w-full h-full min-h-[56px] py-4 px-6 rounded-2xl bg-[#597928] text-white hover:bg-[#47661E] font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>{isFil ? 'Gumawa ng alok' : 'Create offer'}</span>
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

    <!-- Table / List Container Card -->
    <div class="bg-white border border-[#20251E]/10 rounded-2xl shadow-xs overflow-hidden">
      <!-- Toolbar: Title, Filter Tabs, and Search Bar -->
      <div class="p-5 sm:p-6 border-b border-[#20251E]/10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-[#597928]/10 text-[#486320] flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <h2 class="font-serif text-xl font-bold text-[#20251E]">
              {isFil ? 'Talaan ng mga Alok' : 'Offer listings'}
            </h2>

          </div>
          <p class="text-xs text-[#596052] mt-1">
            {isFil
              ? 'Lumikha at pamahalaan ang mga alok upang kumuha ng sariwang ani mula sa mga lokal na magsasaka.'
              : 'Create and manage your offers to source fresh produce from local farmers.'}
          </p>
        </div>

        <!-- Controls: Search Input and Status Tabs -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <!-- Search Input -->
          <div class="relative min-w-[220px]">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[#596052]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              bind:value={searchQuery}
              placeholder={isFil ? 'Maghanap ng pananim...' : 'Search offers by crop...'}
              class="w-full pl-9 pr-3.5 py-2 text-xs bg-[#FFFDF8] border border-[#20251E]/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#597928] text-[#20251E]"
            />
          </div>

          <!-- Status Filter Tabs -->
          <div class="inline-flex bg-[#FFFDF8] border border-[#20251E]/15 rounded-xl p-1 gap-1" role="group" aria-label={isFil ? 'Salain ayon sa katayuan' : 'Filter offers by status'}>
            <button
              type="button"
              onclick={() => { activeFilter = 'all'; }}
              aria-pressed={activeFilter === 'all'}
              class={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'all' ? 'bg-[#597928] text-white shadow-xs' : 'text-[#4A5245] hover:text-[#20251E]'
              }`}
            >
              {isFil ? 'Lahat' : 'All'} ({offers.length})
            </button>
            <button
              type="button"
              onclick={() => { activeFilter = 'published'; }}
              aria-pressed={activeFilter === 'published'}
              class={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'published' ? 'bg-[#597928] text-white shadow-xs' : 'text-[#4A5245] hover:text-[#20251E]'
              }`}
            >
              {isFil ? 'Nailathala' : 'Published'} ({counts.published})
            </button>
            <button
              type="button"
              onclick={() => { activeFilter = 'in_review'; }}
              aria-pressed={activeFilter === 'in_review'}
              class={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'in_review' ? 'bg-[#6E3511] text-white shadow-xs' : 'text-[#4A5245] hover:text-[#20251E]'
              }`}
            >
              {isFil ? 'Pagsusuri' : 'In review'} ({counts.inReview})
            </button>
            <button
              type="button"
              onclick={() => { activeFilter = 'draft'; }}
              aria-pressed={activeFilter === 'draft'}
              class={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'draft' ? 'bg-[#4B5563] text-white shadow-xs' : 'text-[#4A5245] hover:text-[#20251E]'
              }`}
            >
              {isFil ? 'Burador' : 'Draft'} ({counts.draft})
            </button>
          </div>
        </div>
      </div>

      <!-- Desktop Table View (>= 768px) -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-[#20251E]/10 bg-[#FFFDF8]/80 text-[11px] font-bold text-[#596052] uppercase tracking-wider">
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
                <tr class="hover:bg-[#FFFDF8]/60 transition-colors">
                  <!-- Crop -->
                  <td class="py-4 px-6">
                    <div class="flex items-center gap-3">
                      <!-- Crop Illustration Badge -->
                      {#if offer.cropKey === 'tomato'}
                        <div class="w-10 h-10 rounded-xl bg-[#FDE8E8] text-[#9B1C1C] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          🍅
                        </div>
                      {:else if offer.cropKey === 'eggplant'}
                        <div class="w-10 h-10 rounded-xl bg-[#F3E8FF] text-[#6B21A8] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          🍆
                        </div>
                      {:else if offer.cropKey === 'calamansi'}
                        <div class="w-10 h-10 rounded-xl bg-[#ECFCCB] text-[#3F6212] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          🍋
                        </div>
                      {:else}
                        <div class="w-10 h-10 rounded-xl bg-[#EBF3DF] text-[#47661E] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          🌱
                        </div>
                      {/if}
                      <div>
                        <div class="font-serif font-bold text-base text-[#20251E]">
                          {offer.cropLabel}
                        </div>
                        {#if offer.location}
                          <div class="text-[11px] text-[#596052] flex items-center gap-1 mt-0.5">
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
                        <span class="text-[10px] text-[#6E3511] mt-0.5 pl-1">
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
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#4A5245] hover:text-[#20251E] hover:bg-[#FCECD8]/50 border border-[#20251E]/15 transition-colors flex items-center gap-1.5 min-h-[36px]"
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
                        class="p-1.5 rounded-lg text-[#596052] hover:text-[#9B1C1C] hover:bg-[#FDE8E8] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
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
