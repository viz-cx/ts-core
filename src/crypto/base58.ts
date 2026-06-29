import { sha256 } from '@noble/hashes/sha2';
import { ripemd160 } from '@noble/hashes/legacy';
import { VizValidationError } from '../errors';

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE = 58n;
const INDEX: Record<string, number> = {};
Array.from(ALPHABET).forEach((ch, i) => { INDEX[ch] = i; });

export function base58Encode(bytes: Uint8Array): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  let num = 0n;
  for (const b of bytes) num = num * 256n + BigInt(b);
  let out = '';
  while (num > 0n) {
    const rem = Number(num % BASE);
    num /= BASE;
    out = ALPHABET[rem] + out;
  }
  return '1'.repeat(zeros) + out;
}

export function base58Decode(s: string): Uint8Array {
  let zeros = 0;
  while (zeros < s.length && s[zeros] === '1') zeros++;
  let num = 0n;
  for (const ch of s) {
    const v = INDEX[ch];
    if (v === undefined) {
      throw new VizValidationError({ field: 'base58', expected: 'base58 character', received: ch });
    }
    num = num * BASE + BigInt(v);
  }
  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num % 256n));
    num /= 256n;
  }
  return new Uint8Array([...new Array(zeros).fill(0), ...bytes]);
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function eq4(a: Uint8Array, b: Uint8Array): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

export function base58CheckEncodeSha(payload: Uint8Array): string {
  const checksum = sha256(sha256(payload)).slice(0, 4);
  return base58Encode(concat(payload, checksum));
}

export function base58CheckDecodeSha(s: string): Uint8Array {
  const buf = base58Decode(s);
  if (buf.length < 4) throw new VizValidationError({ field: 'base58check', expected: '>=4 bytes', received: buf.length });
  const payload = buf.slice(0, -4);
  const checksum = buf.slice(-4);
  const expected = sha256(sha256(payload)).slice(0, 4);
  if (!eq4(checksum, expected)) throw new VizValidationError({ field: 'base58check', expected: 'valid sha256 checksum', received: s });
  return payload;
}

export function base58CheckEncodeRipemd(payload: Uint8Array): string {
  const checksum = ripemd160(payload).slice(0, 4);
  return base58Encode(concat(payload, checksum));
}

export function base58CheckDecodeRipemd(s: string): Uint8Array {
  const buf = base58Decode(s);
  if (buf.length < 4) throw new VizValidationError({ field: 'base58check', expected: '>=4 bytes', received: buf.length });
  const payload = buf.slice(0, -4);
  const checksum = buf.slice(-4);
  const expected = ripemd160(payload).slice(0, 4);
  if (!eq4(checksum, expected)) throw new VizValidationError({ field: 'base58check', expected: 'valid ripemd160 checksum', received: s });
  return payload;
}
