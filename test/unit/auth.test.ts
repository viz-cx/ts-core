import { describe, it, expect } from 'vitest';
import { keys } from '../../src/auth';
import { VizValidationError } from '../../src/errors';

describe('keys', () => {
  it('fromPassword(account, password) returns full key set', () => {
    const ks = keys.fromPassword('alice', 'p4ssw0rd-test-only');
    expect(typeof ks.owner).toBe('string');
    expect(typeof ks.active).toBe('string');
    expect(typeof ks.regular).toBe('string');
    expect(typeof ks.memo).toBe('string');
    expect(ks.owner.startsWith('5')).toBe(true);
  });

  it('fromPassword(account, password, role) returns single WIF', () => {
    const k = keys.fromPassword('alice', 'p4ssw0rd-test-only', 'active');
    expect(typeof k).toBe('string');
    expect(k.startsWith('5')).toBe(true);
  });

  it('toPublic(wif) returns VIZ-prefixed public key', () => {
    const wif = keys.fromPassword('alice', 'p4ssw0rd-test-only', 'active');
    const pub = keys.toPublic(wif);
    expect(pub.startsWith('VIZ')).toBe(true);
  });

  it('isWif and isPubkey type guards', () => {
    const wif = keys.fromPassword('alice', 'p4ssw0rd-test-only', 'active');
    expect(keys.isWif(wif)).toBe(true);
    expect(keys.isWif('not-a-wif')).toBe(false);
    expect(keys.isPubkey(keys.toPublic(wif))).toBe(true);
  });

  it('generate() returns wif and pub', () => {
    const { wif, pub } = keys.generate();
    expect(wif.startsWith('5')).toBe(true);
    expect(pub.startsWith('VIZ')).toBe(true);
  });

  it('fromPassword rejects unknown role', () => {
    expect(() =>
      // @ts-expect-error - intentional bad role for runtime check
      keys.fromPassword('alice', 'p4ssw0rd-test-only', 'banker'),
    ).toThrow(VizValidationError);
  });

  it('sign(buf, wif) returns a hex signature', () => {
    const wif = keys.fromPassword('alice', 'p4ssw0rd-test-only', 'active');
    const buf = new Uint8Array(32);
    for (let i = 0; i < 32; i++) buf[i] = i;
    const sig = keys.sign(buf, wif);
    expect(typeof sig).toBe('string');
    expect(sig.length).toBeGreaterThan(0);
    expect(/^[0-9a-f]+$/i.test(sig)).toBe(true);
  });
});
