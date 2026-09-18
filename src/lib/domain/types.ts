export type CropKey = 'tomato' | 'eggplant' | 'calamansi' | 'other';

export type FitStatus = 'match' | 'partial' | 'confirm' | 'no_match';

export type OutletCategory = 'cooperative' | 'processor' | 'market' | 'msme' | 'restaurant' | 'consolidator';

export type OfferLifecycleStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'expired'
  | 'withdrawn';

export type MarketEvidenceKind =
  | 'demo'
  | 'buyer_offer'
  | 'reviewed_place'
  | 'public_reference'
  | 'unknown';

export interface CropCondition {
  maxKg?: number;
  minKg?: number;
  pricePerKg?: number;
  defaultTransportExpense?: number;
  conditions: string[];
  conditionsFil: string[];

  /**
   * Legacy frontend-prototype switch. Prefer offerStatus in new data.
   * Kept temporarily so the demo adapter remains backward-compatible.
   */
  isActive?: boolean;

  /** Production-oriented time and provenance metadata. */
  offerStatus?: OfferLifecycleStatus;
  validFrom?: string;
  validUntil?: string;
  receivingWeekdays?: number[];
  sourceKind?: MarketEvidenceKind;
  sourceLabel?: string;
  lastUpdatedAt?: string;
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

/**
 * Production-facing stable place record. A place may exist and remain
 * discoverable even when there is no current buyer offer.
 */
export interface PlaceRecord {
  id: string;
  slug: string;
  name: string;
  category: OutletCategory;
  municipality: string;
  lat: number;
  lng: number;
  description?: string;
  descriptionFil?: string;
  contactPhone?: string;
  contactEmail?: string;
  publicStatus: 'reviewed' | 'needs_review' | 'archived';
  lastReviewedAt?: string;
  sourceIds: string[];
}

/** Longer-lived evidence about what a place is known to handle. */
export interface PlaceCropCapabilityRecord {
  id: string;
  placeId: string;
  cropKey: CropKey | string;
  acceptanceState: 'accepted' | 'excluded' | 'unknown';
  minKg?: number;
  maxKg?: number;
  conditions: string[];
  conditionsFil: string[];
  verifiedAt?: string;
  sourceId?: string;
}

/** Time-sensitive demand. This is deliberately separate from PlaceRecord. */
export interface BuyerOfferRecord {
  id: string;
  placeId: string;
  cropKey: CropKey | string;
  status: OfferLifecycleStatus;
  maxKg?: number;
  minKg?: number;
  pricePerKg?: number;
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
  sourceId?: string;
}

/** Where a claim came from. Reference prices are not buyer quotes. */
export interface SourceRecord {
  id: string;
  kind: MarketEvidenceKind;
  label: string;
  url?: string;
  organization?: string;
  observedAt?: string;
}

/** Human/institutional review trail for stable place facts or offers. */
export interface VerificationRecord {
  id: string;
  entityType: 'place' | 'offer' | 'place_crop_capability';
  entityId: string;
  status: 'verified' | 'needs_reconfirmation' | 'rejected';
  verifiedAt: string;
  verifierLabel?: string;
  sourceId?: string;
  notes?: string;
}

export interface HarvestQuery {
  crop: string;
  quantityKg: number;
  originMunicipality: string;
  readyDate?: string;
}

export type FitReasonCode =
  | 'crop_accepted'
  | 'crop_acceptance_unknown'
  | 'crop_not_supported'
  | 'full_capacity_known'
  | 'capacity_below_harvest'
  | 'capacity_unknown'
  | 'conditions_to_confirm'
  | 'unsupported_crop'
  | 'offer_not_current'
  | 'offer_future'
  | 'offer_expired_for_harvest'
  | 'availability_date_unknown'
  | 'receiving_day_incompatible'
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

  /** Evidence metadata used to keep demo/current/reviewed facts visibly distinct. */
  evidenceKind: MarketEvidenceKind;
  sourceLabel: string | null;
  dataUpdatedAt: string | null;
  dataValidUntil: string | null;
  unknowns: string[];
  unknownsFil: string[];
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
