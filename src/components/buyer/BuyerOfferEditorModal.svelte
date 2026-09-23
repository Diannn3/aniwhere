<script lang="ts">
  import type { BuyerDemoOffer, CropKey } from '../../lib/domain/types';
  import { SUPPORTED_CROPS, getCropLabel } from '../../lib/domain/crops';
  import { todayInManila } from '../../lib/state/url-state';

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
        deliveryWindow = todayInManila();
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
      updatedAt: todayInManila(),
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
  // Mount outside page filters, which otherwise contain fixed positioning.
  function mountOverlay(node: HTMLElement) {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.appendChild(node);
    queueMicrotask(() => node.querySelector<HTMLButtonElement>('button')?.focus());
    return {
      destroy: () => {
        node.remove();
        previouslyFocused?.focus();
      },
    };
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  function handleDialogKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    const dialog = e.currentTarget as HTMLElement;
    const controls = [...dialog.querySelectorAll<HTMLElement>('button, input, textarea')]
      .filter((control) => control.offsetParent !== null && !control.hasAttribute('disabled'));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
  <div
    use:mountOverlay
    class="fixed inset-0 z-50 flex items-center justify-center bg-[#20251E]/60 p-2 sm:p-6 animate-fadeIn"
    role="presentation"
    onclick={handleBackdrop}
  >
    <div
      class="flex h-[calc(100dvh-1rem)] w-full min-h-0 flex-col overflow-hidden rounded-xl bg-[#FFFDF8] shadow-[0_24px_64px_-24px_rgba(32,37,30,0.45)] sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-[640px]"
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-labelledby="modal-offer-title"
      onkeydown={handleDialogKeyDown}
    >
      <!-- Modal Header -->
      <div class="flex shrink-0 items-start justify-between gap-4 border-b border-[#20251E]/20 px-5 py-5 sm:px-8 sm:py-7">
        <div>
          <h2 id="modal-offer-title" class="text-2xl font-bold leading-tight text-[#20251E] sm:text-3xl">
            {offerToEdit
              ? (isFil ? 'Baguhin ang Alok' : 'Edit Buying Offer')
              : (isFil ? 'Gumawa ng Bagong Alok' : 'Create Buying Offer')}
          </h2>
        </div>
        <button
          type="button"
          onclick={onClose}
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#4A5245] transition-colors hover:bg-[#FCECD8]/60 hover:text-[#20251E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]"
          aria-label={isFil ? 'Isara' : 'Close dialog'}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Body Form -->
      <form onsubmit={handleSave} class="flex min-h-0 flex-1 flex-col">
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-8">
          <!-- Crop selection -->
          <fieldset class="border-b border-[#20251E]/15 py-6 sm:py-7">
            <legend class="mb-3 text-xs font-bold uppercase tracking-wider text-[#20251E]">
              {isFil ? 'Uri ng Pananim' : 'Crop'} <span class="text-[#6E3511]">*</span>
            </legend>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-describedby={errors.crop ? 'offer-crop-error' : undefined}>
              {#each SUPPORTED_CROPS as crop}
                <label class={`relative flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-sm font-semibold transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#597928] ${
                  cropKey === crop.key
                    ? 'border-[#597928] bg-[#FCECD8]/60 text-[#20251E]'
                    : 'border-[#20251E]/20 bg-white text-[#4A5245] hover:border-[#597928]'
                }`}>
                  <input type="radio" name="offer-crop" value={crop.key} bind:group={cropKey} class="sr-only" />
                  {isFil ? crop.labelFil : crop.labelEn}
                </label>
              {/each}
              <label class={`relative flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-sm font-semibold transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#597928] ${
                cropKey === 'other'
                  ? 'border-[#597928] bg-[#FCECD8]/60 text-[#20251E]'
                  : 'border-[#20251E]/20 bg-white text-[#4A5245] hover:border-[#597928]'
              }`}>
                <input type="radio" name="offer-crop" value="other" bind:group={cropKey} class="sr-only" />
                {isFil ? 'Iba Pa' : 'Other Crop'}
              </label>
            </div>
            {#if cropKey === 'other'}
              <label for="offer-crop-custom" class="mt-4 block text-sm font-semibold text-[#20251E]">
                {isFil ? 'Pangalan ng pananim' : 'Crop name'}
              </label>
              <input
                id="offer-crop-custom"
                type="text"
                bind:value={customCropLabel}
                aria-invalid={!!errors.crop}
                aria-describedby={errors.crop ? 'offer-crop-error' : undefined}
                placeholder={isFil ? 'Hal. Sitaw, Luya, Mais' : 'e.g. String beans, Ginger, Corn'}
                class="mt-2 w-full rounded-lg border border-[#20251E]/25 bg-white px-3.5 py-3 text-base text-[#20251E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]"
              />
            {/if}
            {#if errors.crop}
              <p id="offer-crop-error" class="mt-2 text-sm font-medium text-[#6E3511]">{errors.crop}</p>
            {/if}
          </fieldset>

          <!-- Quantity and price -->
          <div class="grid grid-cols-1 gap-5 border-b border-[#20251E]/15 py-6 sm:grid-cols-2 sm:gap-6 sm:py-7">
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
                aria-invalid={!!errors.quantity}
                aria-describedby={errors.quantity ? 'offer-quantity-error' : undefined}
                class="w-full rounded-lg border border-[#20251E]/25 bg-white px-3.5 py-3 pr-10 text-base font-semibold text-[#20251E] tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]"
                required
              />
              <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#596052]">
                kg
              </span>
            </div>
            {#if errors.quantity}
              <p id="offer-quantity-error" class="mt-2 text-sm font-medium text-[#6E3511]">{errors.quantity}</p>
            {/if}
          </div>

          <!-- Price per kg -->
          <div>
            <label for="offer-price" class="block text-xs font-bold text-[#20251E] uppercase tracking-wider mb-1.5">
              {isFil ? 'Alok na Presyo (PHP/kg)' : 'Buying Price (PHP/kg)'}
              <span class="text-xs font-normal text-[#596052] lowercase">
                ({isFil ? 'opsyonal' : 'optional'})
              </span>
            </label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#596052]">
                ₱
              </span>
              <input
                id="offer-price"
                type="number"
                min="0"
                step="0.5"
                bind:value={pricePerKg}
                aria-invalid={!!errors.price}
                aria-describedby={errors.price ? 'offer-price-error' : undefined}
                placeholder={isFil ? 'Walang nakasaad' : 'Price not posted'}
                class="w-full rounded-lg border border-[#20251E]/25 bg-white py-3 pl-8 pr-3.5 text-base font-semibold text-[#20251E] tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]"
              />
            </div>
            {#if errors.price}
              <p id="offer-price-error" class="mt-2 text-sm font-medium text-[#6E3511]">{errors.price}</p>
            {/if}
          </div>
        </div>

          <!-- Status selector -->
          <fieldset class="border-b border-[#20251E]/15 py-6 sm:py-7">
            <legend class="mb-3 text-xs font-bold uppercase tracking-wider text-[#20251E]">
              {isFil ? 'Katayuan ng Alok' : 'Offer Status'}
            </legend>
            <div class="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
              <label class={`flex min-h-14 cursor-pointer flex-col justify-center rounded-lg border px-4 py-2.5 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#597928] ${
                status === 'published'
                  ? 'border-[#597928] bg-[#FCECD8]/60 text-[#20251E]'
                  : 'border-[#20251E]/20 bg-white text-[#4A5245] hover:border-[#597928]'
              }`}>
                <input type="radio" name="offer-status" value="published" bind:group={status} class="sr-only" />
                <span class="text-sm font-bold">{isFil ? 'Nailathala' : 'Published'}</span>
              </label>
              <label class={`flex min-h-14 cursor-pointer flex-col justify-center rounded-lg border px-4 py-2.5 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#597928] ${
                status === 'in_review'
                  ? 'border-[#6E3511] bg-[#FCECD8]/60 text-[#20251E]'
                  : 'border-[#20251E]/20 bg-white text-[#4A5245] hover:border-[#597928]'
              }`}>
                <input type="radio" name="offer-status" value="in_review" bind:group={status} class="sr-only" />
                <span class="text-sm font-bold">{isFil ? 'Nasa pagsusuri' : 'In review'}</span>
              </label>
              <label class={`flex min-h-14 cursor-pointer flex-col justify-center rounded-lg border px-4 py-2.5 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#597928] ${
                status === 'draft'
                  ? 'border-[#20251E]/50 bg-[#FCECD8]/35 text-[#20251E]'
                  : 'border-[#20251E]/20 bg-white text-[#4A5245] hover:border-[#597928]'
              }`}>
                <input type="radio" name="offer-status" value="draft" bind:group={status} class="sr-only" />
                <span class="text-sm font-bold">{isFil ? 'Burador' : 'Draft'}</span>
                <span class="text-xs text-[#4A5245]">{isFil ? 'Hindi pa aktibo' : 'Internal draft'}</span>
              </label>
            </div>
          </fieldset>

          <!-- Receiving details -->
          <div class="grid grid-cols-1 gap-5 border-b border-[#20251E]/15 py-6 sm:grid-cols-2 sm:gap-6 sm:py-7">
          <div>
            <label for="offer-window" class="block text-xs font-bold text-[#20251E] uppercase tracking-wider mb-1.5">
              {isFil ? 'Petsa ng Pagtanggap' : 'Delivery Window'}
            </label>
            <input
              id="offer-window"
              type="text"
              bind:value={deliveryWindow}
              placeholder="e.g. YYYY-MM-DD or Sep 18-20"
              class="w-full rounded-lg border border-[#20251E]/25 bg-white px-3.5 py-3 text-base text-[#20251E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]"
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
              class="w-full rounded-lg border border-[#20251E]/25 bg-white px-3.5 py-3 text-base text-[#20251E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]"
            />
          </div>
        </div>

        <!-- Requirements / Notes -->
        <div class="py-6 sm:py-7">
          <label for="offer-notes" class="block text-xs font-bold text-[#20251E] uppercase tracking-wider mb-1.5">
            {isFil ? 'Kondisyon sa Pagtanggap' : 'Receiving Specs & Terms'}
          </label>
          <textarea
            id="offer-notes"
            rows="3"
            bind:value={notes}
            placeholder={isFil ? 'Hal. Ripe, walang pasa, nakalagay sa malinis na crate' : 'e.g. Grade A, undamaged, delivered in plastic crates'}
            class="w-full resize-y rounded-lg border border-[#20251E]/25 bg-white px-3.5 py-3 text-base text-[#20251E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]"
          ></textarea>
        </div>
        </div>

        <!-- Actions remain visible while the form scrolls -->
        <div class="flex shrink-0 items-center justify-end gap-2 border-t border-[#20251E]/20 bg-[#FFFDF8] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-3 sm:px-8">
          <button
            type="button"
            onclick={onClose}
            class="min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold text-[#4A5245] transition-colors hover:bg-[#20251E]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]"
          >
            {isFil ? 'Kanselahin' : 'Cancel'}
          </button>
          <button
            type="submit"
            class="flex min-h-11 items-center gap-2 rounded-lg bg-[#597928] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#486320] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]"
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
