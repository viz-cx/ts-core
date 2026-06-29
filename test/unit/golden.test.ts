import { describe, it, expect } from 'vitest';
import golden from '../fixtures/golden.json';
import { sha256 } from '@noble/hashes/sha256';
import { ByteWriter } from '../../src/serializer/primitives';
import { writeOperation } from '../../src/serializer/operation';
import { serializeTransaction } from '../../src/serializer/transaction';
import { signDigest, recoverPubkey } from '../../src/crypto/ecdsa';

describe('golden vectors (frozen)', () => {
  for (const { name, sample, hex } of golden.ops) {
    it(`serializes ${name} to frozen bytes`, () => {
      const w = new ByteWriter();
      writeOperation(w, name, sample as Record<string, unknown>);
      expect(w.hex()).toBe(hex);
    });
  }

  it('serializes the frozen tx', () => {
    expect(Buffer.from(serializeTransaction(golden.tx.wire as any)).toString('hex')).toBe(golden.tx.hex);
  });

  it('produces a reproducible signature that recovers to the signer', () => {
    const digest = Uint8Array.from(Buffer.from(golden.sig.digestHex, 'hex'));
    const sig = signDigest(digest, golden.sig.wif);
    expect(sig).toBe(golden.sig.sigHex);
    expect(recoverPubkey(digest, sig)).toBe(golden.sig.pub);
  });
});

it('golden digest matches chain-id + tx bytes', () => {
  // Re-derive the digest from scratch and confirm it matches the frozen digestHex.
  const txBytes = serializeTransaction(golden.tx.wire as any);
  const chainIdBytes = Buffer.from('2040effda178d4fffff5eab7a915d4019879f5205cc5392e4bcced2b6edda0cd', 'hex');
  const payload = new Uint8Array(chainIdBytes.length + txBytes.length);
  payload.set(chainIdBytes, 0);
  payload.set(txBytes, chainIdBytes.length);
  const digest = sha256(payload);
  expect(Buffer.from(digest).toString('hex')).toBe(golden.sig.digestHex);
});
