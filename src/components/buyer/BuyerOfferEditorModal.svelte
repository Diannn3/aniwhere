<script lang="ts">
  import type { BuyerDemoOffer, CropKey } from '../../lib/domain/types';
  import { SUPPORTED_CROPS, getCropLabel } from '../../lib/domain/crops';

  interface Props {
    isOpen: boolean;
    offerToEdit: BuyerDemoOffer | null;
    lang?: 'en' | 'fil';
    onSave: (offer: BuyerDemoOffer) => void;
    onClose: () => void;
  }

  const { isOpen, offerToEdit, lang = 'en', onSave, onClose } = $props();

  const isFil = $derived(lang === 'fil');

  let cropKey = $state<CropKey>('tomato');
  let customCropLabel = $state('');
  let quantityKg = $state<number>(300);
  let pricePerKg = $state<string>('');
  let status = $state<'published' | 'in_review' | 'draft'>('published');
  let deliveryWindow = $state('');
  let location = $state('Los Baños, Laguna');
  let notes = $state('');
  let errors = $state<Record<string, string>>({});

  // Synchronize state when modal opens or offerToEdit changes
  $effect(() => {
    if (isOpen) {
      errors = {};
      if (offerToEdit) {
        cropKey = offerToEdit.cropKey;
        customCropLabel = offerToEdit.cropKey === 'other' ? offerToEdit.cropLabel : '';
        quantityKg = offerToEdit.quantityKg;
        pricePerKg = offerToEdit.pricePerKg !== undefined ? String(offerToEdit.pricePerKg) : '';
        status = offerToEdit.status;
        deliveryWindow = offerToEdit.deliveryWindow || '';
        location = offerToEdit.location || 'Los Baños, Laguna';
        notes = offerToEdit.notes || '';
      } else {
        // Defaults for new offer
        cropKey = 'tomato';
        customCropLabel = '';
        quantityKg = 300;
        pricePerKg = '28';
        status = 'published';
        deliveryWindow = '2026-09-17';
        location = 'Los Baños, Laguna';
        notes = '';
      }
    }
  });

  function handleSave(e: Event) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (cropKey === 'other' && !customCropLabel.trim()) {
      newErrors.crop = isFil ? 'Pakilagay ang pangalan ng pananim' : 'Please specify the crop name';
    }

    if (!quantityKg || quantityKg <= 0) {
      newErrors.quantity = isFil ? 'Kailangan ng dami na higit sa 0 kg' : 'Quantity must be greater than 0 kg';
    }

    let parsedPrice: number | undefined = undefined;
    if (pricePerKg.trim() !== '') {
      parsedPrice = Number(pricePerKg);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        newErrors.price = isFil ? 'Ang presyo ay dapat higit sa 0' : 'Price must be greater than 0';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors;
      return;
    }

    const resolvedCropLabel =
      cropKey === 'other'
        ? customCropLabel.trim()
        : getCropLabel(cropKey, lang);

    const updatedOffer: BuyerDemoOffer = {
      id: offerToEdit?.id || `offer-${Date.now()}`,
      cropKey,
      cropLabel: resolvedCropLabel,
      quantityKg: Number(quantityKg),
      pricePerKg: parsedPrice,
      status,
      updatedAt: '2026-09-17',
      deliveryWindow: deliveryWindow.trim() || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    onSave(updatedOffer);
  }

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#20251E]/60 backdrop-blur-xs overflow-y-auto animate-fadeIn"
    role="presentation"
    onclick={handleBackdrop}
  >
    <div
      class="bg-[#FFFDF8] border border-[#20251E]/15 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-offer-title"
    >
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-[#20251E]/10 bg-[#FFFDF8] flex items-center justify-between">
        <div>
          <h2 id="modal-offer-title" class="font-serif text-xl font-bold text-[#20251E]">
            {offerToEdit
              ? (isFil ? 'Baguhin ang Alok' : 'Edit Buying Offer')
              : (isFil ? 'Gumawa ng Bagong Alok' : 'Create Buying Offer')}
          </h2>
          <p class="text-xs text-[#6B7265] mt-0.5">
            {isFil
              ? 'Naka-save sa device na ito lamang para sa demonstrasyon.'
              : 'Saved on this device only for hackathon demonstration.'}
          </p>
        </div>
        <button
          type="button"
          onclick={onClose}
          class="w-9 h-9 flex items-center justify-center rounded-lg text-[#6B7265] hover:text-[#20251E] hover:bg-[#FCECD8]/50 transition-colors"
          aria-label={isFil ? 'Isara' : 'Close dialog'}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Body Form -->
      <form onsubmit={handleSave} class="p-6 space-y-5">
        <!-- Crop Selection -->
        <div>
          <label for="offer-crop" class="block text-xs font-bold text-[#20251E] uppercase tracking-wider mb-1.5">
            {isFil ? 'Uri ng Pananim' : 'Crop'} <span class="text-[#6E3511]">*</span>
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            {#each SUPPORTED_CROPS as crop}
              <button
                type="button"
                onclick={() => { cropKey = crop.key; }}
                class={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center gap-1 min-h-[44px] justify-center ${
                  cropKey === crop.key
                    ? 'border-[#597928] bg-[#597928]/10 text-[#597928] ring-2 ring-[#597928]'
                    : 'border-[#20251E]/15 bg-white text-[#4A5245] hover:border-[#597928]/50'
                }`}
              >
                <span>{isFil ? crop.labelFil : crop.labelEn}</span>
              </button>
            {/each}
            <button
              type="button"
              onclick={() => { cropKey = 'other'; }}
              class={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center gap-1 min-h-[44px] justify-center ${
                cropKey === 'other'
                  ? 'border-[#597928] bg-[#597928]/10 text-[#597928] ring-2 ring-[#597928]'
                  : 'border-[#20251E]/15 bg-white text-[#4A5245] hover:border-[#597928]/50'
              }`}
            >
              <span>{isFil ? 'Iba Pa' : 'Other Crop'}</span>
            </button>
          </div>

          {#if cropKey === 'other'}
            <input
              id="offer-crop-custom"
              type="text"
              bind:value={customCropLabel}
              placeholder={isFil ? 'Hal. Sitaw, Luya, Mais' : 'e.g. String beans, Ginger, Corn'}
              class="w-full px-3.5 py-2 text-sm bg-white border border-[#20251E]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#597928] text-[#20251E]"
            />
          {/if}
          {#if errors.crop}
            <p class="text-xs text-[#6E3511] font-medium mt-1">{errors.crop}</p>
          {/if}
        </div>

        <!-- Quantity and Price Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Quantity -->
          <div>
            <label for="offer-qty" class="block text-xs font-bold text-[#20251E] uppercase tracking-wider mb-1.5">
              {isFil ? 'Dami (kg)' : 'Target Quantity (kg)'} <span class="text-[#6E3511]">*</span>
            </label>
            <div class="relative">
              <input
                id="offer-qty"
                type="number"
                min="1"
                step="1"
                bind:value={quantityKg}
                class="w-full px-3.5 py-2.5 pr-10 text-sm font-semibold bg-white border border-[#20251E]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#597928] text-[#20251E]"
                required
              />
              <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B7265]">
                kg
              </span>
            </div>
            {#if errors.quantity}
              <p class="text-xs text-[#6E3511] font-medium mt-1">{errors.quantity}</p>
            {/if}
          </div>

          <!-- Price per kg -->
          <div>
            <label for="offer-price" class="block text-xs font-bold text-[#20251E] uppercase tracking-wider mb-1.5">
              {isFil ? 'Alok na Presyo (PHP/kg)' : 'Buying Price (PHP/kg)'}
              <span class="text-[10px] font-normal text-[#6B7265] lowercase">
                ({isFil ? 'opsyonal' : 'optional'})
              </span>
            </label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B7265]">
                ₱
              </span>
              <input
                id="offer-price"
                type="number"
                min="0"
                step="0.5"
                bind:value={pricePerKg}
                placeholder={isFil ? 'Walang nakasaad' : 'Price not posted'}
                class="w-full pl-8 pr-3.5 py-2.5 text-sm font-semibold bg-white border border-[#20251E]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#597928] text-[#20251E]"
              />
            </div>
            {#if errors.price}
              <p class="text-xs text-[#6E3511] font-medium mt-1">{errors.price}</p>
            {/if}
          </div>
        </div>

        <!-- Status Selector (Radio segmented) -->
        <div>
          <label class="block text-xs font-bold text-[#20251E] uppercase tracking-wider mb-2">
            {isFil ? 'Katayuan ng Alok' : 'Offer Status'}
          </label>
          <div class="grid grid-cols-3 gap-2">
            <!-- Published -->
            <label
              class={`cursor-pointer p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 min-h-[56px] justify-center ${
                status === 'published'
                  ? 'border-[#597928] bg-[#EBF3DF] text-[#47661E] ring-2 ring-[#597928]'
                  : 'border-[#20251E]/15 bg-white text-[#4A5245] hover:border-[#597928]/40'
              }`}
            >
              <input
                type="radio"
                name="offer-status"
                value="published"
                bind:group={status}
                class="sr-only"
              />
              <span class="text-xs font-bold">{isFil ? 'Nailathala' : 'Published'}</span>
              <span class="text-[10px] opacity-75">{isFil ? 'Makikita sa demo' : 'Active in demo'}</span>
            </label>

            <!-- In Review -->
            <label
              class={`cursor-pointer p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 min-h-[56px] justify-center ${
                status === 'in_review'
                  ? 'border-[#6E3511] bg-[#FCECD8] text-[#6E3511] ring-2 ring-[#6E3511]'
                  : 'border-[#20251E]/15 bg-white text-[#4A5245] hover:border-[#6E3511]/40'
              }`}
            >
              <input
                type="radio"
                name="offer-status"
                value="in_review"
                bind:group={status}
                class="sr-only"
              />
              <span class="text-xs font-bold">{isFil ? 'Nasa pagsusuri' : 'In review'}</span>
              <span class="text-[10px] opacity-75">{isFil ? 'Sample workflow' : 'Sample workflow'}</span>
            </label>

            <!-- Draft -->
            <label
              class={`cursor-pointer p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 min-h-[56px] justify-center ${
                status === 'draft'
                  ? 'border-[#4B5563] bg-[#F3F4F6] text-[#1F2937] ring-2 ring-[#4B5563]'
                  : 'border-[#20251E]/15 bg-white text-[#4A5245] hover:border-[#4B5563]/40'
              }`}
            >
              <input
                type="radio"
                name="offer-status"
                value="draft"
                bind:group={status}
                class="sr-only"
              />
              <span class="text-xs font-bold">{isFil ? 'Burador' : 'Draft'}</span>
              <span class="text-[10px] opacity-75">{isFil ? 'Hindi pa aktibo' : 'Internal draft'}</span>
            </label>
          </div>
        </div>

        <!-- Receiving Details: Delivery Window & Location -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="offer-window" class="block text-xs font-bold text-[#20251E] uppercase tracking-wider mb-1.5">
              {isFil ? 'Petsa ng Pagtanggap' : 'Delivery Window'}
            </label>
            <input
              id="offer-window"
              type="text"
              bind:value={deliveryWindow}
              placeholder="e.g. 2026-09-17 or Sept 17-20"
              class="w-full px-3.5 py-2.5 text-sm bg-white border border-[#20251E]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#597928] text-[#20251E]"
            />
          </div>

          <div>
            <label for="offer-location" class="block text-xs font-bold text-[#20251E] uppercase tracking-wider mb-1.5">
              {isFil ? 'Lugar ng Pagtanggap' : 'Receiving Location'}
            </label>
            <input
              id="offer-location"
              type="text"
              bind:value={location}
              placeholder="e.g. Los Baños, Laguna"
              class="w-full px-3.5 py-2.5 text-sm bg-white border border-[#20251E]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#597928] text-[#20251E]"
            />
          </div>
        </div>

        <!-- Requirements / Notes -->
        <div>
          <label for="offer-notes" class="block text-xs font-bold text-[#20251E] uppercase tracking-wider mb-1.5">
            {isFil ? 'Kondisyon sa Pagtanggap' : 'Receiving Specs & Terms'}
          </label>
          <textarea
            id="offer-notes"
            rows="2"
            bind:value={notes}
            placeholder={isFil ? 'Hal. Ripe, walang pasa, nakalagay sa malinis na crate' : 'e.g. Grade A, undamaged, delivered in plastic crates'}
            class="w-full px-3.5 py-2 text-sm bg-white border border-[#20251E]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#597928] text-[#20251E]"
          ></textarea>
        </div>

        <!-- Action Buttons -->
        <div class="pt-3 border-t border-[#20251E]/10 flex items-center justify-end gap-3">
          <button
            type="button"
            onclick={onClose}
            class="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#4A5245] hover:bg-[#20251E]/5 transition-colors min-h-[44px]"
          >
            {isFil ? 'Kanselahin' : 'Cancel'}
          </button>
          <button
            type="submit"
            class="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#597928] text-white hover:bg-[#47661E] shadow-sm transition-all min-h-[44px] flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>
              {offerToEdit
                ? (isFil ? 'I-save ang Pagbabago' : 'Update Offer')
                : (isFil ? 'I-save ang Alok' : 'Save Offer')}
            </span>
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
