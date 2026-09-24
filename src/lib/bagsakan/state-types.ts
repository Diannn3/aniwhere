import type { CropKey } from '../domain/types';

export interface BagsakanDemoProfile {
  id: string;
  name: string;
  municipalityId: string;
  lat: number;
  lng: number;
  locationBasis: 'municipality_center' | 'exact_pin';
  updatedAt: string;
}

export interface BagsakanDemoDemand {
  id: string;
  profileId: string;
  cropKey: CropKey;
  customCropLabel?: string;
  maxKg?: number;
  minKg?: number;
  pricePerKg?: number;
  status: 'draft' | 'active' | 'paused';
  validFrom: string;
  validUntil: string;
  receivingWeekdays?: number[];
  receivingStartTime?: string;
  receivingEndTime?: string;
  variety?: string;
  grade?: string;
  packaging?: string;
  notes?: string;
  updatedAt: string;
}

export interface BagsakanDemoState {
  version: 1;
  profile: BagsakanDemoProfile | null;
  demands: BagsakanDemoDemand[];
}

export type ProfileValidationErrors = Partial<Record<keyof BagsakanDemoProfile, string>>;
export type DemandValidationErrors = Partial<Record<keyof BagsakanDemoDemand, string>>;
