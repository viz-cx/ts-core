import { randomFillSync } from 'node:crypto';
import { sha256 } from '@noble/hashes/sha2';
import type { PublicKey, Wif } from './types';
import { VizValidationError } from './errors';
import { deriveWif, wifToPublic, isWif as _isWif, isPubkey as _isPubkey, generateActive } from './crypto/keys';
import { signDigest, recoverPubkey } from './crypto/ecdsa';

type Role = 'owner' | 'active' | 'regular' | 'memo';
const ROLES: ReadonlyArray<Role> = ['owner', 'active', 'regular', 'memo'];

interface KeySet { owner: Wif; active: Wif; regular: Wif; memo: Wif; }

function fromPassword(account: string, password: string): KeySet;
function fromPassword(account: string, password: string, role: Role): Wif;
function fromPassword(account: string, password: string, role?: Role): Wif | KeySet {
  if (role !== undefined && !ROLES.includes(role)) {
    throw new VizValidationError({ field: 'role', expected: ROLES.join('|'), received: role });
  }
  if (role !== undefined) {
    return deriveWif(account, role, password) as Wif;
  }
  return {
    owner: deriveWif(account, 'owner', password) as Wif,
    active: deriveWif(account, 'active', password) as Wif,
    regular: deriveWif(account, 'regular', password) as Wif,
    memo: deriveWif(account, 'memo', password) as Wif,
  };
}

function toPublic(w: Wif | string): PublicKey { return wifToPublic(w) as PublicKey; }

function generate(): { wif: Wif; pub: PublicKey } {
  const bytes = randomFillSync(new Uint8Array(32));
  const seed = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const { wif, pub } = generateActive(seed);
  return { wif: wif as Wif, pub: pub as PublicKey };
}

function isWif(s: unknown): s is Wif { return typeof s === 'string' && _isWif(s); }
function isPubkey(s: unknown): s is PublicKey { return typeof s === 'string' && _isPubkey(s); }

function sign(buf: Uint8Array, w: Wif | string): string {
  return signDigest(sha256(buf), w);
}

function verify(buf: Uint8Array, sig: string, pub: PublicKey | string): boolean {
  try {
    return recoverPubkey(sha256(buf), sig) === pub;
  } catch {
    return false;
  }
}

export const keys = { fromPassword, toPublic, generate, isWif, isPubkey, sign, verify };
export type { KeySet, Role };
