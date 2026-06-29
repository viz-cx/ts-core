import { describe, it, expect } from 'vitest';
// eslint-disable-next-line no-direct-viz-js-lib -- test oracle
import vizJs from 'viz-js-lib';
import { deriveWif, wifToPublic, isWif, isPubkey } from '../../src/crypto/keys';

const auth = (vizJs as any).auth;
const ACCOUNT = 'alice';
const PASSWORD = 'correct horse battery staple correct horse';

describe('crypto oracle: keys', () => {
  for (const role of ['owner', 'active', 'regular', 'memo']) {
    it(`derives ${role} WIF identical to viz-js-lib`, () => {
      const ours = deriveWif(ACCOUNT, role, PASSWORD);
      const theirs = auth.getPrivateKeys(ACCOUNT, PASSWORD, [role])[role];
      expect(ours).toBe(theirs);
    });
  }
  it('wifToPublic matches viz-js-lib', () => {
    const wif = deriveWif(ACCOUNT, 'active', PASSWORD);
    expect(wifToPublic(wif)).toBe(auth.wifToPublic(wif));
  });
  it('isWif / isPubkey agree with viz-js-lib', () => {
    const wif = deriveWif(ACCOUNT, 'active', PASSWORD);
    const pub = wifToPublic(wif);
    expect(isWif(wif)).toBe(auth.isWif(wif));
    expect(isPubkey(pub)).toBe(true);
  });
});
