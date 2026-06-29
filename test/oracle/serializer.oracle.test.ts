import { describe, it, expect } from 'vitest';
// eslint-disable-next-line no-direct-viz-js-lib -- test oracle
import vizJs from 'viz-js-lib';
import { createRequire } from 'module';
import { ByteWriter } from '../../src/serializer/primitives';
import { writeAsset } from '../../src/serializer/asset';
import { writeAuthority } from '../../src/serializer/authority';

const require = createRequire(import.meta.url);

const ops = (vizJs as any).auth?.serializer ?? require('viz-js-lib/lib/auth/serializer/src/operations');
const types = require('viz-js-lib/lib/auth/serializer/src/types');

function vizHex(serializer: { appendByteBuffer: (b: unknown, v: unknown) => void }, obj: unknown): string {
  const ByteBuffer = require('bytebuffer');
  const b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
  serializer.appendByteBuffer(b, obj);
  return Buffer.from((b.copy(0, b.offset) as { toBuffer: () => Buffer }).toBuffer()).toString('hex');
}

describe('serializer oracle: asset', () => {
  it('serializes VIZ amount identically', () => {
    const w = new ByteWriter();
    writeAsset(w, '1.000 VIZ');
    expect(w.hex()).toBe(vizHex(types.asset, '1.000 VIZ'));
  });
  it('serializes SHARES amount identically', () => {
    const w = new ByteWriter();
    writeAsset(w, '12.345678 SHARES');
    expect(w.hex()).toBe(vizHex(types.asset, '12.345678 SHARES'));
  });
});

describe('serializer oracle: authority', () => {
  it('serializes an authority identically (sorted maps)', () => {
    const auth = {
      weight_threshold: 1,
      account_auths: [['bob', 1], ['alice', 1]],
      key_auths: [],
    };
    const w = new ByteWriter();
    writeAuthority(w, auth as any);
    expect(w.hex()).toBe(vizHex(ops.authority, auth));
  });
});
