import type { PlaceRecord } from '../lib/domain/types';
import { DEMO_SOURCE_ID } from './demo-sources';

export const DEMO_PLACES: PlaceRecord[] = [
  {
    id: 'demo-cooperative',
    slug: 'demo-cooperative',
    name: 'Santa Cruz Cooperative',
    category: 'cooperative',
    municipality: 'Santa Cruz',
    lat: 14.281,
    lng: 121.417,
    description:
      'Farmer-owned cooperative aggregation facility. Consolidates member and partner harvests for regional food terminals.',
    descriptionFil:
      'Pasilidad ng kooperatiba ng mga magsasaka. Pinagsasama-sama ang ani para sa mga rehiyonal na bagsakan.',
    publicStatus: 'reviewed',
    lastReviewedAt: '2026-09-17T08:00:00+08:00',
    sourceIds: [DEMO_SOURCE_ID],
  },
  {
    id: 'demo-processor',
    slug: 'demo-processor',
    name: 'Calamba Processor',
    category: 'processor',
    municipality: 'Calamba',
    lat: 14.214,
    lng: 121.164,
    description:
      'Local agricultural sauce and puree manufacturing facility. High-volume seasonal processing plant.',
    descriptionFil:
      'Lokal na pagawaan ng sarsa at puree. Tumatanggap ng maramihang ani para sa pagpoproseso.',
    publicStatus: 'reviewed',
    lastReviewedAt: '2026-09-17T08:00:00+08:00',
    sourceIds: [DEMO_SOURCE_ID],
  },
  {
    id: 'demo-market',
    slug: 'demo-market',
    name: 'Los Baños Market',
    category: 'market',
    municipality: 'Los Baños',
    lat: 14.18,
    lng: 121.243,
    description:
      'Municipal trading hub and public market stall association with daily direct consumer demand.',
    descriptionFil:
      'Bagsakan at pampublikong pamilihan ng bayan na may pang-araw-araw na mamimili.',
    publicStatus: 'reviewed',
    lastReviewedAt: '2026-09-17T08:00:00+08:00',
    sourceIds: [DEMO_SOURCE_ID],
  },
  {
    id: 'demo-msme-confirm',
    slug: 'demo-msme-confirm',
    name: 'San Pablo Food Workshop (Confirm Capacity)',
    category: 'msme',
    municipality: 'San Pablo',
    lat: 14.067,
    lng: 121.325,
    description:
      'Specialty culinary workshop and farm-to-table kitchen. Capacity fluctuates based on weekly orders.',
    descriptionFil:
      'Kusina at pagawaan ng lutuin. Pabago-bago ang dami depende sa lingguhang order.',
    publicStatus: 'reviewed',
    lastReviewedAt: '2026-09-17T08:00:00+08:00',
    sourceIds: [DEMO_SOURCE_ID],
  },
  {
    id: 'demo-organic-shop',
    slug: 'demo-organic-shop',
    name: 'Liliw Organic Shop',
    category: 'restaurant',
    municipality: 'Liliw',
    lat: 14.133,
    lng: 121.433,
    description: 'High-end salad bar and organic provisions shop.',
    descriptionFil: 'Tindahan ng mga organikong gulay at sangkap.',
    publicStatus: 'reviewed',
    lastReviewedAt: '2026-09-17T08:00:00+08:00',
    sourceIds: [DEMO_SOURCE_ID],
  },
];
