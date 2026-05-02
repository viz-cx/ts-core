import { describe, it, expect } from 'vitest';
import { account, publicKey, wif } from '../../src/types';
import { VizValidationError } from '../../src/errors';

describe('branded constructors', () => {
  it('account() accepts valid names', () => {
    expect(account('alice')).toBe('alice');
    expect(account('alice-bob')).toBe('alice-bob');
    expect(account('a1b2c3.d4e5')).toBe('a1b2c3.d4e5');
  });

  it('account() rejects names that violate VIZ rules', () => {
    expect(() => account('Al')).toThrow(VizValidationError);     // uppercase
    expect(() => account('a')).toThrow(VizValidationError);      // too short
    expect(() => account('a'.repeat(17))).toThrow(VizValidationError); // too long
    expect(() => account('-alice')).toThrow(VizValidationError); // leading dash
    expect(() => account('alice_bob')).toThrow(VizValidationError); // underscore
  });

  it('publicKey() accepts VIZ7-prefixed keys', () => {
    const k = 'VIZ7' + 'A'.repeat(50);
    expect(publicKey(k)).toBe(k);
    expect(() => publicKey('STM7abc')).toThrow(VizValidationError);
  });

  it('wif() accepts plausible base58 secrets', () => {
    const k = '5J' + 'A'.repeat(49);
    expect(wif(k)).toBe(k);
    expect(() => wif('not-a-key')).toThrow(VizValidationError);
  });
});
