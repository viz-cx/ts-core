import { describe, it, expect } from 'vitest';
import { sha256 } from '@noble/hashes/sha256';
import { deriveWif, wifToPublic } from '../../src/crypto/keys';
import { signDigest, recoverPubkey } from '../../src/crypto/ecdsa';

describe('ecdsa (frozen)', () => {
  const wif = deriveWif('alice', 'active', 'correct horse battery staple correct horse');
  const digest = sha256(new Uint8Array([9, 8, 7]));

  it('is deterministic and round-trips', () => {
    const a = signDigest(digest, wif);
    const b = signDigest(digest, wif);
    expect(a).toBe(b);
    expect(recoverPubkey(digest, a)).toBe(wifToPublic(wif));
  });
});
