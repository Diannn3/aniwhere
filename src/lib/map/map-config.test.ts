import { describe, expect, it } from 'vitest';
import { selectedRoutePadding } from './map-config';

describe('selectedRoutePadding', () => {
  it('reserves the actual mobile picker inset even above the phone breakpoint', () => {
    expect(selectedRoutePadding(false, 260)).toEqual({
      top: 76,
      right: 34,
      bottom: 284,
      left: 34,
    });
  });

  it('keeps default phone and desktop padding when no picker inset is active', () => {
    expect(selectedRoutePadding(true)).toEqual({
      top: 76,
      right: 34,
      bottom: 190,
      left: 34,
    });
    expect(selectedRoutePadding(false, 0)).toEqual({
      top: 72,
      right: 52,
      bottom: 118,
      left: 52,
    });
  });
});
