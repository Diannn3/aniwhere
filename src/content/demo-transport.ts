export interface DemoTransportAssumption {
  placeId: string;
  amountPhp: number;
  label: string;
}

export const DEMO_TRANSPORT_ASSUMPTIONS: DemoTransportAssumption[] = [
  { placeId: 'demo-cooperative', amountPhp: 600, label: 'Illustrative hauling estimate' },
  { placeId: 'demo-processor', amountPhp: 300, label: 'Illustrative hauling estimate' },
  { placeId: 'demo-market', amountPhp: 300, label: 'Illustrative hauling estimate' },
  { placeId: 'demo-msme-confirm', amountPhp: 400, label: 'Illustrative hauling estimate' },
  { placeId: 'demo-bay-trading', amountPhp: 450, label: 'Illustrative hauling estimate' },
  { placeId: 'demo-pagsanjan-hub', amountPhp: 550, label: 'Illustrative hauling estimate' },
  { placeId: 'demo-nagcarlan-kitchen', amountPhp: 650, label: 'Illustrative hauling estimate' },
  { placeId: 'demo-cabuyao-commissary', amountPhp: 350, label: 'Illustrative hauling estimate' },
];
