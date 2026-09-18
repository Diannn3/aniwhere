import { describe, it, expect, beforeEach } from 'vitest';
import {
  INITIAL_BUYER_OFFERS,
  getBuyerOffers,
  saveBuyerOffer,
  deleteBuyerOffer,
  getBuyerOfferCounts,
  resetBuyerOffers,
} from './buyer-demo';

describe('Buyer Demo State Management', () => {
  beforeEach(() => {
    resetBuyerOffers();
  });

  it('has exactly 3 initial fixtures: 1 published, 1 in review, 1 draft', () => {
    const offers = getBuyerOffers();
    expect(offers).toHaveLength(3);

    const counts = getBuyerOfferCounts();
    expect(counts.published).toBe(1);
    expect(counts.inReview).toBe(1);
    expect(counts.draft).toBe(1);

    expect(offers[0].cropKey).toBe('tomato');
    expect(offers[0].status).toBe('published');
    expect(offers[0].quantityKg).toBe(300);
    expect(offers[0].pricePerKg).toBe(28);

    expect(offers[1].cropKey).toBe('eggplant');
    expect(offers[1].status).toBe('in_review');
    expect(offers[1].pricePerKg).toBeUndefined();

    expect(offers[2].cropKey).toBe('calamansi');
    expect(offers[2].status).toBe('draft');
  });

  it('saves and updates existing offers', () => {
    const updatedOffer = {
      ...INITIAL_BUYER_OFFERS[0],
      quantityKg: 500,
      pricePerKg: 30,
    };
    saveBuyerOffer(updatedOffer);

    const offers = getBuyerOffers();
    expect(offers).toHaveLength(3);
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
    expect(counts.published).toBe(2);
    expect(getBuyerOffers()).toHaveLength(4);
  });

  it('deletes an offer by id', () => {
    deleteBuyerOffer('offer-3');
    const offers = getBuyerOffers();
    expect(offers).toHaveLength(2);
    expect(offers.find((o) => o.id === 'offer-3')).toBeUndefined();
    expect(getBuyerOfferCounts().draft).toBe(0);
  });
});
