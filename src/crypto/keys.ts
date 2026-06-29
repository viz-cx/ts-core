import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2';
import { ripemd160 } from '@noble/hashes/legacy';
import { ADDRESS_PREFIX } from '../constants';
import {
  base58Encode,
  base58Decode,
  base58CheckEncodeSha,
  base58CheckDecodeSha,
} from './base58';
import { VizValidationError } from '../errors';

function brainKey(account: string, role: string, password: string): string {
  return (account + role + password).trim().split(/[\t\n\v\f\r ]+/).join(' ');
}

function privFromBrainKey(account: string, role: string, password: string): Uint8Array {
  return sha256(brainKey(account, role, password));
}

export function deriveWif(account: string, role: string, password: string): string {
  const priv = privFromBrainKey(account, role, password);
  const payload = new Uint8Array(33);
  payload[0] = 0x80;
  payload.set(priv, 1);
  return base58CheckEncodeSha(payload);
}

export function wifToPrivBytes(wif: string): Uint8Array {
  let payload: Uint8Array;
  try {
    payload = base58CheckDecodeSha(wif);
  } catch {
    throw new VizValidationError({ field: 'wif', expected: 'valid WIF', received: wif });
  }
  if (payload.length !== 33 || payload[0] !== 0x80) {
    throw new VizValidationError({ field: 'wif', expected: '0x80 + 32-byte key', received: wif });
  }
  return payload.slice(1);
}

function pubString(priv: Uint8Array): string {
  const compressed = secp.getPublicKey(priv, true); // 33 bytes
  const checksum = ripemd160(compressed).slice(0, 4);
  const addy = new Uint8Array(compressed.length + 4);
  addy.set(compressed, 0);
  addy.set(checksum, compressed.length);
  return ADDRESS_PREFIX + base58Encode(addy);
}

export function wifToPublic(wif: string): string {
  return pubString(wifToPrivBytes(wif));
}

// Pubkey checksum is ripemd160 over the 33-byte point (no version byte).
function base58DecodeRipemdVerified(body: string): Uint8Array {
  const buf = base58Decode(body);
  if (buf.length < 4) throw new VizValidationError({ field: 'pubkey', expected: '>=4 bytes', received: body });
  const payload = buf.slice(0, -4);
  const checksum = buf.slice(-4);
  const expected = ripemd160(payload).slice(0, 4);
  for (let i = 0; i < 4; i++) {
    const cs = checksum[i];
    const ex = expected[i];
    if (cs !== ex) {
      throw new VizValidationError({ field: 'pubkey', expected: 'valid checksum', received: body });
    }
  }
  return payload;
}

export function isPubkey(s: string): boolean {
  if (typeof s !== 'string' || !s.startsWith(ADDRESS_PREFIX)) return false;
  try {
    const body = s.slice(ADDRESS_PREFIX.length);
    const buf = base58DecodeRipemdVerified(body);
    return buf.length === 33;
  } catch {
    return false;
  }
}

export function isWif(s: string): boolean {
  if (typeof s !== 'string') return false;
  try {
    const payload = base58CheckDecodeSha(s);
    return payload.length === 33 && payload[0] === 0x80;
  } catch {
    return false;
  }
}

export function pubkeyToBytes(pub: string): Uint8Array {
  if (!pub.startsWith(ADDRESS_PREFIX)) {
    throw new VizValidationError({ field: 'pubkey', expected: `${ADDRESS_PREFIX} prefix`, received: pub });
  }
  const result = base58DecodeRipemdVerified(pub.slice(ADDRESS_PREFIX.length));
  if (result.length !== 33) {
    throw new VizValidationError({ field: 'pubkey', expected: '33-byte compressed point', received: result.length });
  }
  return result;
}

export function generateActive(seedHex: string): { wif: string; pub: string } {
  // Matches existing auth.generate(): derive an 'active' key from a random seed.
  const priv = sha256('seed' + 'active' + seedHex);
  const payload = new Uint8Array(33);
  payload[0] = 0x80;
  payload.set(priv, 1);
  const wif = base58CheckEncodeSha(payload);
  return { wif, pub: pubString(priv) };
}
