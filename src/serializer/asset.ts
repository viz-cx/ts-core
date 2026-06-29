import type { ByteWriter } from './primitives';
import { Asset } from '../asset';
import type { AssetSymbol } from '../types';
import { VizValidationError } from '../errors';

const encoder = new TextEncoder();

export function writeAsset(w: ByteWriter, value: string): void {
  const sym = value.split(' ')[1] as AssetSymbol;
  const asset = Asset.from(value, sym);
  if (asset.symbol.length > 6) {
    throw new VizValidationError({ field: 'asset.symbol', expected: '<=6 chars', received: asset.symbol });
  }
  w.int64(asset.amount);
  w.uint8(asset.precision);
  const symBytes = encoder.encode(asset.symbol.toUpperCase());
  w.raw(symBytes);
  for (let i = 0; i < 7 - asset.symbol.length; i++) w.uint8(0);
}
