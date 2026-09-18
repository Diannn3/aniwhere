import type { Outlet } from '../lib/domain/types';
import { DEMO_MARKET_SNAPSHOT } from '../lib/data/demo-market-repository';
import { composeOutletViewModels } from '../lib/data/outlet-adapter';
import { DEMO_TRANSPORT_ASSUMPTIONS } from './demo-transport';

/**
 * Backward-compatible presentation view for the current frontend.
 *
 * Source data is no longer authored as one monolithic outlet object:
 * stable places, crop capability evidence, buyer offers, sources, and demo
 * hauling assumptions live separately and are composed only at this boundary.
 */
export const DEMO_OUTLETS: Outlet[] = composeOutletViewModels(
  DEMO_MARKET_SNAPSHOT,
  DEMO_TRANSPORT_ASSUMPTIONS
);
