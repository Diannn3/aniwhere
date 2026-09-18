import type {
  Outlet,
  HarvestQuery,
  FitResult,
  CropCondition,
  MarketEvidenceKind,
} from './types';
import { normalizeCrop } from './crops';

function evidenceKindFor(outlet: Outlet, cropRule?: CropCondition): MarketEvidenceKind {
  if (cropRule?.sourceKind) return cropRule.sourceKind;
  return outlet.isDemoFixture ? 'demo' : 'unknown';
}

function evidenceFields(outlet: Outlet, cropRule?: CropCondition) {
  return {
    evidenceKind: evidenceKindFor(outlet, cropRule),
    sourceLabel: cropRule?.sourceLabel ?? (outlet.isDemoFixture ? 'Demo — sample data' : null),
    dataUpdatedAt: cropRule?.lastUpdatedAt ?? null,
    dataValidUntil: cropRule?.validUntil ?? null,
  };
}

function isoDateIsValid(value?: string): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function weekdayFromIsoDate(value: string): number {
  return new Date(`${value}T00:00:00Z`).getUTCDay();
}

function isOfferCurrent(cropRule: CropCondition): boolean {
  if (cropRule.offerStatus) return cropRule.offerStatus === 'active';
  return cropRule.isActive !== false;
}

function emptyMoney() {
  return {
    grossPay: null,
    enteredTransport: null,
    afterTransportPay: null,
  };
}

export function evaluateFit(
  outlet: Outlet,
  query: HarvestQuery,
  customTransport?: number
): FitResult {
  const { key: normalizedCrop, isSupported } = normalizeCrop(query.crop);
  const requestedKg = query.quantityKg;

  // 1. Explicit exclusion is the strongest possible negative evidence.
  if (
    outlet.excludedCrops?.includes(normalizedCrop) ||
    outlet.excludedCrops?.includes(query.crop.toLowerCase())
  ) {
    return {
      status: 'no_match',
      statusLabel: 'Does not match',
      statusLabelFil: 'Hindi tugma',
      reason: `This place explicitly excludes ${query.crop}.`,
      reasonFil: `Hindi tumatanggap ang lugar na ito ng ${query.crop}.`,
      reasonCodes: ['crop_excluded'],
      acceptedKg: 0,
      remainingKg: requestedKg,
      samplePricePerKg: null,
      ...emptyMoney(),
      conditionsToConfirm: ['Confirm alternative intake schedules if available.'],
      conditionsToConfirmFil: ['Kumpirmahin kung may ibang iskedyul ng pagtanggap.'],
      ...evidenceFields(outlet),
      unknowns: [],
      unknownsFil: [],
    };
  }

  // 2. Crops outside the detailed pilot scope stay explicitly unknown.
  if (!isSupported) {
    return {
      status: 'confirm',
      statusLabel: 'Contact to confirm',
      statusLabelFil: 'Makipag-ugnayan para kumpirmahin',
      reason:
        'Detailed matching is currently limited to tomatoes, eggplant, and calamansi. Contact to confirm terms.',
      reasonFil:
        'Ang detalyadong pagtutugma ay para lamang sa kamatis, talong, at kalamansi sa ngayon. Makipag-ugnayan para kumpirmahin.',
      reasonCodes: ['unsupported_crop', 'conditions_to_confirm'],
      acceptedKg: null,
      remainingKg: null,
      samplePricePerKg: null,
      ...emptyMoney(),
      conditionsToConfirm: [
        `Does ${outlet.name} accept ${query.crop}?`,
        'What quantity and packaging are accepted?',
      ],
      conditionsToConfirmFil: [
        `Tumatanggap ba ang ${outlet.name} ng ${query.crop}?`,
        'Anong dami at packaging ang tinatanggap?',
      ],
      ...evidenceFields(outlet),
      unknowns: ['Crop acceptance', 'Current capacity'],
      unknownsFil: ['Pagtanggap ng ani', 'Kasalukuyang kapasidad'],
    };
  }

  const cropRule = outlet.acceptedCrops[normalizedCrop];

  // 3. Absence of a crop rule is UNKNOWN, not a verified rejection.
  // Explicit rejection belongs in excludedCrops.
  if (!cropRule) {
    return {
      status: 'confirm',
      statusLabel: 'Contact to confirm',
      statusLabelFil: 'Makipag-ugnayan para kumpirmahin',
      reason: `No current acceptance record for ${query.crop} is available at this place. That does not mean the crop is rejected.`,
      reasonFil: `Walang kasalukuyang tala kung tumatanggap ang lugar na ito ng ${query.crop}. Hindi ibig sabihin nito na hindi ito tinatanggap.`,
      reasonCodes: ['crop_acceptance_unknown', 'conditions_to_confirm'],
      acceptedKg: null,
      remainingKg: null,
      samplePricePerKg: null,
      ...emptyMoney(),
      conditionsToConfirm: [
        `Does ${outlet.name} currently accept ${query.crop}?`,
        'What quantity can be received?',
      ],
      conditionsToConfirmFil: [
        `Kasalukuyan bang tumatanggap ang ${outlet.name} ng ${query.crop}?`,
        'Ilang kilo ang kayang tanggapin?',
      ],
      ...evidenceFields(outlet),
      unknowns: ['Crop acceptance', 'Current capacity', 'Current price'],
      unknownsFil: ['Pagtanggap ng ani', 'Kasalukuyang kapasidad', 'Kasalukuyang presyo'],
    };
  }

  const evidence = evidenceFields(outlet, cropRule);
  const price = cropRule.pricePerKg ?? null;

  // 4. A non-current offer can never become MATCH/PARTIAL.
  if (!isOfferCurrent(cropRule)) {
    return {
      status: 'confirm',
      statusLabel: 'Contact to confirm',
      statusLabelFil: 'Makipag-ugnayan para kumpirmahin',
      reason: 'The recorded buying terms are not currently active. Contact the outlet before travel.',
      reasonFil: 'Hindi aktibo ang nakatalang kondisyon sa ngayon. Makipag-ugnayan muna bago bumiyahe.',
      reasonCodes: ['offer_not_current', 'conditions_to_confirm'],
      acceptedKg: null,
      remainingKg: null,
      samplePricePerKg: price,
      ...emptyMoney(),
      conditionsToConfirm: ['Is buying currently active?', 'What is the latest receiving schedule?'],
      conditionsToConfirmFil: ['Aktibo ba ang pagbili ngayon?', 'Ano ang pinakabagong iskedyul ng pagtanggap?'],
      ...evidence,
      unknowns: ['Current demand', 'Current capacity'],
      unknownsFil: ['Kasalukuyang demand', 'Kasalukuyang kapasidad'],
    };
  }

  // 5. Offer/date compatibility. Known incompatibility is NO_MATCH;
  // missing date information remains CONTACT_TO_CONFIRM.
  const hasDateConstraint =
    Boolean(cropRule.validFrom || cropRule.validUntil) ||
    Boolean(cropRule.receivingWeekdays?.length);

  if (hasDateConstraint && !isoDateIsValid(query.readyDate)) {
    return {
      status: 'confirm',
      statusLabel: 'Contact to confirm',
      statusLabelFil: 'Makipag-ugnayan para kumpirmahin',
      reason: 'A receiving schedule is known, but the harvest availability date is missing or invalid.',
      reasonFil: 'May nakatalang iskedyul ng pagtanggap ngunit kulang o hindi wasto ang petsa ng ani.',
      reasonCodes: ['availability_date_unknown', 'conditions_to_confirm'],
      acceptedKg: null,
      remainingKg: null,
      samplePricePerKg: price,
      ...emptyMoney(),
      conditionsToConfirm: ['Confirm the harvest-ready date against the buyer receiving schedule.'],
      conditionsToConfirmFil: ['Kumpirmahin ang petsa ng ani laban sa iskedyul ng buyer.'],
      ...evidence,
      unknowns: ['Availability-date compatibility'],
      unknownsFil: ['Pagkakatugma ng petsa ng ani'],
    };
  }

  if (query.readyDate && isoDateIsValid(query.readyDate)) {
    if (cropRule.validFrom && query.readyDate < cropRule.validFrom) {
      return {
        status: 'no_match',
        statusLabel: 'Does not match',
        statusLabelFil: 'Hindi tugma',
        reason: `This buying window starts on ${cropRule.validFrom}, after your harvest is ready.`,
        reasonFil: `Magsisimula ang buying window sa ${cropRule.validFrom}, pagkatapos ng petsa ng iyong ani.`,
        reasonCodes: ['offer_future'],
        acceptedKg: 0,
        remainingKg: requestedKg,
        samplePricePerKg: price,
        ...emptyMoney(),
        conditionsToConfirm: [],
        conditionsToConfirmFil: [],
        ...evidence,
        unknowns: [],
        unknownsFil: [],
      };
    }

    if (cropRule.validUntil && query.readyDate > cropRule.validUntil) {
      return {
        status: 'no_match',
        statusLabel: 'Does not match',
        statusLabelFil: 'Hindi tugma',
        reason: `The recorded buying window ends on ${cropRule.validUntil}, before your harvest is ready.`,
        reasonFil: `Nagtatapos ang nakatalang buying window sa ${cropRule.validUntil}, bago ang petsa ng iyong ani.`,
        reasonCodes: ['offer_expired_for_harvest'],
        acceptedKg: 0,
        remainingKg: requestedKg,
        samplePricePerKg: price,
        ...emptyMoney(),
        conditionsToConfirm: ['Ask whether a new buying window has been opened.'],
        conditionsToConfirmFil: ['Alamin kung may bagong buying window.'],
        ...evidence,
        unknowns: [],
        unknownsFil: [],
      };
    }

    if (
      cropRule.receivingWeekdays?.length &&
      !cropRule.receivingWeekdays.includes(weekdayFromIsoDate(query.readyDate))
    ) {
      return {
        status: 'no_match',
        statusLabel: 'Does not match',
        statusLabelFil: 'Hindi tugma',
        reason: 'Your harvest-ready date falls outside the recorded receiving days.',
        reasonFil: 'Ang petsa ng iyong ani ay wala sa nakatalang araw ng pagtanggap.',
        reasonCodes: ['receiving_day_incompatible'],
        acceptedKg: 0,
        remainingKg: requestedKg,
        samplePricePerKg: price,
        ...emptyMoney(),
        conditionsToConfirm: ['Ask whether another receiving day can be arranged.'],
        conditionsToConfirmFil: ['Alamin kung maaaring mag-ayos ng ibang araw ng pagtanggap.'],
        ...evidence,
        unknowns: [],
        unknownsFil: [],
      };
    }
  }

  // 6. Capacity must be known before AniWhere claims a quantity match.
  if (cropRule.maxKg === undefined || cropRule.maxKg === null) {
    const transport =
      customTransport !== undefined
        ? customTransport
        : (cropRule.defaultTransportExpense ?? null);

    return {
      status: 'confirm',
      statusLabel: 'Contact to confirm',
      statusLabelFil: 'Makipag-ugnayan para kumpirmahin',
      reason: 'Current capacity is not stated. Contact to confirm how many kilograms can be accepted.',
      reasonFil: 'Hindi nakasaad ang kabuuang dami na kayang tanggapin. Makipag-ugnayan para malaman ang kapasidad.',
      reasonCodes: ['capacity_unknown', 'conditions_to_confirm'],
      acceptedKg: null,
      remainingKg: null,
      samplePricePerKg: price,
      grossPay: null,
      enteredTransport: transport,
      afterTransportPay: null,
      conditionsToConfirm: ['How many kilograms can be received?', ...(cropRule.conditions || [])],
      conditionsToConfirmFil: ['Ilang kilo ang kayang tanggapin?', ...(cropRule.conditionsFil || [])],
      ...evidence,
      unknowns: ['Current capacity'],
      unknownsFil: ['Kasalukuyang kapasidad'],
    };
  }

  // 7. Known minimum-volume incompatibility is a real NO_MATCH.
  if (cropRule.minKg && requestedKg < cropRule.minKg) {
    return {
      status: 'no_match',
      statusLabel: 'Does not match',
      statusLabelFil: 'Hindi tugma',
      reason: `Requested ${requestedKg} kg is below the minimum required volume (${cropRule.minKg} kg).`,
      reasonFil: `Ang ${requestedKg} kg ay mas mababa kaysa sa minimum na ${cropRule.minKg} kg.`,
      reasonCodes: ['below_minimum_quantity'],
      acceptedKg: 0,
      remainingKg: requestedKg,
      samplePricePerKg: price,
      ...emptyMoney(),
      conditionsToConfirm: ['Can smaller batches be consolidated with nearby growers?'],
      conditionsToConfirmFil: ['Maaari bang isabay sa ibang magsasaka ang mas maliit na ani?'],
      ...evidence,
      unknowns: [],
      unknownsFil: [],
    };
  }

  // 8. Quantity arithmetic: full match vs partial match.
  const acceptedKg = Math.min(requestedKg, cropRule.maxKg);
  const remainingKg = Math.max(0, requestedKg - acceptedKg);
  const transport =
    customTransport !== undefined
      ? customTransport
      : (cropRule.defaultTransportExpense ?? null);

  let gross: number | null = null;
  let afterTransport: number | null = null;

  if (price !== null) {
    gross = Math.round(acceptedKg * price * 100) / 100;
    if (transport !== null) {
      afterTransport = Math.round((gross - transport) * 100) / 100;
    }
  }

  if (acceptedKg < requestedKg) {
    return {
      status: 'partial',
      statusLabel: 'Accepts part of your harvest',
      statusLabelFil: 'Bahagi ng ani mo ang kayang tanggapin',
      reason: `Accepts up to ${acceptedKg} kg. Remaining ${remainingKg} kg will require another destination.`,
      reasonFil: `Tumatanggap ng hanggang ${acceptedKg} kg. Ang natitirang ${remainingKg} kg ay kailangang ibenta sa iba.`,
      reasonCodes: ['capacity_below_harvest'],
      acceptedKg,
      remainingKg,
      samplePricePerKg: price,
      grossPay: gross,
      enteredTransport: transport,
      afterTransportPay: afterTransport,
      conditionsToConfirm: cropRule.conditions || [],
      conditionsToConfirmFil: cropRule.conditionsFil || [],
      ...evidence,
      unknowns: [],
      unknownsFil: [],
    };
  }

  return {
    status: 'match',
    statusLabel: 'Matches your harvest',
    statusLabelFil: 'Tugma sa ani mo',
    reason: `Recorded terms can accept the full ${requestedKg} kg for the stated harvest date.`,
    reasonFil: `Kayang tanggapin ng nakatalang kondisyon ang buong ${requestedKg} kg sa ibinigay na petsa ng ani.`,
    reasonCodes: ['full_capacity_known', 'crop_accepted'],
    acceptedKg,
    remainingKg: 0,
    samplePricePerKg: price,
    grossPay: gross,
    enteredTransport: transport,
    afterTransportPay: afterTransport,
    conditionsToConfirm: cropRule.conditions || [],
    conditionsToConfirmFil: cropRule.conditionsFil || [],
    ...evidence,
    unknowns: [],
    unknownsFil: [],
  };
}
