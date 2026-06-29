import { describe, it, expect } from 'vitest';
// eslint-disable-next-line no-direct-viz-js-lib -- test oracle
import vizJs from 'viz-js-lib';
import { deriveWif, wifToPublic, isWif, isPubkey } from '../../src/crypto/keys';
import { signDigest, recoverPubkey } from '../../src/crypto/ecdsa';
import { sha256 } from '@noble/hashes/sha2';
import { keys } from '../../src/auth';

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

describe('crypto oracle: signatures', () => {
  it('produces a canonical signature that recovers to the signer pubkey', () => {
    const wif = deriveWif('alice', 'active', 'correct horse battery staple correct horse');
    const pub = wifToPublic(wif);
    const digest = sha256(new Uint8Array([1, 2, 3, 4]));
    const sig = signDigest(digest, wif);
    expect(sig).toHaveLength(130); // 65 bytes hex
    expect(recoverPubkey(digest, sig)).toBe(pub);
    // viz-js-lib accepts and recovers our signature to the same pubkey.
    // recoverPublicKey(sha256_buf) expects a pre-hashed 32-byte buffer;
    // digest is already sha256([1,2,3,4]), so pass it directly (not recoverPublicKeyFromBuffer
    // which would double-hash it).
    const recovered = auth.signature
      .fromBuffer(Buffer.from(sig, 'hex'))
      .recoverPublicKey(Buffer.from(digest))
      .toString();
    expect(recovered).toBe(pub);
  });
});

describe('crypto oracle: auth.sign / auth.verify', () => {
  it('sign(buf) produces a signature recoverable by viz-js-lib', () => {
    const wif = deriveWif(ACCOUNT, 'active', PASSWORD);
    const pub = wifToPublic(wif);
    const buf = Buffer.from('hello viz', 'utf8');
    const sigHex = keys.sign(buf, wif);
    // Our sign() does sha256(buf) then signs the digest.
    // viz-js-lib's recoverPublicKey expects a pre-hashed 32-byte buffer.
    const digest = Buffer.from(sha256(buf));
    const ourSig = auth.signature.fromHex(sigHex);
    expect(ourSig.recoverPublicKey(digest).toString()).toBe(pub);
    // viz-js-lib's signBuffer double-hashes (sha256(sha256(buf)));
    // verify our own signature round-trips correctly via recoverPublicKey.
    expect(keys.verify(buf, sigHex, pub)).toBe(true);
  });

  it('verify(buf, sig, pub) agrees with viz-js-lib recovery', () => {
    const wif = deriveWif(ACCOUNT, 'active', PASSWORD);
    const pub = wifToPublic(wif);
    const buf = Buffer.from('hello viz', 'utf8');
    const sigHex = keys.sign(buf, wif);
    expect(keys.verify(buf, sigHex, pub)).toBe(true);
  });
});
