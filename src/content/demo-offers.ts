import type { BuyerOfferRecord } from '../lib/domain/types';
import { DEMO_SOURCE_ID } from './demo-sources';

// Invented quantities and prices for the demo only, not live buyer demand.
const WINDOW = {
  status: 'active' as const,
  validFrom: '2026-09-17',
  validUntil: '2026-09-30',
  updatedAt: '2026-09-17T08:00:00+08:00',
  sourceId: DEMO_SOURCE_ID,
};

export const DEMO_OFFERS: BuyerOfferRecord[] = [
  {
    id: 'offer-demo-cooperative-tomato',
    placeId: 'demo-cooperative',
    cropKey: 'tomato',
    maxKg: 500,
    pricePerKg: 28,
    receivingStartTime: '06:00',
    receivingEndTime: '11:00',
    ...WINDOW,
  },
  {
    id: 'offer-demo-cooperative-eggplant',
    placeId: 'demo-cooperative',
    cropKey: 'eggplant',
    maxKg: 300,
    pricePerKg: 25,
    ...WINDOW,
  },
  {
    id: 'offer-demo-cooperative-calamansi',
    placeId: 'demo-cooperative',
    cropKey: 'calamansi',
    maxKg: 200,
    pricePerKg: 45,
    ...WINDOW,
  },
  {
    id: 'offer-demo-processor-tomato',
    placeId: 'demo-processor',
    cropKey: 'tomato',
    maxKg: 1000,
    pricePerKg: 32,
    ...WINDOW,
  },
  {
    id: 'offer-demo-processor-eggplant',
    placeId: 'demo-processor',
    cropKey: 'eggplant',
    maxKg: 200,
    pricePerKg: 22,
    ...WINDOW,
  },
  {
    id: 'offer-demo-market-tomato',
    placeId: 'demo-market',
    cropKey: 'tomato',
    maxKg: 200,
    pricePerKg: 30,
    ...WINDOW,
  },
  {
    id: 'offer-demo-market-calamansi',
    placeId: 'demo-market',
    cropKey: 'calamansi',
    maxKg: 150,
    pricePerKg: 48,
    ...WINDOW,
  },
  {
    id: 'offer-demo-msme-tomato',
    placeId: 'demo-msme-confirm',
    cropKey: 'tomato',
    pricePerKg: 35,
    ...WINDOW,
  },
  {
    id: 'offer-demo-organic-eggplant',
    placeId: 'demo-organic-shop',
    cropKey: 'eggplant',
    maxKg: 100,
    pricePerKg: 40,
    ...WINDOW,
  },

  { id: 'offer-demo-cooperative-banana', placeId: 'demo-cooperative', cropKey: 'banana', maxKg: 400, pricePerKg: 18, ...WINDOW },
  { id: 'offer-demo-pagsanjan-banana', placeId: 'demo-pagsanjan-hub', cropKey: 'banana', maxKg: 220, pricePerKg: 21, ...WINDOW },
  { id: 'offer-demo-binan-banana', placeId: 'demo-binan-store', cropKey: 'banana', maxKg: 80, pricePerKg: 24, ...WINDOW },
  { id: 'offer-demo-nagcarlan-banana', placeId: 'demo-nagcarlan-kitchen', cropKey: 'banana', pricePerKg: 20, ...WINDOW },

  { id: 'offer-demo-cooperative-papaya', placeId: 'demo-cooperative', cropKey: 'papaya', maxKg: 350, pricePerKg: 24, ...WINDOW },
  { id: 'offer-demo-bay-papaya', placeId: 'demo-bay-trading', cropKey: 'papaya', maxKg: 120, pricePerKg: 26, ...WINDOW },
  { id: 'offer-demo-nagcarlan-papaya', placeId: 'demo-nagcarlan-kitchen', cropKey: 'papaya', pricePerKg: 30, ...WINDOW },
  { id: 'offer-demo-victoria-papaya', placeId: 'demo-victoria-eatery', cropKey: 'papaya', maxKg: 40, ...WINDOW },
  {
    id: 'offer-demo-cabuyao-papaya', placeId: 'demo-cabuyao-commissary', cropKey: 'papaya',
    maxKg: 200, pricePerKg: 27,
    requirements: [{ field: 'grade', acceptedValues: ['ripe'], label: 'Ripe grade', labelFil: 'Hinog na klase' }],
    ...WINDOW,
  },

  { id: 'offer-demo-market-pechay', placeId: 'demo-market', cropKey: 'pechay', maxKg: 180, pricePerKg: 34, ...WINDOW },
  { id: 'offer-demo-binan-pechay', placeId: 'demo-binan-store', cropKey: 'pechay', maxKg: 50, pricePerKg: 38, ...WINDOW },
  {
    id: 'offer-demo-bay-pechay', placeId: 'demo-bay-trading', cropKey: 'pechay',
    maxKg: 90, pricePerKg: 36,
    requirements: [{ field: 'packaging', acceptedValues: ['bundles'], label: 'Bundled packaging', labelFil: 'Nakatali na balot' }],
    ...WINDOW,
  },
  { id: 'offer-demo-victoria-pechay', placeId: 'demo-victoria-eatery', cropKey: 'pechay', maxKg: 15, ...WINDOW },

  { id: 'offer-demo-bay-sitaw', placeId: 'demo-bay-trading', cropKey: 'sitaw', maxKg: 150, pricePerKg: 42, ...WINDOW },
  { id: 'offer-demo-binan-sitaw', placeId: 'demo-binan-store', cropKey: 'sitaw', maxKg: 60, pricePerKg: 45, ...WINDOW },
  { id: 'offer-demo-pagsanjan-sitaw', placeId: 'demo-pagsanjan-hub', cropKey: 'sitaw', pricePerKg: 40, ...WINDOW },
  { id: 'offer-demo-victoria-sitaw', placeId: 'demo-victoria-eatery', cropKey: 'sitaw', maxKg: 25, ...WINDOW },

  { id: 'offer-demo-bay-tomato', placeId: 'demo-bay-trading', cropKey: 'tomato', maxKg: 140, pricePerKg: 29, ...WINDOW },
  { id: 'offer-demo-binan-tomato', placeId: 'demo-binan-store', cropKey: 'tomato', maxKg: 55, pricePerKg: 33, ...WINDOW },
  { id: 'offer-demo-cabuyao-tomato', placeId: 'demo-cabuyao-commissary', cropKey: 'tomato', ...WINDOW },
  { id: 'offer-demo-pagsanjan-eggplant', placeId: 'demo-pagsanjan-hub', cropKey: 'eggplant', maxKg: 240, pricePerKg: 26, ...WINDOW },
  { id: 'offer-demo-victoria-eggplant', placeId: 'demo-victoria-eatery', cropKey: 'eggplant', maxKg: 20, ...WINDOW },
  { id: 'offer-demo-nagcarlan-calamansi', placeId: 'demo-nagcarlan-kitchen', cropKey: 'calamansi', maxKg: 120, pricePerKg: 46, ...WINDOW },
  {
    id: 'offer-demo-cabuyao-calamansi', placeId: 'demo-cabuyao-commissary', cropKey: 'calamansi',
    maxKg: 300, pricePerKg: 43, ...WINDOW, status: 'paused',
  },
];
