import { ByteWriter } from './primitives';
import { writeOperation } from './operation';

export interface WireTx {
  ref_block_num: number;
  ref_block_prefix: number;
  expiration: string;
  operations: ReadonlyArray<readonly [string, Record<string, unknown>]>;
  extensions: ReadonlyArray<unknown>;
}

export function serializeTransaction(tx: WireTx): Uint8Array {
  const w = new ByteWriter();
  w.uint16(tx.ref_block_num);
  w.uint32(tx.ref_block_prefix);
  w.time(tx.expiration);
  w.vector(tx.operations, (ww, [name, op]) => writeOperation(ww, name, op));
  w.vector(tx.extensions, () => { /* no extensions are produced by this lib */ });
  return w.bytes();
}
