// eslint-disable-next-line no-direct-viz-js-lib -- intentional adapter seam
import vizJs from 'viz-js-lib';
import { Asset } from './asset';
import { VizValidationError } from './errors';
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
  transfer(p: OperationParams<'transfer'>): TxBuilder;
  transferToVesting(p: OperationParams<'transfer_to_vesting'>): TxBuilder;
  withdrawVesting(p: OperationParams<'withdraw_vesting'>): TxBuilder;
  delegateVestingShares(p: OperationParams<'delegate_vesting_shares'>): TxBuilder;
  accountWitnessVote(p: OperationParams<'account_witness_vote'>): TxBuilder;
  award(p: OperationParams<'award'>): TxBuilder;
  custom(p: OperationParams<'custom'>): TxBuilder;
  build(): Promise<UnsignedTransaction>;
  sign(key: Wif | string): SignedTxBuilder;
}

export interface SignedTxBuilder {
  toJSON(): Promise<SignedTransaction>;
  broadcast(): Promise<TransactionResult>;
}

const ASSET_SYMBOL_FIELDS: Record<string, AssetSymbol> = {
  amount: 'VIZ',
  vestingShares: 'SHARES',
  fee: 'VIZ',
  tokenAmount: 'VIZ',
  rewardAmount: 'SHARES',
  balance: 'VIZ',
  accountOfferPrice: 'VIZ',
  subaccountOfferPrice: 'VIZ',
  tokensToShares: 'VIZ',
  requiredAmountMin: 'VIZ',
  requiredAmountMax: 'VIZ',
};

function normalizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    const sym = ASSET_SYMBOL_FIELDS[k];
    if (sym && (typeof v === 'string' || v instanceof Asset || (v != null && typeof v === 'object' && 'value' in (v as object)))) {
      out[k] = Asset.from(v as AssetInput, sym).toString();
    } else {
      out[k] = v;
    }
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

interface VizAuthTx {
  signTransaction(tx: object, keys: string[]): { signatures: string[] };
}
const txAuth: VizAuthTx = (vizJs as unknown as { auth: VizAuthTx }).auth;

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
    award:                  (p) => builder.op('award', p),
    custom:                 (p) => builder.op('custom', p),

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
            const { signatures } = txAuth.signTransaction(wire, [key]);
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
  const { signatures } = txAuth.signTransaction(wire, [options.activeKey]);
  return { ...tx, signatures };
}
