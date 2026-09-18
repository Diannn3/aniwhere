import { describe, it, expect } from 'vitest';
import { evaluateFit } from './match';
import { DEMO_OUTLETS } from '../../content/demo-outlets';
import { normalizeCrop } from './crops';

describe('Deterministic Harvest Matching', () => {
  const query300 = {
    crop: 'tomato',
    quantityKg: 300,
    originMunicipality: 'los-banos',
    readyDate: '2026-09-17',
  };

  it('300 kg tomatoes vs Demo Cooperative yields exact match and P7,800 after transport', () => {
    const coop = DEMO_OUTLETS.find((o) => o.id === 'demo-cooperative')!;
    const result = evaluateFit(coop, query300, 600);

    expect(result.status).toBe('match');
    expect(result.acceptedKg).toBe(300);
    expect(result.remainingKg).toBe(0);
    expect(result.samplePricePerKg).toBe(28);
    expect(result.grossPay).toBe(8400); // 300 * 28 = 8400
    expect(result.enteredTransport).toBe(600);
    expect(result.afterTransportPay).toBe(7800); // 8400 - 600 = 7800
  });

  it('300 kg tomatoes vs Demo Processor yields exact match and P9,300 after transport', () => {
    const proc = DEMO_OUTLETS.find((o) => o.id === 'demo-processor')!;
    const result = evaluateFit(proc, query300, 300);

    expect(result.status).toBe('match');
    expect(result.acceptedKg).toBe(300);
    expect(result.remainingKg).toBe(0);
    expect(result.samplePricePerKg).toBe(32);
    expect(result.grossPay).toBe(9600); // 300 * 32 = 9600
    expect(result.enteredTransport).toBe(300);
    expect(result.afterTransportPay).toBe(9300); // 9600 - 300 = 9300
  });

  it('300 kg tomatoes vs Demo Market yields partial match, accepts 200 kg, leaves 100 kg unsold, and P5,700 after transport', () => {
    const market = DEMO_OUTLETS.find((o) => o.id === 'demo-market')!;
    const result = evaluateFit(market, query300, 300);

    expect(result.status).toBe('partial');
    expect(result.acceptedKg).toBe(200);
    expect(result.remainingKg).toBe(100);
    expect(result.samplePricePerKg).toBe(30);
    expect(result.grossPay).toBe(6000); // 200 * 30 = 6000
    expect(result.enteredTransport).toBe(300);
    expect(result.afterTransportPay).toBe(5700); // 6000 - 300 = 5700
  });

  it('Accepted crop with unknown capacity yields confirm state', () => {
    const msme = DEMO_OUTLETS.find((o) => o.id === 'demo-msme-confirm')!;
    const result = evaluateFit(msme, query300);

    expect(result.status).toBe('confirm');
    expect(result.acceptedKg).toBeNull();
    expect(result.remainingKg).toBeNull();
    expect(result.grossPay).toBeNull();
    expect(result.afterTransportPay).toBeNull();
  });

  it('Explicitly excluded crop yields no_match', () => {
    const organic = DEMO_OUTLETS.find((o) => o.id === 'demo-organic-shop')!;
    const result = evaluateFit(organic, query300);

    expect(result.status).toBe('no_match');
    expect(result.acceptedKg).toBe(0);
    expect(result.remainingKg).toBe(300);
  });

  it('Normalizes aliases: kamatis -> tomato, talong -> eggplant, kalamansi -> calamansi', () => {
    expect(normalizeCrop('kamatis').key).toBe('tomato');
    expect(normalizeCrop('talong').key).toBe('eggplant');
    expect(normalizeCrop('kalamansi').key).toBe('calamansi');
    expect(normalizeCrop('strawberry').key).toBe('other');
  });

  it('Unsupported crop returns confirm status with limitation note', () => {
    const coop = DEMO_OUTLETS.find((o) => o.id === 'demo-cooperative')!;
    const result = evaluateFit(coop, {
      crop: 'strawberry',
      quantityKg: 100,
      originMunicipality: 'los-banos',
    });

    expect(result.status).toBe('confirm');
    expect(result.reasonCodes).toContain('unsupported_crop');
  });
});
