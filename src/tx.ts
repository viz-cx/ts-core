import { sha256 } from '@noble/hashes/sha2';
import { Asset } from './asset';
import { CHAIN_ID } from './constants';
import { VizValidationError } from './errors';
import { serializeTransaction } from './serializer/transaction';
import { signDigest } from './crypto/ecdsa';
import type { Transport } from './transport';
import type {
  AssetInput,
  AssetSymbol,
  SignedTransaction,
  TransactionResult,
  UnsignedTransaction,
  Wif,
} from './types';
import type { OperationName, OperationParams } from './ops/registry';

type WireOp = readonly [string, Record<string, unknown>];

export interface TxBuilderOptions {
  transport: Transport;
  expirationSec: number;
}

export interface TxBuilder {
  op<T extends OperationName>(name: T, params: OperationParams<T>): TxBuilder;
  // ─── Hot-path v1 ────────────────────────────────────────────
  transfer(p: OperationParams<'transfer'>): TxBuilder;
  transferToVesting(p: OperationParams<'transfer_to_vesting'>): TxBuilder;
  withdrawVesting(p: OperationParams<'withdraw_vesting'>): TxBuilder;
  delegateVestingShares(p: OperationParams<'delegate_vesting_shares'>): TxBuilder;
  /** @deprecated Prefer {@link TxBuilder.accountValidatorVote}. */
  accountWitnessVote(p: OperationParams<'account_witness_vote'>): TxBuilder;
  accountValidatorVote(p: OperationParams<'account_validator_vote'>): TxBuilder;
  award(p: OperationParams<'award'>): TxBuilder;
  fixedAward(p: OperationParams<'fixed_award'>): TxBuilder;
  custom(p: OperationParams<'custom'>): TxBuilder;
  // ─── Account management ─────────────────────────────────────
  accountUpdate(p: OperationParams<'account_update'>): TxBuilder;
  accountMetadata(p: OperationParams<'account_metadata'>): TxBuilder;
  accountCreate(p: OperationParams<'account_create'>): TxBuilder;
  /** @deprecated Prefer {@link TxBuilder.accountValidatorProxy}. */
  accountWitnessProxy(p: OperationParams<'account_witness_proxy'>): TxBuilder;
  accountValidatorProxy(p: OperationParams<'account_validator_proxy'>): TxBuilder;
  setWithdrawVestingRoute(p: OperationParams<'set_withdraw_vesting_route'>): TxBuilder;
  // ─── Witness / Validator ────────────────────────────────────
  /** @deprecated Prefer {@link TxBuilder.validatorUpdate}. */
  witnessUpdate(p: OperationParams<'witness_update'>): TxBuilder;
  validatorUpdate(p: OperationParams<'validator_update'>): TxBuilder;
  setRewardSharing(p: OperationParams<'set_reward_sharing'>): TxBuilder;
  chainPropertiesUpdate(p: OperationParams<'chain_properties_update'>): TxBuilder;
  versionedChainPropertiesUpdate(p: OperationParams<'versioned_chain_properties_update'>): TxBuilder;
  // ─── Proposals ──────────────────────────────────────────────
  proposalCreate(p: OperationParams<'proposal_create'>): TxBuilder;
  proposalUpdate(p: OperationParams<'proposal_update'>): TxBuilder;
  proposalDelete(p: OperationParams<'proposal_delete'>): TxBuilder;
  // ─── Escrow ─────────────────────────────────────────────────
  escrowTransfer(p: OperationParams<'escrow_transfer'>): TxBuilder;
  escrowDispute(p: OperationParams<'escrow_dispute'>): TxBuilder;
  escrowRelease(p: OperationParams<'escrow_release'>): TxBuilder;
  escrowApprove(p: OperationParams<'escrow_approve'>): TxBuilder;
  // ─── Committee ──────────────────────────────────────────────
  committeeWorkerCreateRequest(p: OperationParams<'committee_worker_create_request'>): TxBuilder;
  committeeWorkerCancelRequest(p: OperationParams<'committee_worker_cancel_request'>): TxBuilder;
  committeeVoteRequest(p: OperationParams<'committee_vote_request'>): TxBuilder;
  // ─── Subscriptions ──────────────────────────────────────────
  paidSubscribe(p: OperationParams<'paid_subscribe'>): TxBuilder;
  setPaidSubscription(p: OperationParams<'set_paid_subscription'>): TxBuilder;
  // ─── Invites ────────────────────────────────────────────────
  createInvite(p: OperationParams<'create_invite'>): TxBuilder;
  claimInviteBalance(p: OperationParams<'claim_invite_balance'>): TxBuilder;
  inviteRegistration(p: OperationParams<'invite_registration'>): TxBuilder;
  useInviteBalance(p: OperationParams<'use_invite_balance'>): TxBuilder;
  // ─── Account recovery ───────────────────────────────────────
  requestAccountRecovery(p: OperationParams<'request_account_recovery'>): TxBuilder;
  recoverAccount(p: OperationParams<'recover_account'>): TxBuilder;
  changeRecoveryAccount(p: OperationParams<'change_recovery_account'>): TxBuilder;
  // ─── Account marketplace ────────────────────────────────────
  setAccountPrice(p: OperationParams<'set_account_price'>): TxBuilder;
  setSubaccountPrice(p: OperationParams<'set_subaccount_price'>): TxBuilder;
  buyAccount(p: OperationParams<'buy_account'>): TxBuilder;
  targetAccountSale(p: OperationParams<'target_account_sale'>): TxBuilder;
  build(): Promise<UnsignedTransaction>;
  sign(key: Wif | string): SignedTxBuilder;
}

export interface SignedTxBuilder {
  toJSON(): Promise<SignedTransaction>;
  broadcast(): Promise<TransactionResult>;
}

// Keyed by camelCase TS field name; value is the expected Asset symbol.
const ASSET_SYMBOL_FIELDS: Record<string, AssetSymbol> = {
  amount: 'VIZ',
  vestingShares: 'SHARES',
  delegation: 'SHARES',
  fee: 'VIZ',
  tokenAmount: 'VIZ',
  rewardAmount: 'VIZ',
  balance: 'VIZ',
  accountOfferPrice: 'VIZ',
  subaccountOfferPrice: 'VIZ',
  tokensToShares: 'VIZ',
  requiredAmountMin: 'VIZ',
  requiredAmountMax: 'VIZ',
};

// Fields that are required in the wire format but optional (or absent) in our TS API.
const WIRE_DEFAULTS: Record<string, unknown> = {
  memo: '',
  custom_sequence: 0,
  beneficiaries: [],
  json_metadata: '',
  extensions: [],
  referrer: '',
};

function toSnakeCase(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

// Recursively converts camelCase keys of plain objects to snake_case.
// Arrays are mapped element-by-element so that nested objects (e.g. Authority
// keyAuths tuples, versioned_chain_properties_update props) are also converted,
// while primitive array elements (strings, numbers) pass through unchanged.
function deepConvertKeys(v: unknown): unknown {
  if (v === null || typeof v !== 'object' || v instanceof Asset) {
    return v;
  }
  if (Array.isArray(v)) {
    return v.map(deepConvertKeys);
  }
  const obj = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(obj)) {
    out[toSnakeCase(k)] = deepConvertKeys(val);
  }
  return out;
}

function normalizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    const wireKey = toSnakeCase(k);
    const sym = ASSET_SYMBOL_FIELDS[k];
    if (sym && (typeof v === 'string' || v instanceof Asset || (v != null && typeof v === 'object' && 'value' in (v as object)))) {
      out[wireKey] = Asset.from(v as AssetInput, sym).toString();
    } else {
      out[wireKey] = deepConvertKeys(v);
    }
  }
  for (const [k, def] of Object.entries(WIRE_DEFAULTS)) {
    if (out[k] === undefined) out[k] = def;
  }
  return out;
}

function refBlockNumFromHeadId(headBlockId: string): number {
  const numHex = headBlockId.slice(0, 8);
  return parseInt(numHex, 16) & 0xffff;
}

function refBlockPrefixFromHeadId(headBlockId: string): number {
  const prefixHex = headBlockId.slice(8, 16);
  const parts = prefixHex.match(/.{2}/g);
  const swapped = (parts ?? []).reverse().join('');
  return parseInt(swapped, 16) >>> 0;
}

function plusSeconds(iso: string, sec: number): string {
  const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'));
  return new Date(d.getTime() + sec * 1000).toISOString().replace(/\.\d{3}Z$/, '');
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function signWire(wire: {
  ref_block_num: number;
  ref_block_prefix: number;
  expiration: string;
  operations: ReadonlyArray<readonly [string, Record<string, unknown>]>;
  extensions: ReadonlyArray<unknown>;
}, key: string): string[] {
  const txBytes = serializeTransaction(wire);
  const cid = hexToBytes(CHAIN_ID);
  const all = new Uint8Array(cid.length + txBytes.length);
  all.set(cid, 0);
  all.set(txBytes, cid.length);
  const digest = sha256(all);
  return [signDigest(digest, key)];
}

export function createTxBuilder(opts: TxBuilderOptions): TxBuilder {
  const ops: WireOp[] = [];

  const builder: TxBuilder = {
    op<T extends OperationName>(name: T, params: OperationParams<T>): TxBuilder {
      ops.push([name as string, normalizeParams(params as Record<string, unknown>)]);
      return builder;
    },
    transfer:               (p) => builder.op('transfer', p),
    transferToVesting:      (p) => builder.op('transfer_to_vesting', p),
    withdrawVesting:        (p) => builder.op('withdraw_vesting', p),
    delegateVestingShares:  (p) => builder.op('delegate_vesting_shares', p),
    accountWitnessVote:     (p) => builder.op('account_witness_vote', p),
    accountValidatorVote:   (p) => builder.op('account_validator_vote', p),
    award:                  (p) => builder.op('award', p),
    fixedAward:             (p) => builder.op('fixed_award', p),
    custom:                 (p) => builder.op('custom', p),
    accountUpdate:                  (p) => builder.op('account_update', p),
    accountMetadata:                (p) => builder.op('account_metadata', p),
    accountCreate:                  (p) => builder.op('account_create', p),
    accountWitnessProxy:            (p) => builder.op('account_witness_proxy', p),
    accountValidatorProxy:          (p) => builder.op('account_validator_proxy', p),
    setWithdrawVestingRoute:        (p) => builder.op('set_withdraw_vesting_route', p),
    witnessUpdate:                  (p) => builder.op('witness_update', p),
    validatorUpdate:                (p) => builder.op('validator_update', p),
    setRewardSharing:               (p) => builder.op('set_reward_sharing', p),
    chainPropertiesUpdate:          (p) => builder.op('chain_properties_update', p),
    versionedChainPropertiesUpdate: (p) => builder.op('versioned_chain_properties_update', p),
    proposalCreate:                 (p) => builder.op('proposal_create', p),
    proposalUpdate:                 (p) => builder.op('proposal_update', p),
    proposalDelete:                 (p) => builder.op('proposal_delete', p),
    escrowTransfer:                 (p) => builder.op('escrow_transfer', p),
    escrowDispute:                  (p) => builder.op('escrow_dispute', p),
    escrowRelease:                  (p) => builder.op('escrow_release', p),
    escrowApprove:                  (p) => builder.op('escrow_approve', p),
    committeeWorkerCreateRequest:   (p) => builder.op('committee_worker_create_request', p),
    committeeWorkerCancelRequest:   (p) => builder.op('committee_worker_cancel_request', p),
    committeeVoteRequest:           (p) => builder.op('committee_vote_request', p),
    paidSubscribe:                  (p) => builder.op('paid_subscribe', p),
    setPaidSubscription:            (p) => builder.op('set_paid_subscription', p),
    createInvite:                   (p) => builder.op('create_invite', p),
    claimInviteBalance:             (p) => builder.op('claim_invite_balance', p),
    inviteRegistration:             (p) => builder.op('invite_registration', p),
    useInviteBalance:               (p) => builder.op('use_invite_balance', p),
    requestAccountRecovery:         (p) => builder.op('request_account_recovery', p),
    recoverAccount:                 (p) => builder.op('recover_account', p),
    changeRecoveryAccount:          (p) => builder.op('change_recovery_account', p),
    setAccountPrice:                (p) => builder.op('set_account_price', p),
    setSubaccountPrice:             (p) => builder.op('set_subaccount_price', p),
    buyAccount:                     (p) => builder.op('buy_account', p),
    targetAccountSale:              (p) => builder.op('target_account_sale', p),

    async build() {
      if (ops.length === 0) {
        throw new VizValidationError({ field: 'operations', expected: 'at least one operation', received: 0 });
      }
      const dgp = await opts.transport.call<{ head_block_id: string; time: string }>(
        'database_api.get_dynamic_global_properties',
        [],
      );
      return {
        refBlockNum: refBlockNumFromHeadId(dgp.head_block_id),
        refBlockPrefix: refBlockPrefixFromHeadId(dgp.head_block_id),
        expiration: plusSeconds(dgp.time, opts.expirationSec),
        operations: ops.slice() as ReadonlyArray<readonly [string, Record<string, unknown>]>,
        extensions: [] as ReadonlyArray<unknown>,
      };
    },

    sign(key) {
      let cached: Promise<SignedTransaction> | null = null;
      const signed = (): Promise<SignedTransaction> => {
        if (!cached) {
          cached = (async () => {
            const tx = await builder.build();
            const wire = {
              ref_block_num: tx.refBlockNum,
              ref_block_prefix: tx.refBlockPrefix,
              expiration: tx.expiration,
              operations: tx.operations,
              extensions: tx.extensions,
            };
            const signatures = signWire(wire, key);
            return { ...tx, signatures };
          })();
        }
        return cached;
      };
      return {
        async toJSON() { return signed(); },
        async broadcast() {
          const s = await signed();
          return opts.transport.broadcast(s);
        },
      };
    },
  };
  return builder;
}

export async function sign(
  tx: UnsignedTransaction,
  options: { activeKey: Wif | string },
): Promise<SignedTransaction> {
  const wire = {
    ref_block_num: tx.refBlockNum,
    ref_block_prefix: tx.refBlockPrefix,
    expiration: tx.expiration,
    operations: tx.operations,
    extensions: tx.extensions,
  };
  const signatures = signWire(wire, options.activeKey);
  return { ...tx, signatures };
}
