import { describe, it, expect } from 'vitest';
import {
  base58Encode, base58Decode,
  base58CheckEncodeSha, base58CheckDecodeSha,
  base58CheckEncodeRipemd, base58CheckDecodeRipemd,
} from '../../src/crypto/base58';

describe('base58', () => {
  it('round-trips raw bytes', () => {
    const b = new Uint8Array([0, 0, 1, 2, 3, 255]);
    expect(base58Decode(base58Encode(b))).toEqual(b);
  });
  it('preserves leading zero bytes as 1s', () => {
    expect(base58Encode(new Uint8Array([0, 0, 5]))).toMatch(/^11/);
  });
  it('round-trips sha256 base58check', () => {
    const p = new Uint8Array([0x80, 1, 2, 3, 4]);
    expect(base58CheckDecodeSha(base58CheckEncodeSha(p))).toEqual(p);
  });
  it('round-trips ripemd160 base58check', () => {
    const p = new Uint8Array(33).fill(7);
    expect(base58CheckDecodeRipemd(base58CheckEncodeRipemd(p))).toEqual(p);
  });
  it('rejects a corrupted checksum', () => {
    const s = base58CheckEncodeSha(new Uint8Array([1, 2, 3]));
    const bad = s.slice(0, -1) + (s.endsWith('1') ? '2' : '1');
    expect(() => base58CheckDecodeSha(bad)).toThrow();
  });
});
