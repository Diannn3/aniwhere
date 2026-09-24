import { describe, expect, it } from 'vitest';
import { AniToolDispatcher } from './tool-dispatcher';
import type { AniToolRequest } from './types';
import { todayInManila } from '../state/url-state';

const dispatcher = new AniToolDispatcher();
const harvest = { crop: 'tomato', quantityKg: 300, originMunicipality: 'los-banos', readyDate: todayInManila() };

const req = (name: AniToolRequest['name'], args: Record<string, unknown> = {}): AniToolRequest => ({ id: 'test', name, args });

describe('AniToolDispatcher', () => {
  it.each([
    ['demo-processor', 'match', 300, 0],
    ['demo-market', 'partial', 200, 100],
    ['demo-msme-confirm', 'confirm', null, null],
    ['demo-organic-shop', 'no_match', 0, 300],
  ])('preserves %s deterministic fit as %s', async (outletId, status, acceptedKg, remainingKg) => {
    const result = await dispatcher.dispatch(req('get_outlet_details', { outletId }), harvest);
    expect(result.ok).toBe(true);
    const fit = (result.data as any).fit;
    expect(fit.status).toBe(status);
    expect(fit.acceptedKg).toBe(acceptedKg);
    expect(fit.remainingKg).toBe(remainingKg);
    expect(result.dataMode).toBe('demo');
  });

  it('rejects malformed harvest updates instead of guessing', async () => {
    const result = await dispatcher.dispatch(req('set_harvest_context', { harvest: { crop: 'tomato', quantityKg: 0 } }), harvest);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('invalid_arguments');
  });

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


  it('returns route context from the same fail-closed routing layer', async () => {
    const result = await dispatcher.dispatch(req('get_route_estimate', { outletId: 'demo-market' }), harvest);
    expect(result.ok).toBe(true);
    const route = result.data as any;
    expect(route.originMunicipality).toBe('los-banos');
    expect(route.originBasis).toBe('municipality_centroid');
    expect(route.source).toBe('straight_line');
    expect(route.straightLineDistanceKm).toBeTypeOf('number');
    expect(route.roadDistanceKm).toBeNull();
    expect(route.roadDurationMinutes).toBeNull();
    expect(route.provider).toBeNull();
    expect(route.geometryAvailable).toBe(false);
  });

  it('rejects route estimates for unknown outlets', async () => {
    const result = await dispatcher.dispatch(req('get_route_estimate', { outletId: 'not-a-real-outlet' }), harvest);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('not_found');
  });


  it('allows typed discovery map navigation only for known outlets', async () => {
    const result = await dispatcher.dispatch(req('navigate_to', {
      path: '/discover',
      view: 'map',
      outletId: 'demo-market',
    }), harvest);
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      path: '/discover',
      view: 'map',
      selectedOutletId: 'demo-market',
      requiresUiNavigation: true,
    });

    const unknownOutlet = await dispatcher.dispatch(req('navigate_to', {
      path: '/discover',
      view: 'map',
      outletId: 'missing-outlet',
    }), harvest);
    expect(unknownOutlet.ok).toBe(false);
    expect(unknownOutlet.error?.code).toBe('not_found');

    const invalidView = await dispatcher.dispatch(req('navigate_to', {
      path: '/discover',
      view: 'satellite',
    }), harvest);
    expect(invalidView.ok).toBe(false);
    expect(invalidView.error?.code).toBe('invalid_arguments');

    const stateOnWrongRoute = await dispatcher.dispatch(req('navigate_to', {
      path: '/saved',
      view: 'map',
    }), harvest);
    expect(stateOnWrongRoute.ok).toBe(false);
    expect(stateOnWrongRoute.error?.code).toBe('not_allowed');
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

  it('rejects incomplete or invalid harvest context instead of guessing', async () => {
    const missingDate = await dispatcher.dispatch(req('set_harvest_context', {
      harvest: { crop: 'tomato', quantityKg: 300, originMunicipality: 'los-banos' },
    }), harvest);
    expect(missingDate.ok).toBe(false);
    expect(missingDate.error?.code).toBe('invalid_arguments');

    const unknownOrigin = await dispatcher.dispatch(req('set_harvest_context', {
      harvest: { crop: 'tomato', quantityKg: 300, originMunicipality: 'made-up-place', readyDate: '2026-09-24' },
    }), harvest);
    expect(unknownOrigin.ok).toBe(false);

    const impossibleQuantity = await dispatcher.dispatch(req('set_harvest_context', {
      harvest: { crop: 'tomato', quantityKg: 100001, originMunicipality: 'los-banos', readyDate: '2026-09-24' },
    }), harvest);
    expect(impossibleQuantity.ok).toBe(false);
  });


  it('normalizes bounded optional harvest details and rejects arbitrary nested data', async () => {
    const valid = await dispatcher.dispatch(req('set_harvest_context', {
      harvest: {
        crop: 'tomato',
        quantityKg: 300,
        originMunicipality: 'los-banos',
        readyDate: '2026-09-24',
        details: { variety: '  Roma  ', grade: '', packaging: 'crate' },
      },
    }), harvest);
    expect(valid.ok).toBe(true);
    expect((valid.data as any).harvest.details).toEqual({ variety: 'Roma', packaging: 'crate' });

    const unknownDetail = await dispatcher.dispatch(req('set_harvest_context', {
      harvest: {
        crop: 'tomato',
        quantityKg: 300,
        originMunicipality: 'los-banos',
        readyDate: '2026-09-24',
        details: { variety: 'Roma', hiddenInstruction: 'anything' },
      },
    }), harvest);
    expect(unknownDetail.ok).toBe(false);

    const oversized = await dispatcher.dispatch(req('set_harvest_context', {
      harvest: {
        crop: 'tomato',
        quantityKg: 300,
        originMunicipality: 'los-banos',
        readyDate: '2026-09-24',
        details: { variety: 'x'.repeat(81) },
      },
    }), harvest);
    expect(oversized.ok).toBe(false);
  });


  it('keeps demo price separate from buyer-posted and reference price fields', async () => {
    const result = await dispatcher.dispatch(req('get_outlet_details', { outletId: 'demo-market' }), harvest);
    const fit = (result.data as any).fit;
    expect(fit.demoPricePerKg).toBeTypeOf('number');
    expect(fit.buyerPostedPricePerKg).toBeNull();
    expect(fit.referencePricePerKg).toBeNull();
  });

});
