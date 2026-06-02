import { VizValidationError } from './errors';
import type { Asset } from './asset';

export type AccountName = string & { readonly __brand: 'AccountName' };
export type PublicKey   = string & { readonly __brand: 'PublicKey' };
export type Wif         = string & { readonly __brand: 'Wif' };

export type AssetSymbol = 'VIZ' | 'SHARES';
export type AssetInput<S extends AssetSymbol = AssetSymbol> =
  | string
  | Asset<S>
  | { value: string; symbol: S };

export interface Authority {
  weightThreshold: number;
  accountAuths: Array<readonly [AccountName, number]>;
  keyAuths: Array<readonly [PublicKey, number]>;
}

export interface Beneficiary { account: AccountName; weight: number }

// Chain properties passed to chain_properties_update / versioned_chain_properties_update.
// Asset fields must be pre-formatted strings (e.g. '1.000 VIZ', '1.000000 SHARES')
// since they are nested and not auto-serialized by the transaction builder.
export interface ChainProperties {
  accountCreationFee: string;
  maximumBlockSize: number;
  createAccountDelegationRatio: number;
  createAccountDelegationTime: number;
  minDelegation: string;
  minCurationPercent: number;
  maxCurationPercent: number;
  bandwidthReservePercent: number;
  bandwidthReserveBelow: string;
  flagEnergyAdditionalCost: number;
  voteAccountingMinRshares: number;
  committeeRequestApproveMinPercent: number;
  // Validator-renamed hardfork governance params (witness_* → validator_*).
  // Optional because they only apply to chain_properties_hf4 / hf6 / hf9 variants.
  inflationValidatorPercent?: number;
  validatorMissPenaltyPercent?: number;
  validatorMissPenaltyDuration?: number;
  validatorDeclarationFee?: string;
}

export interface Operation<T extends string = string> {
  readonly 0: T;
  readonly 1: Record<string, unknown>;
  readonly length: 2;
}

export interface UnsignedTransaction {
  refBlockNum: number;
  refBlockPrefix: number;
  expiration: string;
  operations: ReadonlyArray<readonly [string, Record<string, unknown>]>;
  extensions: ReadonlyArray<unknown>;
}

export interface SignedTransaction extends UnsignedTransaction {
  signatures: ReadonlyArray<string>;
}

export interface TransactionResult {
  id: string;
  blockNum: number;
  expiration: string;
}

// Mirrors viz-cpp-node's is_valid_account_name: total length 2-32
// (CHAIN_MIN/MAX_ACCOUNT_NAME_LENGTH), dot-separated segments of >= 2 chars,
// each segment starting with [a-z], ending [a-z0-9], with [a-z0-9-] in between.
// (Creating a *new* account additionally requires >= 3 chars, but names like
// "id" already exist on-chain and must validate.)
const ACCOUNT_RE = /^[a-z][a-z0-9-]*[a-z0-9](?:\.[a-z][a-z0-9-]*[a-z0-9])*$/;

export function account(s: string): AccountName {
  if (typeof s !== 'string' || s.length < 2 || s.length > 32 || !ACCOUNT_RE.test(s)) {
    throw new VizValidationError({
      field: 'account',
      expected: 'lowercase 2-32 chars, alnum + dashes, each dot segment starts with a letter and ends alphanumeric',
      received: s,
    });
  }
  return s as AccountName;
}

export function publicKey(s: string): PublicKey {
  if (typeof s !== 'string' || !s.startsWith('VIZ') || s.length < 50 || s.length > 60) {
    throw new VizValidationError({
      field: 'publicKey',
      expected: "VIZ-prefixed base58 string",
      received: s,
    });
  }
  return s as PublicKey;
}

export function wif(s: string): Wif {
  if (typeof s !== 'string' || !s.startsWith('5') || s.length < 50 || s.length > 53) {
    throw new VizValidationError({
      field: 'wif',
      expected: 'base58 WIF starting with 5',
      received: '<redacted>',
    });
  }
  return s as Wif;
}
