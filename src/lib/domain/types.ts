export type CropKey = 'tomato' | 'eggplant' | 'calamansi' | 'other';

export type FitStatus = 'match' | 'partial' | 'confirm' | 'no_match';

export type OutletCategory = 'cooperative' | 'processor' | 'market' | 'msme' | 'restaurant' | 'consolidator';

export interface CropCondition {
  maxKg?: number;
  minKg?: number;
  pricePerKg?: number;
  defaultTransportExpense?: number;
  conditions: string[];
  conditionsFil: string[];
  isActive?: boolean;
}

export interface Outlet {
  id: string;
  slug: string;
  name: string;
  category: OutletCategory;
  municipality: string;
  lat: number;
  lng: number;
  description: string;
  descriptionFil: string;
  sampleOfferDate: string;
  acceptedCrops: Partial<Record<CropKey | string, CropCondition>>;
  excludedCrops?: string[];
  isDemoFixture: boolean;
}

export interface HarvestQuery {
  crop: string;
  quantityKg: number;
  originMunicipality: string;
  readyDate?: string;
}

export type FitReasonCode =
  | 'crop_accepted'
  | 'crop_not_supported'
  | 'full_capacity_known'
  | 'capacity_below_harvest'
  | 'capacity_unknown'
  | 'conditions_to_confirm'
  | 'unsupported_crop'
  | 'offer_not_current'
  | 'crop_excluded'
  | 'below_minimum_quantity';

export interface FitResult {
  status: FitStatus;
  statusLabel: string;
  statusLabelFil: string;
  reason: string;
  reasonFil: string;
  reasonCodes: FitReasonCode[];
  acceptedKg: number | null;
  remainingKg: number | null;
  samplePricePerKg: number | null;
  grossPay: number | null;
  enteredTransport: number | null;
  afterTransportPay: number | null;
  conditionsToConfirm: string[];
  conditionsToConfirmFil: string[];
  straightLineDistanceKm?: number | null;
}

export interface BuyerDemoOffer {
  id: string;
  cropKey: CropKey;
  cropLabel: string;
  quantityKg: number;
  pricePerKg?: number;
  status: 'published' | 'in_review' | 'draft';
  updatedAt: string;
  deliveryWindow?: string;
  location?: string;
  notes?: string;
}

