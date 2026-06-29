import { describe, it, expect } from 'vitest';
import { deriveWif, wifToPublic, isWif, isPubkey } from '../../src/crypto/keys';

describe('keys (frozen)', () => {
  it('derives a stable, valid keypair', () => {
    const wif = deriveWif('alice', 'active', 'correct horse battery staple correct horse');
    expect(isWif(wif)).toBe(true);
    const pub = wifToPublic(wif);
    expect(pub.startsWith('VIZ')).toBe(true);
    expect(isPubkey(pub)).toBe(true);
  });
  it('rejects malformed input', () => {
    expect(isWif('not-a-key')).toBe(false);
    expect(isPubkey('VIZbroken')).toBe(false);
  });
});
