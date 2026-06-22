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
//
// The 12 fields below are chain_properties_init — the only shape the legacy,
// non-versioned chain_properties_update op serializes. Everything after is
// optional because it only exists on chain_properties_hf4/hf6/hf9/hf13, which
// versioned_chain_properties_update (static_variant index HF13_PROPS_VERSION)
// is the only way to submit. Verified against viz-cpp-node's
// libraries/protocol/include/graphene/protocol/chain_operations.hpp:356-628.
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
  // hf4
  inflationValidatorPercent?: number;
  inflationRatioCommitteeVsRewardFund?: number;
  inflationRecalcPeriod?: number;
  // hf6
  dataOperationsCostAdditionalBandwidth?: number;
  validatorMissPenaltyPercent?: number;
  validatorMissPenaltyDuration?: number;
  // hf9
  createInviteMinBalance?: string;
  committeeCreateRequestFee?: string;
  createPaidSubscriptionFee?: string;
  accountOnSaleFee?: string;
  subaccountOnSaleFee?: string;
  validatorDeclarationFee?: string;
  withdrawIntervals?: number;
  // hf13
  distributionEpochLength?: number;
}

/**
 * static_variant index selecting chain_properties_hf13 in
 * versioned_chain_properties_update. The variant order (init=0, hf4=1, hf6=2,
 * hf9=3, hf13=4) is fixed by the chain's protocol definition.
 */
export const HF13_PROPS_VERSION = 4;

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
