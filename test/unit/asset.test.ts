import { describe, it, expect } from 'vitest';
import { Asset, viz, shares } from '../../src/asset';
import { VizValidationError } from '../../src/errors';

describe('Asset', () => {
  it('parses canonical "1.000 VIZ"', () => {
    const a = Asset.parse('1.000 VIZ');
    expect(a.symbol).toBe('VIZ');
    expect(a.precision).toBe(3);
    expect(a.amount).toBe(1000n);
    expect(a.toString()).toBe('1.000 VIZ');
    expect(a.toJSON()).toBe('1.000 VIZ');
  });

  it('parses "1.000000 SHARES"', () => {
    const a = Asset.parse('1.000000 SHARES');
    expect(a.symbol).toBe('SHARES');
    expect(a.precision).toBe(6);
    expect(a.amount).toBe(1_000_000n);
  });

  it('rejects wrong precision', () => {
    expect(() => Asset.parse('1 VIZ')).toThrow(VizValidationError);
    expect(() => Asset.parse('1.00 VIZ')).toThrow(VizValidationError);
    expect(() => Asset.parse('1.0000 VIZ')).toThrow(VizValidationError);
  });

  it('rejects unknown symbols', () => {
    // @ts-expect-error - ZAR not an AssetSymbol
    expect(() => Asset.parse('1.000 ZAR')).toThrow(VizValidationError);
  });

  it('add() preserves symbol', () => {
    const r = viz('1.000').add(viz('0.500'));
    expect(r.toString()).toBe('1.500 VIZ');
  });

  it('viz() and shares() factories', () => {
    expect(viz('2.500').toString()).toBe('2.500 VIZ');
    expect(shares('0.000001').toString()).toBe('0.000001 SHARES');
  });

  it('compare', () => {
    expect(viz('1.000').lt(viz('2.000'))).toBe(true);
    expect(viz('1.000').eq(viz('1.000'))).toBe(true);
  });

  it('Asset.from accepts Asset, string, or object', () => {
    const a = viz('1.000');
    expect(Asset.from<'VIZ'>(a, 'VIZ').amount).toBe(1000n);
    expect(Asset.from<'VIZ'>('1.000 VIZ', 'VIZ').amount).toBe(1000n);
    expect(Asset.from<'VIZ'>({ value: '1.000', symbol: 'VIZ' }, 'VIZ').amount).toBe(1000n);
  });

  it('Asset.from rejects symbol mismatch from Asset instance', () => {
    const a = shares('1.000000');
    // @ts-expect-error - intentional mismatch for runtime check
    expect(() => Asset.from<'VIZ'>(a, 'VIZ')).toThrow(VizValidationError);
  });

  it('Asset.from rejects symbol mismatch from string', () => {
    expect(() => Asset.from<'VIZ'>('1.000000 SHARES', 'VIZ')).toThrow(VizValidationError);
  });

  it('Asset.parse rejects non-string input', () => {
    // @ts-expect-error - intentional non-string for runtime check
    expect(() => Asset.parse(123)).toThrow(VizValidationError);
  });

  it('sub() preserves symbol', () => {
    const r = viz('1.000').sub(viz('0.250'));
    expect(r.toString()).toBe('0.750 VIZ');
  });

  it('gt() compares amounts within same symbol', () => {
    expect(viz('2.000').gt(viz('1.000'))).toBe(true);
    expect(viz('1.000').gt(viz('1.000'))).toBe(false);
  });
});
