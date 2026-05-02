import type { Transport } from './transport';
import type { AccountName } from './types';

export interface DynamicGlobalProperties {
  head_block_number: number;
  head_block_id: string;
  time: string;
  current_witness: string;
  total_pow?: number;
  total_vesting_fund?: string;
  total_vesting_shares?: string;
  [k: string]: unknown;
}

export interface Account {
  id: number;
  name: AccountName;
  owner: unknown;
  active: unknown;
  regular: unknown;
  memo_key: string;
  json_metadata: string;
  balance: string;
  vesting_shares: string;
  energy: number;
  [k: string]: unknown;
}

export interface Block {
  previous: string;
  timestamp: string;
  witness: string;
  transaction_merkle_root: string;
  extensions: unknown[];
  witness_signature: string;
  transactions: unknown[];
  block_id: string;
  signing_key: string;
  transaction_ids: string[];
  [k: string]: unknown;
}

export type AccountHistoryItem = {
  trx_id: string;
  block: number;
  trx_in_block: number;
  op_in_trx: number;
  virtual_op: number;
  timestamp: string;
  op: readonly [string, Record<string, unknown>];
};

export interface ReadApi {
  getDynamicGlobalProperties(): Promise<DynamicGlobalProperties>;
  getAccounts(names: ReadonlyArray<AccountName | string>): Promise<Account[]>;
  lookupAccountNames(names: ReadonlyArray<AccountName | string>): Promise<(Account | null)[]>;
  getBlock(blockNum: number): Promise<Block | null>;
  getBlockHeader(blockNum: number): Promise<Pick<Block, 'previous' | 'timestamp' | 'witness'> | null>;
  getAccountHistory(name: AccountName | string, from: number, limit: number): Promise<Array<readonly [number, AccountHistoryItem]>>;
  getOpsInBlock(blockNum: number, onlyVirtual: boolean): Promise<AccountHistoryItem[]>;
  getKeyReferences(keys: string[]): Promise<string[][]>;
  getWitnessByAccount(account: AccountName | string): Promise<unknown>;
  getActiveWitnesses(): Promise<string[]>;
}

export function createReadApi(t: Transport): ReadApi {
  return {
    getDynamicGlobalProperties: () => t.call('database_api.get_dynamic_global_properties', []),
    getAccounts:                (names) => t.call('database_api.get_accounts', [names.slice()]),
    lookupAccountNames:         (names) => t.call('database_api.lookup_account_names', [names.slice()]),
    getBlock:                   (n) => t.call('database_api.get_block', [n]),
    getBlockHeader:             (n) => t.call('database_api.get_block_header', [n]),
    getAccountHistory:          (n, from, limit) => t.call('account_history.get_account_history', [n, from, limit]),
    getOpsInBlock:              (n, onlyVirtual) => t.call('operation_history.get_ops_in_block', [n, onlyVirtual]),
    getKeyReferences:           (keys) => t.call('account_by_key.get_key_references', [keys]),
    getWitnessByAccount:        (a) => t.call('witness_api.get_witness_by_account', [a]),
    getActiveWitnesses:         () => t.call('witness_api.get_active_witnesses', []),
  };
}
