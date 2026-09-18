import type { BuyerOfferRecord } from '../lib/domain/types';
import { DEMO_SOURCE_ID } from './demo-sources';

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
];
