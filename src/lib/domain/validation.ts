export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  errorsFil: Record<string, string>;
}

export function isValidIsoDate(value?: string): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateHarvestInput(data: {
  crop?: string;
  quantityKg?: number | string;
  originMunicipality?: string;
  readyDate?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  const errorsFil: Record<string, string> = {};

  if (!data.crop || !data.crop.trim()) {
    errors.crop = 'Select or enter a crop.';
    errorsFil.crop = 'Pumili o maglagay ng uri ng ani.';
  }

  const numKg = Number(data.quantityKg);
  if (!data.quantityKg || isNaN(numKg) || numKg <= 0) {
    errors.quantityKg = 'Enter a valid quantity greater than 0 kg.';
    errorsFil.quantityKg = 'Maglagay ng wastong dami na higit sa 0 kg.';
  } else if (numKg > 100000) {
    errors.quantityKg = 'Quantity exceeds maximum allowable single-trip threshold (100,000 kg).';
    errorsFil.quantityKg = 'Sobra sa limitasyon ang dami (100,000 kg).';
  }

  if (!data.originMunicipality || !data.originMunicipality.trim()) {
    errors.originMunicipality = 'Select your municipality or origin.';
    errorsFil.originMunicipality = 'Pumili ng iyong munisipalidad o pinagmulan.';
  }

  if (data.readyDate && !isValidIsoDate(data.readyDate)) {
    errors.readyDate = 'Enter a valid harvest-ready date.';
    errorsFil.readyDate = 'Maglagay ng wastong petsa kung kailan handa ang ani.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    errorsFil,
  };
}
