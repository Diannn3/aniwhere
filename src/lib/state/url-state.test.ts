import { describe, it, expect } from 'vitest';
import { parseDiscoverQuery, serializeDiscoverQuery, parseCompareQuery, todayInManila } from './url-state';

describe('URL State Serialization and Parsing', () => {
  it('correctly parses full valid query string', () => {
    const q = 'crop=tomato&kg=300&origin=los-banos&ready=2026-09-18&view=map&place=demo-cooperative&lang=fil';
    const parsed = parseDiscoverQuery(q);

    expect(parsed.harvest.crop).toBe('tomato');
    expect(parsed.harvest.quantityKg).toBe(300);
    expect(parsed.harvest.originMunicipality).toBe('los-banos');
    expect(parsed.harvest.readyDate).toBe('2026-09-18');
    expect(parsed.view).toBe('map');
    expect(parsed.selectedPlaceId).toBe('demo-cooperative');
    expect(parsed.lang).toBe('fil');
  });

  it('safely falls back on malformed or empty parameters', () => {
    const parsed = parseDiscoverQuery('crop=invalid&kg=-100&origin=unknown&ready=malformed');

    expect(parsed.harvest.crop).toBe('invalid');
    expect(parsed.harvest.quantityKg).toBe(300);
    expect(parsed.harvest.originMunicipality).toBe('los-banos');
    expect(parsed.harvest.readyDate).toBe(todayInManila());
    expect(parsed.view).toBe('list');
    expect(parsed.lang).toBe('en');
  });

  it('uses Manila local date instead of a hard-coded prototype date', () => {
    expect(todayInManila(new Date('2026-09-17T16:30:00Z'))).toBe('2026-09-18');
  });

  it('round-trips serialize and parse cleanly', () => {
    const harvest = {
      crop: 'calamansi',
      quantityKg: 250,
      originMunicipality: 'santa-cruz',
      readyDate: '2026-09-18',
    };

    const serialized = serializeDiscoverQuery(harvest, 'map', 'demo-market', 'fil');
    const parsed = parseDiscoverQuery(serialized);

    expect(parsed.harvest.crop).toBe('calamansi');
    expect(parsed.harvest.quantityKg).toBe(250);
    expect(parsed.harvest.originMunicipality).toBe('santa-cruz');
    expect(parsed.harvest.readyDate).toBe('2026-09-18');
    expect(parsed.view).toBe('map');
    expect(parsed.selectedPlaceId).toBe('demo-market');
    expect(parsed.lang).toBe('fil');
  });

  it('clamps compare query to max 3 outlets', () => {
    const query = 'places=place1,place2,place3,place4,place5&crop=tomato&kg=300';
    const parsed = parseCompareQuery(query);

    expect(parsed.placeIds).toEqual(['place1', 'place2', 'place3']);
  });
});
