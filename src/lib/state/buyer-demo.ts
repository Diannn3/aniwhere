import type { BuyerDemoOffer } from '../domain/types';
import { todayInManila } from './url-state';
import { safeStorage } from './storage';

const STORAGE_KEY = 'aniwhere_buyer_offers';
const TODAY_IN_MANILA = todayInManila();
const LEGACY_DEFAULT_OFFERS: BuyerDemoOffer[] = [
  { id: 'offer-1', cropKey: 'tomato', cropLabel: 'Tomatoes', quantityKg: 300, pricePerKg: 28, status: 'published', updatedAt: '2026-09-17' },
  { id: 'offer-2', cropKey: 'eggplant', cropLabel: 'Eggplant', quantityKg: 150, status: 'in_review', updatedAt: '2026-09-17' },
  { id: 'offer-3', cropKey: 'calamansi', cropLabel: 'Calamansi', quantityKg: 100, status: 'draft', updatedAt: '2026-09-17' },
];

export const INITIAL_BUYER_OFFERS: BuyerDemoOffer[] = [
  {
    id: 'offer-1',
    cropKey: 'tomato',
    cropLabel: 'Tomatoes',
    quantityKg: 300,
    pricePerKg: 28,
    status: 'published',
    updatedAt: TODAY_IN_MANILA,
    deliveryWindow: 'Weekday mornings / Umaga ng mga karaniwang araw',
    location: 'Los Baños, Laguna',
    notes: 'Clean reusable crates; confirm grade before pickup / Malinis na muling-gagamitin na kahon; kumpirmahin ang kalidad bago kunin.',
  },
  {
    id: 'offer-2',
    cropKey: 'eggplant',
    cropLabel: 'Eggplant',
    quantityKg: 150,
    status: 'in_review',
    updatedAt: TODAY_IN_MANILA,
    deliveryWindow: 'Afternoons / Hapon',
    location: 'Calamba, Laguna',
    notes: 'Firm fruit in ventilated crates / Matitibay na bunga sa kahong may bentilasyon.',
  },
  {
    id: 'offer-3',
    cropKey: 'calamansi',
    cropLabel: 'Calamansi',
    quantityKg: 100,
    status: 'draft',
    updatedAt: TODAY_IN_MANILA,
    location: 'Santa Cruz, Laguna',
    notes: 'Packaging and pickup schedule to be agreed / Pag-uusapan pa ang balot at oras ng pagkuha.',
  },
  {
    id: 'offer-4',
    cropKey: 'banana',
    cropLabel: 'Banana',
    quantityKg: 500,
    pricePerKg: 18,
    status: 'published',
    updatedAt: TODAY_IN_MANILA,
    deliveryWindow: 'Early mornings / Maagang umaga',
    location: 'San Pablo, Laguna',
    notes: 'Mature green bunches; use clean crates / Hinog-sa-luntiang buwig; gumamit ng malinis na kahon.',
  },
  {
    id: 'offer-5',
    cropKey: 'papaya',
    cropLabel: 'Papaya',
    quantityKg: 220,
    status: 'in_review',
    updatedAt: TODAY_IN_MANILA,
    deliveryWindow: 'Twice weekly / Dalawang beses kada linggo',
    location: 'Bay, Laguna',
    notes: 'Ripeness and price still to confirm / Kukumpirmahin pa ang pagkahinog at presyo.',
  },
  {
    id: 'offer-6',
    cropKey: 'pechay',
    cropLabel: 'Pechay',
    quantityKg: 80,
    pricePerKg: 35,
    status: 'published',
    updatedAt: TODAY_IN_MANILA,
    deliveryWindow: 'Before 8 AM / Bago mag-8 n.u.',
    location: 'Calauan, Laguna',
    notes: 'Freshly harvested bundles in clean crates / Bagong aning tali sa malinis na kahon.',
  },
  {
    id: 'offer-7',
    cropKey: 'sitaw',
    cropLabel: 'String beans',
    quantityKg: 120,
    status: 'draft',
    updatedAt: TODAY_IN_MANILA,
    location: 'Pagsanjan, Laguna',
    notes: 'Pickup and grading still to confirm / Kukumpirmahin pa ang pagkuha at pag-uuri.',
  },
];

export function getBuyerOffers(): BuyerDemoOffer[] {
  const offers = safeStorage.getItem<BuyerDemoOffer[]>(STORAGE_KEY, INITIAL_BUYER_OFFERS);
  // Upgrade only untouched defaults. Locally edited offers must not be overwritten.
  if (JSON.stringify(offers) === JSON.stringify(LEGACY_DEFAULT_OFFERS)) {
    resetBuyerOffers();
    return INITIAL_BUYER_OFFERS;
  }
  return offers;
}

export function saveBuyerOffer(offer: BuyerDemoOffer): void {
  const current = getBuyerOffers();
  const existingIdx = current.findIndex((o) => o.id === offer.id);
  let updated: BuyerDemoOffer[];

  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = offer;
  } else {
    updated = [offer, ...current];
  }

  safeStorage.setItem(STORAGE_KEY, updated);
}

export function getBuyerOfferCounts(): { published: number; inReview: number; draft: number } {
  const offers = getBuyerOffers();
  return {
    published: offers.filter((o) => o.status === 'published').length,
    inReview: offers.filter((o) => o.status === 'in_review').length,
    draft: offers.filter((o) => o.status === 'draft').length,
  };
}

export function deleteBuyerOffer(id: string): void {
  const current = getBuyerOffers();
  const updated = current.filter((o) => o.id !== id);
  safeStorage.setItem(STORAGE_KEY, updated);
}

export function resetBuyerOffers(): void {
  safeStorage.setItem(STORAGE_KEY, INITIAL_BUYER_OFFERS);
}

