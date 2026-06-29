import { describe, it, expect } from 'vitest';
// eslint-disable-next-line no-direct-viz-js-lib -- test oracle
import vizJs from 'viz-js-lib';
import { createRequire } from 'module';
import { sha256 } from '@noble/hashes/sha2';
import { CHAIN_ID } from '../../src/constants';
import { serializeTransaction } from '../../src/serializer/transaction';
import { signDigest, recoverPubkey } from '../../src/crypto/ecdsa';
import { deriveWif, wifToPublic } from '../../src/crypto/keys';

const require = createRequire(import.meta.url);
const auth = (vizJs as any).auth;

describe('sign oracle', () => {
  it('our digest equals chain_id ++ viz tx buffer, and sig recovers to signer', () => {
    const wire = {
      ref_block_num: 100,
      ref_block_prefix: 200,
      expiration: '2026-06-30T00:00:00',
      operations: [['transfer', { from: 'alice', to: 'bob', amount: '1.000 VIZ', memo: '' }]] as any,
      extensions: [],
    };
    const ourBytes = Buffer.from(serializeTransaction(wire)).toString('hex');
    const ops = require('viz-js-lib/lib/auth/serializer/src/operations');
    const theirBytes = Buffer.from(ops.transaction.toBuffer(wire)).toString('hex');
    expect(ourBytes).toBe(theirBytes);

    const wif = deriveWif('alice', 'active', 'pw pw pw pw pw pw');
    const cid = Buffer.from(CHAIN_ID, 'hex');
    const txBuf = Buffer.from(ourBytes, 'hex');
    const all = new Uint8Array(cid.length + txBuf.length);
    all.set(cid, 0);
    all.set(txBuf, cid.length);
    const digest = sha256(all);
    const sig = signDigest(digest, wif);
    expect(recoverPubkey(digest, sig)).toBe(wifToPublic(wif));
    // viz also recovers our signature to the same key
    const vizRecovered = auth.signature
      .fromBuffer(Buffer.from(sig, 'hex'))
      .recoverPublicKey(Buffer.from(digest))
      .toString();
    expect(vizRecovered).toBe(wifToPublic(wif));
  });
});
