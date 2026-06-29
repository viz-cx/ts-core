import * as secp from '@noble/secp256k1';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';
import { ripemd160 } from '@noble/hashes/legacy';
import { ADDRESS_PREFIX } from '../constants';
import { wifToPrivBytes } from './keys';
import { base58Encode } from './base58';
import { VizValidationError } from '../errors';

// noble/secp256k1 v2 requires explicit hmac wiring for synchronous signing.
secp.etc.hmacSha256Sync = (key, ...msgs) => hmac(sha256, key, secp.etc.concatBytes(...msgs));

function topBitClear(b: Uint8Array): boolean {
  // 32-byte big-endian with top bit clear == DER length 32 (no 0x00 pad).
  return ((b[0] ?? 0x80) & 0x80) === 0;
}

export function signDigest(digest32: Uint8Array, wif: string): string {
  const priv = wifToPrivBytes(wif);
  let attempt = 0;
  // Loop until both r and s are 32 bytes with top bit clear (canonical).
  // @noble enforces low-S by default; extraEntropy varies k per attempt.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const extra = new Uint8Array(32);
    // little-endian nonce -> deterministic, reproducible across runs
    extra[0] = attempt & 0xff;
    extra[1] = (attempt >> 8) & 0xff;
    const opts: { lowS: true; extraEntropy?: secp.ExtraEntropy } = { lowS: true };
    if (attempt > 0) opts.extraEntropy = extra;
    const sig = secp.sign(digest32, priv, opts);
    const compact = sig.toCompactRawBytes();
    const r = compact.slice(0, 32);
    const s = compact.slice(32, 64);
    if (topBitClear(r) && topBitClear(s)) {
      const recid = sig.recovery ?? 0;
      const out = new Uint8Array(65);
      out[0] = recid + 31;
      out.set(r, 1);
      out.set(s, 33);
      return Buffer.from(out).toString('hex');
    }
    attempt++;
    if (attempt > 1000) {
      throw new VizValidationError({
        field: 'signature',
        expected: 'canonical signature',
        received: 'none in 1000 tries',
      });
    }
  }
}

export function recoverPubkey(digest32: Uint8Array, sigHex: string): string {
  const bytes = Uint8Array.from(Buffer.from(sigHex, 'hex'));
  if (bytes.length !== 65) {
    throw new VizValidationError({
      field: 'signature',
      expected: '65 bytes',
      received: String(bytes.length),
    });
  }
  const recid = (bytes[0] as number) - 31;
  const compact = bytes.slice(1);
  const sig = secp.Signature.fromCompact(compact).addRecoveryBit(recid);
  const point = sig.recoverPublicKey(digest32);
  const compressed = point.toRawBytes(true);
  const checksum = ripemd160(compressed).slice(0, 4);
  const addy = new Uint8Array(37);
  addy.set(compressed, 0);
  addy.set(checksum, 33);
  return ADDRESS_PREFIX + base58Encode(addy);
}
