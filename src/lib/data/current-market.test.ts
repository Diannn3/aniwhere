import { describe, expect, it } from 'vitest';
import { resolveMarketDataMode } from './current-market';

describe('market data mode isolation', () => {
  it('defaults explicitly to demo mode', () => {
    expect(resolveMarketDataMode()).toBe('demo');
    expect(resolveMarketDataMode('demo')).toBe('demo');
  });

  it('recognizes pilot mode without silently coercing it to demo', () => {
    expect(resolveMarketDataMode('pilot')).toBe('pilot');
  });

  it('rejects unknown market data modes', () => {
    expect(() => resolveMarketDataMode('production')).toThrow(
      'Unsupported PUBLIC_DATA_MODE'
    );
  });
});
