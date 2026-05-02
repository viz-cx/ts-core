// eslint-disable-next-line viz-cx/no-direct-viz-js-lib  -- intentional adapter seam
import vizJs from 'viz-js-lib';
import type { PublicKey, Wif } from './types';
import { VizValidationError } from './errors';

type Role = 'owner' | 'active' | 'regular' | 'memo';
const ROLES: ReadonlyArray<Role> = ['owner', 'active', 'regular', 'memo'];

interface KeySet {
  owner: Wif;
  active: Wif;
  regular: Wif;
  memo: Wif;
}

interface VizAuth {
  getPrivateKeys(account: string, password: string, roles: ReadonlyArray<Role>): Record<string, string>;
  wifToPublic(wif: string): string;
  isWif(s: string): boolean;
  isPubkey(s: string, prefix?: string): boolean;
  signature: {
    signBuffer(buf: Buffer | Uint8Array, privateKey: unknown): { toBuffer(): Buffer };
    fromBuffer(buf: Buffer): { verifyBuffer(buf: Buffer | Uint8Array, pubKey: unknown): boolean };
  };
}

interface VizJsLib {
  auth: VizAuth;
}

const auth: VizAuth = (vizJs as unknown as VizJsLib).auth;

function fromPassword(account: string, password: string): KeySet;
function fromPassword(account: string, password: string, role: Role): Wif;
function fromPassword(account: string, password: string, role?: Role): Wif | KeySet {
  if (role !== undefined && !ROLES.includes(role)) {
    throw new VizValidationError({ field: 'role', expected: ROLES.join('|'), received: role });
  }
  const map = auth.getPrivateKeys(account, password, role !== undefined ? [role] : ROLES);
  if (role !== undefined) {
    const w = map[role];
    if (!w) throw new VizValidationError({ field: 'role', expected: 'derivable WIF', received: role });
    return w as Wif;
  }
  const owner = map['owner'];
  const active = map['active'];
  const regular = map['regular'];
  const memo = map['memo'];
  if (!owner || !active || !regular || !memo) {
    throw new VizValidationError({ field: 'keys', expected: 'all four roles derivable', received: 'incomplete' });
  }
  return {
    owner:   owner   as Wif,
    active:  active  as Wif,
    regular: regular as Wif,
    memo:    memo    as Wif,
  };
}

function toPublic(w: Wif | string): PublicKey {
  return auth.wifToPublic(w) as PublicKey;
}

function generate(): { wif: Wif; pub: PublicKey } {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const seed = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const map = auth.getPrivateKeys('seed', seed, ['active']);
  const w = map['active'];
  if (!w) throw new VizValidationError({ field: 'generate', expected: 'derivable active WIF', received: 'undefined' });
  const wif = w as Wif;
  return { wif, pub: toPublic(wif) };
}

function isWif(s: unknown): s is Wif {
  return typeof s === 'string' && auth.isWif(s);
}

function isPubkey(s: unknown): s is PublicKey {
  return typeof s === 'string' && auth.isPubkey(s);
}

function sign(buf: Uint8Array, w: Wif | string): string {
  return auth.signature.signBuffer(buf, w).toBuffer().toString('hex');
}

function verify(buf: Uint8Array, sig: string, pub: PublicKey | string): boolean {
  const sigObj = auth.signature.fromBuffer(Buffer.from(sig, 'hex'));
  return sigObj.verifyBuffer(buf, pub);
}

export const keys = { fromPassword, toPublic, generate, isWif, isPubkey, sign, verify };
export type { KeySet, Role };
