import { describe, it, expect } from 'vitest';
import { buildComparison } from './compare';
import { DEMO_OUTLETS } from '../../content/demo-outlets';

describe('Comparison Calculations', () => {
  const query = {
    crop: 'tomato',
    quantityKg: 300,
    originMunicipality: 'los-banos',
    readyDate: '2026-09-18',
  };

  it('builds 3-way comparison with exact fixture amounts and zero bias', () => {
    const rows = buildComparison(DEMO_OUTLETS.slice(0, 3), query);

    expect(rows).toHaveLength(3);

    // 1. Santa Cruz Cooperative
    expect(rows[0].outlet.name).toBe('Santa Cruz Cooperative');
    expect(rows[0].fit.grossPay).toBe(8400);
    expect(rows[0].fit.enteredTransport).toBe(600);
    expect(rows[0].fit.afterTransportPay).toBe(7800);

    // 2. Calamba Processor
    expect(rows[1].outlet.name).toBe('Calamba Processor');
    expect(rows[1].fit.grossPay).toBe(9600);
    expect(rows[1].fit.enteredTransport).toBe(300);
    expect(rows[1].fit.afterTransportPay).toBe(9300);

    // 3. Los Baños Market
    expect(rows[2].outlet.name).toBe('Los Baños Market');
    expect(rows[2].fit.grossPay).toBe(6000);
    expect(rows[2].fit.enteredTransport).toBe(300);
    expect(rows[2].fit.afterTransportPay).toBe(5700);
    expect(rows[2].fit.remainingKg).toBe(100);
  });

  it('dynamically updates after-transport amounts when user edits transport expense', () => {
    const customTransports = {
      'demo-cooperative': 1000, // Changed from 600 to 1000
    };

    const rows = buildComparison(DEMO_OUTLETS.slice(0, 1), query, customTransports);

    expect(rows[0].fit.grossPay).toBe(8400);
    expect(rows[0].fit.enteredTransport).toBe(1000);
    expect(rows[0].fit.afterTransportPay).toBe(7400); // 8400 - 1000 = 7400
  });
});
