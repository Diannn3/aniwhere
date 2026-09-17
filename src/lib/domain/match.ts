import type { Outlet, HarvestQuery, FitResult } from './types';
import { normalizeCrop } from './crops';

export function evaluateFit(
  outlet: Outlet,
  query: HarvestQuery,
  customTransport?: number
): FitResult {
  const { key: normalizedCrop, isSupported } = normalizeCrop(query.crop);
  const requestedKg = query.quantityKg;

  // 1. Explicit exclusion check
  if (outlet.excludedCrops?.includes(normalizedCrop) || outlet.excludedCrops?.includes(query.crop.toLowerCase())) {
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
      grossPay: null,
      enteredTransport: null,
      afterTransportPay: null,
      conditionsToConfirm: ['Confirm alternative intake schedules if available.'],
      conditionsToConfirmFil: ['Kumpirmahin kung may ibang iskedyul ng pagtanggap.'],
    };
  }

  // 2. Unsupported crop query (outside tomato, eggplant, calamansi)
  if (!isSupported) {
    return {
      status: 'confirm',
      statusLabel: 'Contact to confirm',
      statusLabelFil: 'Makipag-ugnayan para kumpirmahin',
      reason: `Detailed matching is currently limited to tomatoes, eggplant, and calamansi. Contact to confirm terms.`,
      reasonFil: `Ang detalyadong pagtutugma ay para lamang sa kamatis, talong, at kalamansi sa ngayon. Makipag-ugnayan para kumpirmahin.`,
      reasonCodes: ['unsupported_crop', 'conditions_to_confirm'],
      acceptedKg: null,
      remainingKg: null,
      samplePricePerKg: null,
      grossPay: null,
      enteredTransport: null,
      afterTransportPay: null,
      conditionsToConfirm: [
        `Does ${outlet.name} accept ${query.crop}?`,
        'What quantity and packaging are accepted?',
      ],
      conditionsToConfirmFil: [
        `Tumatanggap ba ang ${outlet.name} ng ${query.crop}?`,
        'Anong dami at packaging ang tinatanggap?',
      ],
    };
  }

  // 3. Crop condition check
  const cropRule = outlet.acceptedCrops[normalizedCrop];
  if (!cropRule) {
    return {
      status: 'no_match',
      statusLabel: 'Does not match',
      statusLabelFil: 'Hindi tugma',
      reason: `No intake program for ${query.crop} found at this location.`,
      reasonFil: `Walang tala ng pagbili para sa ${query.crop} sa lokasyong ito.`,
      reasonCodes: ['crop_not_supported'],
      acceptedKg: 0,
      remainingKg: requestedKg,
      samplePricePerKg: null,
      grossPay: null,
      enteredTransport: null,
      afterTransportPay: null,
      conditionsToConfirm: [],
      conditionsToConfirmFil: [],
    };
  }

  // 4. Inactive/expired check
  if (cropRule.isActive === false) {
    return {
      status: 'confirm',
      statusLabel: 'Contact to confirm',
      statusLabelFil: 'Makipag-ugnayan para kumpirmahin',
      reason: `Sample buying terms are not currently active. Contact to confirm intake schedule.`,
      reasonFil: `Hindi aktibo ang mga halimbawang kondisyon sa ngayon. Makipag-ugnayan para sa bagong iskedyul.`,
      reasonCodes: ['offer_not_current', 'conditions_to_confirm'],
      acceptedKg: null,
      remainingKg: null,
      samplePricePerKg: cropRule.pricePerKg ?? null,
      grossPay: null,
      enteredTransport: null,
      afterTransportPay: null,
      conditionsToConfirm: ['Is intake resuming this season?', 'What is the active schedule?'],
      conditionsToConfirmFil: ['Magpapatuloy ba ang pagbili ngayong panahon?', 'Ano ang bagong iskedyul?'],
    };
  }

  // 5. Unknown capacity check
  if (cropRule.maxKg === undefined || cropRule.maxKg === null) {
    const transport = customTransport !== undefined ? customTransport : (cropRule.defaultTransportExpense ?? null);
    return {
      status: 'confirm',
      statusLabel: 'Contact to confirm',
      statusLabelFil: 'Makipag-ugnayan para kumpirmahin',
      reason: `Current capacity is not stated. Contact to confirm how many kilograms can be accepted.`,
      reasonFil: `Hindi nakasaad ang kabuuang dami na kayang tanggapin. Makipag-ugnayan para malaman ang kapasidad.`,
      reasonCodes: ['capacity_unknown', 'conditions_to_confirm'],
      acceptedKg: null,
      remainingKg: null,
      samplePricePerKg: cropRule.pricePerKg ?? null,
      grossPay: null,
      enteredTransport: transport,
      afterTransportPay: null,
      conditionsToConfirm: [
        'How many kilograms can be received?',
        ...(cropRule.conditions || []),
      ],
      conditionsToConfirmFil: [
        'Ilang kilo ang kayang tanggapin?',
        ...(cropRule.conditionsFil || []),
      ],
    };
  }

  // 6. Minimum quantity check
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
      samplePricePerKg: cropRule.pricePerKg ?? null,
      grossPay: null,
      enteredTransport: null,
      afterTransportPay: null,
      conditionsToConfirm: [`Can smaller batches be consolidated with nearby growers?`],
      conditionsToConfirmFil: [`Maaari bang isabay sa ibang magsasaka ang mas maliit na ani?`],
    };
  }

  // 7. Capacity comparison: full match vs partial match
  const acceptedKg = Math.min(requestedKg, cropRule.maxKg);
  const remainingKg = Math.max(0, requestedKg - acceptedKg);
  const price = cropRule.pricePerKg ?? null;
  const transport = customTransport !== undefined ? customTransport : (cropRule.defaultTransportExpense ?? null);

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
    };
  }

  return {
    status: 'match',
    statusLabel: 'Matches your harvest',
    statusLabelFil: 'Tugma sa ani mo',
    reason: `Sample terms accept the full ${requestedKg} kg requested.`,
    reasonFil: `Tumatanggap sa buong ${requestedKg} kg ayon sa halimbawang kondisyon.`,
    reasonCodes: ['full_capacity_known', 'crop_accepted'],
    acceptedKg,
    remainingKg: 0,
    samplePricePerKg: price,
    grossPay: gross,
    enteredTransport: transport,
    afterTransportPay: afterTransport,
    conditionsToConfirm: cropRule.conditions || [],
    conditionsToConfirmFil: cropRule.conditionsFil || [],
  };
}
