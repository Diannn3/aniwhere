import { describe, expect, it } from 'vitest';
import { ANI_SYSTEM_INSTRUCTION } from './system-instruction';

describe('Ani system instruction', () => {
  it('binds Ani to deterministic AniWhere fit and unknowns', () => {
    expect(ANI_SYSTEM_INSTRUCTION).toMatch(/not the market-matching engine/i);
    expect(ANI_SYSTEM_INSTRUCTION).toMatch(/Never decide whether an outlet/i);
    expect(ANI_SYSTEM_INSTRUCTION).toMatch(/Never turn unknown information into a confident answer/i);
  });

  it('protects source, price and financial wording', () => {
    expect(ANI_SYSTEM_INSTRUCTION).toMatch(/Describe recorded market facts by their source and date/i);
    expect(ANI_SYSTEM_INSTRUCTION).not.toMatch(/demo|sample/i);
    expect(ANI_SYSTEM_INSTRUCTION).toMatch(/Never call a reference price a buyer offer/i);
    expect(ANI_SYSTEM_INSTRUCTION).toMatch(/Never call proceeds-after-transport profit/i);
  });


  it('binds travel answers to AniWhere routing evidence and origin precision', () => {
    expect(ANI_SYSTEM_INSTRUCTION).toMatch(/use AniWhere's route tool/i);
    expect(ANI_SYSTEM_INSTRUCTION).toMatch(/straight-line distance/i);
    expect(ANI_SYSTEM_INSTRUCTION).toMatch(/municipality centroid/i);
    expect(ANI_SYSTEM_INSTRUCTION).toMatch(/exact farm/i);
  });

  it('forbids transaction and reservation claims', () => {
    expect(ANI_SYSTEM_INSTRUCTION).toMatch(/Do not perform external transactions/i);
    expect(ANI_SYSTEM_INSTRUCTION).toMatch(/Do not imply that capacity is reserved/i);
    expect(ANI_SYSTEM_INSTRUCTION).toMatch(/Do not imply that a buyer has agreed/i);
  });
});
