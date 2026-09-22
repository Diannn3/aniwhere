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
    ['What does Accepts part of your harvest mean?', 'partial-match'],
    ['What does Partial match mean?', 'partial-match'],
    ['Ano ang ibig sabihin ng Tugma sa ani?', 'full-match'],
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

  it('keeps canonical trust boundaries in the bundled answers', () => {
    const full = ANI_FAQS.find((faq) => faq.id === 'full-match');
    const partial = ANI_FAQS.find((faq) => faq.id === 'partial-match');
    const price = ANI_FAQS.find((faq) => faq.id === 'sample-price');
    const distance = ANI_FAQS.find((faq) => faq.id === 'distance');
    const offline = ANI_FAQS.find((faq) => faq.id === 'offline-help');

    expect(full?.question.en).toBe('What does Matches your harvest mean?');
    expect(full?.answer.en).toMatch(/not a sale, reservation, or promise/i);
    expect(partial?.answer.en).toMatch(/only the accepted quantity/i);
    expect(price?.answer.en).toMatch(/expired offers are not active demand/i);
    expect(distance?.answer.en).toMatch(/municipality center.*not your exact farm/i);
    expect(offline?.answer.en).toMatch(/does not create fresh buyer demand/i);
  });

  it('normalizes accents and punctuation', () => {
    expect(normalizeFaqQuery('  Paano—gagana?  ')).toBe('paano gagana');
  });
});
