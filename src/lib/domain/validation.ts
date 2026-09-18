export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  errorsFil: Record<string, string>;
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

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    errorsFil,
  };
}
