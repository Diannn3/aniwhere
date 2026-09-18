import { describe, it, expect } from 'vitest';
import { evaluateFit } from './match';
import { DEMO_OUTLETS } from '../../content/demo-outlets';
import { normalizeCrop } from './crops';
import type { Outlet } from './types';

describe('Deterministic Harvest Matching', () => {
  const query300 = {
    crop: 'tomato',
    quantityKg: 300,
    originMunicipality: 'los-banos',
    readyDate: '2026-09-18',
  };

  it('300 kg tomatoes vs Demo Cooperative yields exact match and P7,800 after transport', () => {
    const coop = DEMO_OUTLETS.find((o) => o.id === 'demo-cooperative')!;
    const result = evaluateFit(coop, query300, 600);

    expect(result.status).toBe('match');
    expect(result.acceptedKg).toBe(300);
    expect(result.remainingKg).toBe(0);
    expect(result.samplePricePerKg).toBe(28);
    expect(result.grossPay).toBe(8400);
    expect(result.enteredTransport).toBe(600);
    expect(result.afterTransportPay).toBe(7800);
    expect(result.evidenceKind).toBe('demo');
  });

  it('300 kg tomatoes vs Demo Processor yields exact match and P9,300 after transport', () => {
    const proc = DEMO_OUTLETS.find((o) => o.id === 'demo-processor')!;
    const result = evaluateFit(proc, query300, 300);

    expect(result.status).toBe('match');
    expect(result.acceptedKg).toBe(300);
    expect(result.remainingKg).toBe(0);
    expect(result.samplePricePerKg).toBe(32);
    expect(result.grossPay).toBe(9600);
    expect(result.enteredTransport).toBe(300);
    expect(result.afterTransportPay).toBe(9300);
  });

  it('300 kg tomatoes vs Demo Market yields partial match and computes only accepted quantity', () => {
    const market = DEMO_OUTLETS.find((o) => o.id === 'demo-market')!;
    const result = evaluateFit(market, query300, 300);

    expect(result.status).toBe('partial');
    expect(result.acceptedKg).toBe(200);
    expect(result.remainingKg).toBe(100);
    expect(result.samplePricePerKg).toBe(30);
    expect(result.grossPay).toBe(6000);
    expect(result.enteredTransport).toBe(300);
    expect(result.afterTransportPay).toBe(5700);
  });

  it('accepted crop with unknown capacity yields confirm state', () => {
    const msme = DEMO_OUTLETS.find((o) => o.id === 'demo-msme-confirm')!;
    const result = evaluateFit(msme, query300);

    expect(result.status).toBe('confirm');
    expect(result.reasonCodes).toContain('capacity_unknown');
    expect(result.unknowns).toContain('Current capacity');
    expect(result.acceptedKg).toBeNull();
    expect(result.grossPay).toBeNull();
  });

  it('explicitly excluded crop yields no_match', () => {
    const organic = DEMO_OUTLETS.find((o) => o.id === 'demo-organic-shop')!;
    const result = evaluateFit(organic, query300);

    expect(result.status).toBe('no_match');
    expect(result.reasonCodes).toContain('crop_excluded');
    expect(result.acceptedKg).toBe(0);
    expect(result.remainingKg).toBe(300);
  });

  it('missing crop rule is unknown and yields confirm, not no_match', () => {
    const processor = DEMO_OUTLETS.find((o) => o.id === 'demo-processor')!;
    const result = evaluateFit(processor, {
      ...query300,
      crop: 'calamansi',
    });

    expect(result.status).toBe('confirm');
    expect(result.reasonCodes).toContain('crop_acceptance_unknown');
    expect(result.acceptedKg).toBeNull();
  });

  it('non-current offer cannot become a match', () => {
    const coop = DEMO_OUTLETS.find((o) => o.id === 'demo-cooperative')!;
    const paused: Outlet = {
      ...coop,
      acceptedCrops: {
        ...coop.acceptedCrops,
        tomato: {
          ...coop.acceptedCrops.tomato!,
          offerStatus: 'paused',
        },
      },
    };

    const result = evaluateFit(paused, query300);
    expect(result.status).toBe('confirm');
    expect(result.reasonCodes).toContain('offer_not_current');
  });

  it('known future buying window yields no_match for an earlier harvest date', () => {
    const coop = DEMO_OUTLETS.find((o) => o.id === 'demo-cooperative')!;
    const future: Outlet = {
      ...coop,
      acceptedCrops: {
        ...coop.acceptedCrops,
        tomato: {
          ...coop.acceptedCrops.tomato!,
          validFrom: '2026-09-25',
          validUntil: '2026-09-30',
        },
      },
    };

    const result = evaluateFit(future, query300);
    expect(result.status).toBe('no_match');
    expect(result.reasonCodes).toContain('offer_future');
  });

  it('known expired buying window yields no_match for a later harvest date', () => {
    const coop = DEMO_OUTLETS.find((o) => o.id === 'demo-cooperative')!;
    const expired: Outlet = {
      ...coop,
      acceptedCrops: {
        ...coop.acceptedCrops,
        tomato: {
          ...coop.acceptedCrops.tomato!,
          validFrom: '2026-09-01',
          validUntil: '2026-09-10',
        },
      },
    };

    const result = evaluateFit(expired, query300);
    expect(result.status).toBe('no_match');
    expect(result.reasonCodes).toContain('offer_expired_for_harvest');
  });

  it('missing ready date yields confirm when offer has date constraints', () => {
    const coop = DEMO_OUTLETS.find((o) => o.id === 'demo-cooperative')!;
    const result = evaluateFit(coop, {
      crop: 'tomato',
      quantityKg: 300,
      originMunicipality: 'los-banos',
    });

    expect(result.status).toBe('confirm');
    expect(result.reasonCodes).toContain('availability_date_unknown');
  });

  it('known incompatible receiving weekday yields no_match', () => {
    const coop = DEMO_OUTLETS.find((o) => o.id === 'demo-cooperative')!;
    const mondayOnly: Outlet = {
      ...coop,
      acceptedCrops: {
        ...coop.acceptedCrops,
        tomato: {
          ...coop.acceptedCrops.tomato!,
          receivingWeekdays: [1],
        },
      },
    };

    const result = evaluateFit(mondayOnly, query300);
    expect(result.status).toBe('no_match');
    expect(result.reasonCodes).toContain('receiving_day_incompatible');
  });

  it('does not fabricate proceeds when price is unknown', () => {
    const coop = DEMO_OUTLETS.find((o) => o.id === 'demo-cooperative')!;
    const noPrice: Outlet = {
      ...coop,
      acceptedCrops: {
        ...coop.acceptedCrops,
        tomato: {
          ...coop.acceptedCrops.tomato!,
          pricePerKg: undefined,
        },
      },
    };

    const result = evaluateFit(noPrice, query300);
    expect(result.status).toBe('match');
    expect(result.samplePricePerKg).toBeNull();
    expect(result.grossPay).toBeNull();
    expect(result.afterTransportPay).toBeNull();
  });

  it('normalizes aliases: kamatis -> tomato, talong -> eggplant, kalamansi -> calamansi', () => {
    expect(normalizeCrop('kamatis').key).toBe('tomato');
    expect(normalizeCrop('talong').key).toBe('eggplant');
    expect(normalizeCrop('kalamansi').key).toBe('calamansi');
    expect(normalizeCrop('strawberry').key).toBe('other');
  });

  it('unsupported crop returns confirm status with limitation note', () => {
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
