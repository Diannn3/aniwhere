import type { Outlet } from '../domain/types';
import { DEMO_OUTLETS } from '../../content/demo-outlets';

export type MarketDataMode = 'demo' | 'pilot';

export function resolveMarketDataMode(value?: string): MarketDataMode {
  if (!value || value === 'demo') return 'demo';
  if (value === 'pilot') return 'pilot';

  throw new Error(
    `Unsupported PUBLIC_DATA_MODE="${value}". Expected "demo" or "pilot".`
  );
}

export const CURRENT_DATA_MODE = resolveMarketDataMode(
  import.meta.env.PUBLIC_DATA_MODE
);

/**
 * Fail closed if someone asks the frontend to run in pilot mode before a
 * reviewed pilot repository has been wired. This prevents demo fixtures from
 * silently masquerading as pilot/live market data.
 */
if (CURRENT_DATA_MODE === 'pilot') {
  throw new Error(
    'PUBLIC_DATA_MODE=pilot was requested, but no reviewed pilot data adapter is configured yet. Use demo mode or implement the pilot repository explicitly.'
  );
}

export const CURRENT_OUTLETS: Outlet[] = DEMO_OUTLETS;
export const CURRENT_DATA_LABEL = 'Demo — sample data';
