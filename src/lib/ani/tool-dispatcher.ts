import { CURRENT_DATA_MODE, CURRENT_OUTLETS } from '../data/current-market';
import { evaluateFit } from '../domain/match';
import { calculateStraightLineDistanceKm } from '../domain/distance';
import { isValidIsoDate } from '../domain/validation';
import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
import type { HarvestQuery, Outlet } from '../domain/types';
import { getOutletRouteEstimate } from '../routing/routing-matrix';
import type { AniFitFacts, AniOutletFacts, AniRouteFacts, AniToolRequest, AniToolResult } from './types';

const ROUTE_ALLOWLIST = new Set(['/', '/discover', '/saved', '/compare']);

function fitFacts(outlet: Outlet, harvest: HarvestQuery): AniFitFacts {
  const fit = evaluateFit(outlet, harvest);
  return {
    status: fit.status,
    statusLabel: fit.statusLabel,
    acceptedKg: fit.acceptedKg,
    remainingKg: fit.remainingKg,
    buyerPostedPricePerKg: fit.evidenceKind === 'buyer_offer' ? fit.samplePricePerKg : null,
    referencePricePerKg: fit.evidenceKind === 'public_reference' ? fit.samplePricePerKg : null,
    demoPricePerKg: fit.evidenceKind === 'demo' ? fit.samplePricePerKg : null,
    grossAmount: fit.grossPay,
    enteredTransport: fit.enteredTransport,
    afterTransportAmount: fit.afterTransportPay,
    evidenceKind: fit.evidenceKind,
    sourceLabel: fit.sourceLabel,
    updatedAt: fit.dataUpdatedAt,
    validUntil: fit.dataValidUntil,
    unknowns: [...fit.unknowns],
    confirmationQuestions: [...fit.conditionsToConfirm],
  };
}

function outletFacts(outlet: Outlet, harvest: HarvestQuery): AniOutletFacts {
  return {
    id: outlet.id,
    slug: outlet.slug,
    name: outlet.name,
    municipality: outlet.municipality,
    fit: fitFacts(outlet, harvest),
  };
}

function error(request: AniToolRequest, code: NonNullable<AniToolResult['error']>['code'], message: string): AniToolResult {
  return { requestId: request.id, tool: request.name, ok: false, dataMode: CURRENT_DATA_MODE, error: { code, message } };
}

const HARVEST_DETAIL_FIELDS = new Set(['variety', 'grade', 'packaging']);

function parseHarvestDetails(value: unknown): HarvestQuery['details'] | null | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).some((key) => !HARVEST_DETAIL_FIELDS.has(key))) return null;

  const details: NonNullable<HarvestQuery['details']> = {};
  for (const key of HARVEST_DETAIL_FIELDS) {
    const field = raw[key];
    if (field === undefined || field === '') continue;
    if (typeof field !== 'string') return null;

    const normalized = field.trim();
    if (!normalized) continue;
    if (normalized.length > 80) return null;
    details[key as 'variety' | 'grade' | 'packaging'] = normalized;
  }

  return Object.keys(details).length ? details : undefined;
}

function parseHarvest(value: unknown): HarvestQuery | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const details = parseHarvestDetails(v.details);
  if (details === null) return null;

  if (
    typeof v.crop !== 'string' || !v.crop.trim() ||
    v.crop.trim().length > 80 ||
    typeof v.quantityKg !== 'number' || !Number.isFinite(v.quantityKg) || v.quantityKg <= 0 || v.quantityKg > 100000 ||
    typeof v.originMunicipality !== 'string' || !LAGUNA_MUNICIPALITIES.some((item) => item.id === v.originMunicipality) ||
    typeof v.readyDate !== 'string' || !isValidIsoDate(v.readyDate)
  ) return null;

  return {
    crop: v.crop.trim(),
    quantityKg: v.quantityKg,
    originMunicipality: v.originMunicipality,
    readyDate: v.readyDate,
    ...(details ? { details } : {}),
  };
}

function findOutlet(idOrSlug: unknown): Outlet | undefined {
  if (typeof idOrSlug !== 'string') return undefined;
  return CURRENT_OUTLETS.find((outlet) => outlet.id === idOrSlug || outlet.slug === idOrSlug);
}

export class AniToolDispatcher {
  async dispatch(request: AniToolRequest, currentHarvest: HarvestQuery): Promise<AniToolResult> {
    try {
      switch (request.name) {
        case 'set_harvest_context': {
          const harvest = parseHarvest(request.args.harvest);
          if (!harvest) return error(request, 'invalid_arguments', 'Harvest context is incomplete or invalid.');
          return { requestId: request.id, tool: request.name, ok: true, dataMode: CURRENT_DATA_MODE, data: { harvest, requiresUiCommit: true } };
        }
        case 'find_outlets':
          return { requestId: request.id, tool: request.name, ok: true, dataMode: CURRENT_DATA_MODE, data: CURRENT_OUTLETS.map((outlet) => outletFacts(outlet, currentHarvest)) };
        case 'get_outlet_details': {
          const outlet = findOutlet(request.args.outletId);
          if (!outlet) return error(request, 'not_found', 'Outlet was not found in the current AniWhere repository.');
          return { requestId: request.id, tool: request.name, ok: true, dataMode: CURRENT_DATA_MODE, data: outletFacts(outlet, currentHarvest) };
        }
        case 'compare_outlets': {
          const ids = Array.isArray(request.args.outletIds) ? request.args.outletIds.slice(0, 3) : [];
          if (!ids.length || ids.some((id) => typeof id !== 'string')) return error(request, 'invalid_arguments', 'Choose one to three known outlets.');
          const outlets = ids.map(findOutlet);
          if (outlets.some((outlet) => !outlet)) return error(request, 'not_found', 'One or more outlets were not found.');
          return { requestId: request.id, tool: request.name, ok: true, dataMode: CURRENT_DATA_MODE, data: outlets.map((outlet) => outletFacts(outlet!, currentHarvest)) };
        }
        case 'explain_current_fit_facts': {
          const outlet = findOutlet(request.args.outletId);
          if (!outlet) return error(request, 'not_found', 'Outlet was not found.');
          return { requestId: request.id, tool: request.name, ok: true, dataMode: CURRENT_DATA_MODE, data: fitFacts(outlet, currentHarvest) };
        }
        case 'get_confirmation_questions': {
          const outlet = findOutlet(request.args.outletId);
          if (!outlet) return error(request, 'not_found', 'Outlet was not found.');
          const fit = fitFacts(outlet, currentHarvest);
          return { requestId: request.id, tool: request.name, ok: true, dataMode: CURRENT_DATA_MODE, data: { unknowns: fit.unknowns, questions: fit.confirmationQuestions } };
        }
        case 'set_or_update_transport_amount': {
          const outlet = findOutlet(request.args.outletId);
          const amount = request.args.amount;
          if (!outlet || typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return error(request, 'invalid_arguments', 'A known outlet and non-negative transport amount are required.');
          const fit = evaluateFit(outlet, currentHarvest, amount);
          return { requestId: request.id, tool: request.name, ok: true, dataMode: CURRENT_DATA_MODE, data: fitFactsFromResult(fit) };
        }
        case 'get_route_estimate': {
          const outlet = findOutlet(request.args.outletId);
          if (!outlet) return error(request, 'not_found', 'Outlet was not found.');
          const origin = LAGUNA_MUNICIPALITIES.find((item) => item.id === currentHarvest.originMunicipality);
          if (!origin) return error(request, 'invalid_arguments', 'The current harvest origin is not a known Laguna municipality.');

          const straightLineDistanceKm = calculateStraightLineDistanceKm(
            origin.lat,
            origin.lng,
            outlet.lat,
            outlet.lng
          );
          const route = getOutletRouteEstimate(currentHarvest.originMunicipality, outlet.id, straightLineDistanceKm);
          const facts: AniRouteFacts = {
            outletId: outlet.id,
            outletName: outlet.name,
            originMunicipality: currentHarvest.originMunicipality,
            originName: origin.name,
            originBasis: 'municipality_centroid',
            source: route.source,
            straightLineDistanceKm: route.straightLineDistanceKm,
            roadDistanceKm: route.roadDistanceKm,
            roadDurationMinutes: route.roadDurationMinutes,
            provider: route.provider,
            profile: route.profile,
            generatedAt: route.generatedAt,
            geometryAvailable: Boolean(route.geometry?.coordinates?.length),
          };

          return { requestId: request.id, tool: request.name, ok: true, dataMode: CURRENT_DATA_MODE, data: facts };
        }
        case 'navigate_to': {
          const path = request.args.path;
          if (typeof path !== 'string') return error(request, 'invalid_arguments', 'A route is required.');
          const allowedPlace = /^\/places\/[a-z0-9-]+$/.test(path) && CURRENT_OUTLETS.some((outlet) => path === `/places/${outlet.slug}`);
          if (!ROUTE_ALLOWLIST.has(path) && !allowedPlace) return error(request, 'not_allowed', 'That route is not available to Ani.');
          return { requestId: request.id, tool: request.name, ok: true, dataMode: CURRENT_DATA_MODE, data: { path, requiresUiNavigation: true } };
        }
        case 'save_outlet': {
          const outlet = findOutlet(request.args.outletId);
          if (!outlet) return error(request, 'not_found', 'Outlet was not found.');
          return { requestId: request.id, tool: request.name, ok: true, dataMode: CURRENT_DATA_MODE, data: { outletId: outlet.id, requiresUiSave: true } };
        }
      }
    } catch {
      return error(request, 'unavailable', 'AniWhere could not complete that action. The manual interface remains available.');
    }
  }
}

function fitFactsFromResult(fit: ReturnType<typeof evaluateFit>): AniFitFacts {
  return {
    status: fit.status, statusLabel: fit.statusLabel, acceptedKg: fit.acceptedKg, remainingKg: fit.remainingKg,
    buyerPostedPricePerKg: fit.evidenceKind === 'buyer_offer' ? fit.samplePricePerKg : null,
    referencePricePerKg: fit.evidenceKind === 'public_reference' ? fit.samplePricePerKg : null,
    demoPricePerKg: fit.evidenceKind === 'demo' ? fit.samplePricePerKg : null,
    grossAmount: fit.grossPay, enteredTransport: fit.enteredTransport,
    afterTransportAmount: fit.afterTransportPay, evidenceKind: fit.evidenceKind, sourceLabel: fit.sourceLabel,
    updatedAt: fit.dataUpdatedAt, validUntil: fit.dataValidUntil, unknowns: [...fit.unknowns],
    confirmationQuestions: [...fit.conditionsToConfirm],
  };
}
