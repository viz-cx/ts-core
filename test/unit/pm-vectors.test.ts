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

  it('rejects a malformed commitment', () => {
    const w = new ByteWriter();
    expect(() => writeOperation(w, 'pm_commit_bet', {
      account: 'alice', market_id: 1, commitment: 'ab'.repeat(31), escrow_amount: '1.000 VIZ', no_reveal_fee_percent: 0,
    })).toThrow(/sha256/);
  });
});
