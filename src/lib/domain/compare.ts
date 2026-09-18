import type { Outlet, HarvestQuery, FitResult } from './types';
import { evaluateFit } from './match';

export interface ComparisonRow {
  outlet: Outlet;
  fit: FitResult;
  enteredTransport: number | null;
  customTransportActive: boolean;
}

export function buildComparison(
  outlets: Outlet[],
  query: HarvestQuery,
  customTransports: Record<string, number | null> = {}
): ComparisonRow[] {
  // Cap at 3 outlets per contract
  const targetOutlets = outlets.slice(0, 3);

  return targetOutlets.map((outlet) => {
    const customT = customTransports[outlet.id];
    const transportArg = customT !== undefined && customT !== null ? customT : undefined;
    const fit = evaluateFit(outlet, query, transportArg);

    return {
      outlet,
      fit,
      enteredTransport: fit.enteredTransport,
      customTransportActive: customT !== undefined && customT !== null,
    };
  });
}
