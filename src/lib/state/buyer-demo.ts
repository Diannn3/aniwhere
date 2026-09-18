import type { BuyerDemoOffer } from '../domain/types';
import { safeStorage } from './storage';

const STORAGE_KEY = 'aniwhere_buyer_offers';

export const INITIAL_BUYER_OFFERS: BuyerDemoOffer[] = [
  {
    id: 'offer-1',
    cropKey: 'tomato',
    cropLabel: 'Tomatoes',
    quantityKg: 300,
    pricePerKg: 28,
    status: 'published',
    updatedAt: '2026-09-17',
  },
  {
    id: 'offer-2',
    cropKey: 'eggplant',
    cropLabel: 'Eggplant',
    quantityKg: 150,
    status: 'in_review',
    updatedAt: '2026-09-17',
  },
  {
    id: 'offer-3',
    cropKey: 'calamansi',
    cropLabel: 'Calamansi',
    quantityKg: 100,
    status: 'draft',
    updatedAt: '2026-09-17',
  },
];

export function getBuyerOffers(): BuyerDemoOffer[] {
  return safeStorage.getItem<BuyerDemoOffer[]>(STORAGE_KEY, INITIAL_BUYER_OFFERS);
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

