import { describe, it, expect } from 'vitest';
import { isValidIsoDate, validateHarvestInput } from './validation';

describe('Harvest Input Validation', () => {
  it('passes on valid canonical tomato query', () => {
    const res = validateHarvestInput({
      crop: 'tomato',
      quantityKg: 300,
      originMunicipality: 'los-banos',
      readyDate: '2026-09-18',
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

  it('accepts an omitted optional ready date but rejects malformed or impossible dates', () => {
    expect(validateHarvestInput({
      crop: 'tomato',
      quantityKg: 300,
      originMunicipality: 'los-banos',
    }).isValid).toBe(true);

    expect(validateHarvestInput({
      crop: 'tomato',
      quantityKg: 300,
      originMunicipality: 'los-banos',
      readyDate: '18-09-2026',
    }).errors.readyDate).toBeDefined();

    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('2026-09-18')).toBe(true);
  });
});
