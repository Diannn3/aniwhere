import { describe, expect, it } from 'vitest';
import { ANI_FAQ_VERSION, ANI_FAQS, matchAniFaq, normalizeFaqQuery } from './faq';

describe('Ani local FAQ', () => {
  it('contains all 32 approved starter questions', () => {
    expect(ANI_FAQ_VERSION).toBe(1);
    expect(ANI_FAQS).toHaveLength(32);
    expect(new Set(ANI_FAQS.map((faq) => faq.id)).size).toBe(32);
    expect(ANI_FAQS.every((faq) => faq.question.en && faq.question.fil && faq.answer.en && faq.answer.fil)).toBe(true);
  });

  it.each([
    ['What does Partial match mean?', 'partial-match'],
    ['Ano ang ibig sabihin ng Full match?', 'full-match'],
    ['gastos sa transport', 'transport-expense'],
    ['after transport ba ay tubo?', 'not-profit'],
    ['Gagana ba ang mapa offline?', 'map-offline'],
    ['saan napupunta ang data', 'data-privacy-local'],
  ])('answers a specific question locally: %s', (query, id) => {
    const result = matchAniFaq(query);
    expect(result.kind).toBe('answer');
    if (result.kind === 'answer') expect(result.faq.id).toBe(id);
  });

  it('keeps broad questions ambiguous instead of guessing', () => {
    const result = matchAniFaq('price');
    expect(result.kind).toBe('choices');
    if (result.kind === 'choices') expect(result.faqs.length).toBeLessThanOrEqual(3);
  });

  it('returns no result for unrelated text', () => {
    expect(matchAniFaq('kumusta ang panahon bukas').kind).toBe('none');
  });

  it('normalizes accents and punctuation', () => {
    expect(normalizeFaqQuery('  Paano—gagana?  ')).toBe('paano gagana');
  });
});
