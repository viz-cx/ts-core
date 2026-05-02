import { VizValidationError } from './errors';
import type { AssetSymbol, AssetInput } from './types';

const PRECISION: Record<AssetSymbol, number> = { VIZ: 3, SHARES: 6 };

export class Asset<S extends AssetSymbol = AssetSymbol> {
  readonly amount: bigint;
  readonly symbol: S;
  readonly precision: number;

  private constructor(amount: bigint, symbol: S) {
    this.amount = amount;
    this.symbol = symbol;
    this.precision = PRECISION[symbol];
  }

  static parse<S extends AssetSymbol>(s: string): Asset<S> {
    if (typeof s !== 'string') {
      throw new VizValidationError({ field: 'asset', expected: 'string "<value> <SYMBOL>"', received: s });
    }
    const m = /^(\d+)\.(\d+) (VIZ|SHARES)$/.exec(s);
    if (!m) {
      throw new VizValidationError({ field: 'asset', expected: '"<int>.<frac> VIZ|SHARES"', received: s });
    }
    const [, intPart, fracPart, sym] = m as unknown as [string, string, string, AssetSymbol];
    const expectedPrecision = PRECISION[sym];
    if (fracPart.length !== expectedPrecision) {
      throw new VizValidationError({
        field: 'asset.precision',
        expected: `${expectedPrecision} fractional digits for ${sym}`,
        received: s,
      });
    }
    const amount = BigInt(intPart + fracPart);
    return new Asset<S>(amount, sym as S);
  }

  static from<S extends AssetSymbol>(input: AssetInput<S>, symbol: S): Asset<S> {
    if (input instanceof Asset) {
      if (input.symbol !== symbol) {
        throw new VizValidationError({
          field: 'asset.symbol',
          expected: symbol,
          received: input.symbol,
        });
      }
      return input as Asset<S>;
    }
    if (typeof input === 'string') {
      const a = Asset.parse<S>(input);
      if (a.symbol !== symbol) {
        throw new VizValidationError({ field: 'asset.symbol', expected: symbol, received: a.symbol });
      }
      return a;
    }
    return Asset.parse<S>(`${input.value} ${input.symbol}`);
  }

  add(other: Asset<S>): Asset<S> {
    this.requireSameSymbol(other);
    return new Asset<S>(this.amount + other.amount, this.symbol);
  }
  sub(other: Asset<S>): Asset<S> {
    this.requireSameSymbol(other);
    return new Asset<S>(this.amount - other.amount, this.symbol);
  }
  eq(other: Asset<S>): boolean { this.requireSameSymbol(other); return this.amount === other.amount; }
  lt(other: Asset<S>): boolean { this.requireSameSymbol(other); return this.amount < other.amount; }
  gt(other: Asset<S>): boolean { this.requireSameSymbol(other); return this.amount > other.amount; }

  toString(): string {
    const s = this.amount.toString().padStart(this.precision + 1, '0');
    const intPart = s.slice(0, s.length - this.precision);
    const fracPart = s.slice(s.length - this.precision);
    return `${intPart}.${fracPart} ${this.symbol}`;
  }
  toJSON(): string { return this.toString(); }

  private requireSameSymbol(other: Asset<AssetSymbol>): void {
    if (this.symbol !== other.symbol) {
      throw new VizValidationError({
        field: 'asset.symbol',
        expected: this.symbol,
        received: other.symbol,
      });
    }
  }
}

export const viz = (value: string): Asset<'VIZ'> => Asset.parse<'VIZ'>(`${value} VIZ`);
export const shares = (value: string): Asset<'SHARES'> => Asset.parse<'SHARES'>(`${value} SHARES`);
