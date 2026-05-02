import { describe, it, expect } from 'vitest';
import { keys } from '../../src/auth';

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
});
