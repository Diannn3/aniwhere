export interface DemoTransportAssumption {
  placeId: string;
  amountPhp: number;
  label: string;
}

export const DEMO_TRANSPORT_ASSUMPTIONS: DemoTransportAssumption[] = [
  { placeId: 'demo-cooperative', amountPhp: 600, label: 'Demo hauling assumption' },
  { placeId: 'demo-processor', amountPhp: 300, label: 'Demo hauling assumption' },
  { placeId: 'demo-market', amountPhp: 300, label: 'Demo hauling assumption' },
  { placeId: 'demo-msme-confirm', amountPhp: 400, label: 'Demo hauling assumption' },
];
