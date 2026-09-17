export interface Municipality {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const LAGUNA_MUNICIPALITIES: Municipality[] = [
  { id: 'los-banos', name: 'Los Baños, Laguna', lat: 14.170, lng: 121.241 },
  { id: 'santa-cruz', name: 'Santa Cruz, Laguna', lat: 14.281, lng: 121.417 },
  { id: 'calamba', name: 'Calamba, Laguna', lat: 14.214, lng: 121.164 },
  { id: 'san-pablo', name: 'San Pablo, Laguna', lat: 14.067, lng: 121.325 },
  { id: 'cabuyao', name: 'Cabuyao, Laguna', lat: 14.278, lng: 121.124 },
  { id: 'nagcarlan', name: 'Nagcarlan, Laguna', lat: 14.135, lng: 121.417 },
  { id: 'pagsanjan', name: 'Pagsanjan, Laguna', lat: 14.273, lng: 121.454 },
  { id: 'liliw', name: 'Liliw, Laguna', lat: 14.133, lng: 121.433 },
  { id: 'bay', name: 'Bay, Laguna', lat: 14.183, lng: 121.283 },
  { id: 'victoria', name: 'Victoria, Laguna', lat: 14.233, lng: 121.333 },
];
