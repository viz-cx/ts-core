import { describe, it, expect } from 'vitest';
import vectors from '../fixtures/pm-vectors.json';
import { ByteWriter } from '../../src/serializer/primitives';
import { writeOperation } from '../../src/serializer/operation';

// Byte-exact vectors shared with viz-python-lib (tests/test_pm_operations.py) and viz-php-lib.
describe('HF14 prediction-market vectors (cross-library)', () => {
  for (const { name, input, hex } of vectors) {
    it(`serializes ${name} byte-exactly`, () => {
      const w = new ByteWriter();
      writeOperation(w, name, input as Record<string, unknown>);
      expect(w.hex()).toBe(hex);
    });
  }

  it('writes int8 side -1 as two\'s complement', () => {
    const bet = vectors.find(v => v.name === 'pm_place_bet')!;
    // op id (1) + "alice" (6) + market_id int64 (8) → side at byte 15
    expect(bet.hex.slice(30, 32)).toBe('01');
    const w = new ByteWriter();
    writeOperation(w, 'pm_place_bet', { ...bet.input, side: -1 } as Record<string, unknown>);
    expect(w.hex()).toBe(bet.hex.slice(0, 30) + 'ff' + bet.hex.slice(32));
  });

  it('rejects an out-of-range int8', () => {
    const bet = vectors.find(v => v.name === 'pm_place_bet')!;
    expect(() => writeOperation(new ByteWriter(), 'pm_place_bet', { ...bet.input, side: 200 } as Record<string, unknown>)).toThrow(/int8/);
  });

  it('rejects a malformed commitment', () => {
    const w = new ByteWriter();
    expect(() => writeOperation(w, 'pm_commit_bet', {
      account: 'alice', market_id: 1, commitment: 'ab'.repeat(31), escrow_amount: '1.000 VIZ', no_reveal_fee_percent: 0,
    })).toThrow(/sha256/);
  });
});
