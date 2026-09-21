import { describe, expect, it } from 'vitest';
import { AniToolDispatcher } from './tool-dispatcher';
import type { AniToolRequest } from './types';

const dispatcher = new AniToolDispatcher();
const harvest = { crop: 'tomato', quantityKg: 300, originMunicipality: 'los-banos', readyDate: '2026-09-22' };

const req = (name: AniToolRequest['name'], args: Record<string, unknown> = {}): AniToolRequest => ({ id: 'test', name, args });

describe('AniToolDispatcher', () => {
  it('preserves deterministic partial quantities', async () => {
    const result = await dispatcher.dispatch(req('get_outlet_details', { outletId: 'demo-market' }), harvest);
    expect(result.ok).toBe(true);
    const data = result.data as any;
    expect(data.fit.status).toBe('partial');
    expect(data.fit.acceptedKg).toBe(200);
    expect(data.fit.remainingKg).toBe(100);
    expect(result.dataMode).toBe('demo');
  });

  it('preserves unknown capacity instead of fabricating quantity', async () => {
    const result = await dispatcher.dispatch(req('get_outlet_details', { outletId: 'demo-msme-confirm' }), harvest);
    const fit = (result.data as any).fit;
    expect(fit.status).toBe('confirm');
    expect(fit.acceptedKg).toBeNull();
    expect(fit.remainingKg).toBeNull();
  });

  it('rejects arbitrary navigation', async () => {
    const result = await dispatcher.dispatch(req('navigate_to', { path: 'https://example.com' }), harvest);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('not_allowed');
  });

  it('never labels amount after transport as profit in its structured contract', async () => {
    const result = await dispatcher.dispatch(req('set_or_update_transport_amount', { outletId: 'demo-market', amount: 100 }), harvest);
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result.data).toLowerCase()).not.toContain('profit');
  });
});
