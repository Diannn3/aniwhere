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
  const value = safeStorage.getItem<unknown>(STORAGE_KEY, INITIAL_BUYER_OFFERS);
  return Array.isArray(value) ? value.filter((offer): offer is BuyerDemoOffer => offer && typeof offer === 'object' && typeof offer.id === 'string' && typeof offer.cropKey === 'string') : INITIAL_BUYER_OFFERS;
}

export function saveBuyerOffer(offer: BuyerDemoOffer): boolean {
  const current = getBuyerOffers();
  const existingIdx = current.findIndex((o) => o.id === offer.id);
  let updated: BuyerDemoOffer[];

  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = offer;
  } else {
    updated = [offer, ...current];
  }

  return safeStorage.setItem(STORAGE_KEY, updated);
}

export function getBuyerOfferCounts(): { published: number; inReview: number; draft: number } {
  const offers = getBuyerOffers();
  return {
    published: offers.filter((o) => o.status === 'published').length,
    inReview: offers.filter((o) => o.status === 'in_review').length,
    draft: offers.filter((o) => o.status === 'draft').length,
  };
}

export function deleteBuyerOffer(id: string): boolean {
  const current = getBuyerOffers();
  const updated = current.filter((o) => o.id !== id);
  return safeStorage.setItem(STORAGE_KEY, updated);
}

export function resetBuyerOffers(): boolean {
  return safeStorage.setItem(STORAGE_KEY, INITIAL_BUYER_OFFERS);
}

