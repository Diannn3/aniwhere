import { describe, it, expect, beforeEach } from 'vitest';
import {
  INITIAL_BUYER_OFFERS,
  getBuyerOffers,
  saveBuyerOffer,
  deleteBuyerOffer,
  getBuyerOfferCounts,
  resetBuyerOffers,
} from './buyer-demo';
import { safeStorage } from './storage';

describe('Buyer Demo State Management', () => {
  beforeEach(() => {
    resetBuyerOffers();
  });

  it('upgrades untouched old defaults without discarding locally edited offers', () => {
    const legacy = INITIAL_BUYER_OFFERS.slice(0, 3).map(
      ({ deliveryWindow, location, notes, ...offer }) => ({ ...offer, updatedAt: '2026-09-17' })
    );
    safeStorage.setItem('aniwhere_buyer_offers', legacy);
    expect(getBuyerOffers()).toEqual(INITIAL_BUYER_OFFERS);

    safeStorage.setItem('aniwhere_buyer_offers', [{ ...legacy[0], quantityKg: 425 }, ...legacy.slice(1)]);
    expect(getBuyerOffers()).toHaveLength(3);
    expect(getBuyerOffers()[0].quantityKg).toBe(425);
  });

  it('saves and updates existing offers', () => {
    const updatedOffer = {
      ...INITIAL_BUYER_OFFERS[0],
      quantityKg: 500,
      pricePerKg: 30,
    };
    saveBuyerOffer(updatedOffer);

    const offers = getBuyerOffers();
    expect(offers.filter((o) => o.id === updatedOffer.id)).toHaveLength(1);
    const found = offers.find((o) => o.id === 'offer-1');
    expect(found?.quantityKg).toBe(500);
    expect(found?.pricePerKg).toBe(30);
  });

  it('adds a new offer', () => {
    saveBuyerOffer({
      id: 'offer-new',
      cropKey: 'calamansi',
      cropLabel: 'Calamansi',
      quantityKg: 250,
      pricePerKg: 45,
      status: 'published',
      updatedAt: '2026-09-18',
    });
    const counts = getBuyerOfferCounts();

    expect(counts.published).toBe(INITIAL_BUYER_OFFERS.filter((offer) => offer.status === 'published').length + 1);
    expect(getBuyerOffers().some((offer) => offer.id === 'offer-new')).toBe(true);
  });

  it('deletes an offer by id', () => {
    deleteBuyerOffer('offer-3');
    const offers = getBuyerOffers();
    expect(offers.find((o) => o.id === 'offer-3')).toBeUndefined();
    expect(getBuyerOfferCounts().draft).toBe(
      INITIAL_BUYER_OFFERS.filter((offer) => offer.status === 'draft').length - 1
    );
  });
});
