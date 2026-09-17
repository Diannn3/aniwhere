import { describe, it, expect } from 'vitest';
import { validateHarvestInput } from './validation';

describe('Harvest Input Validation', () => {
  it('passes on valid canonical tomato query', () => {
    const res = validateHarvestInput({
      crop: 'tomato',
      quantityKg: 300,
      originMunicipality: 'los-banos',
      readyDate: '2026-09-17',
    });

    expect(res.isValid).toBe(true);
    expect(res.errors).toEqual({});
  });

  it('fails when crop is missing', () => {
    const res = validateHarvestInput({
      quantityKg: 300,
      originMunicipality: 'los-banos',
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.crop).toBeDefined();
  });

  it('fails when quantity is zero, negative, or not a number', () => {
    expect(validateHarvestInput({ crop: 'tomato', quantityKg: 0, originMunicipality: 'los-banos' }).isValid).toBe(false);
    expect(validateHarvestInput({ crop: 'tomato', quantityKg: -50, originMunicipality: 'los-banos' }).isValid).toBe(false);
    expect(validateHarvestInput({ crop: 'tomato', quantityKg: 'invalid', originMunicipality: 'los-banos' }).isValid).toBe(false);
  });

  it('fails when quantity exceeds single-trip threshold', () => {
    const res = validateHarvestInput({
      crop: 'tomato',
      quantityKg: 200000,
      originMunicipality: 'los-banos',
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.quantityKg).toBeDefined();
  });

  it('fails when municipality is empty', () => {
    const res = validateHarvestInput({
      crop: 'tomato',
      quantityKg: 300,
      originMunicipality: '',
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.originMunicipality).toBeDefined();
  });
});
