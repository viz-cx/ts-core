import type { OperationMap, OperationName } from './registry';
import type { TransactionResult } from '../types';

export type CuratedMethod<Op extends OperationName, Implicit extends keyof OperationMap[Op]> =
  (args: Omit<OperationMap[Op], Implicit>) => Promise<TransactionResult>;

export interface CuratedClient {
  transfer:              CuratedMethod<'transfer',                'from'>;
  transferToVesting:     CuratedMethod<'transfer_to_vesting',     'from'>;
  withdrawVesting:       CuratedMethod<'withdraw_vesting',        'account'>;
  delegateVestingShares: CuratedMethod<'delegate_vesting_shares', 'delegator'>;
  accountWitnessVote:    CuratedMethod<'account_witness_vote',    'account'>;
  award:                 CuratedMethod<'award',                   'initiator'>;
  custom:                CuratedMethod<'custom',                  never>;
}

export interface CuratedFieldMap {
  transfer: 'from';
  transfer_to_vesting: 'from';
  withdraw_vesting: 'account';
  delegate_vesting_shares: 'delegator';
  account_witness_vote: 'account';
  award: 'initiator';
}

export const CURATED_METHOD_TO_OP: Record<keyof CuratedClient, OperationName> = {
  transfer: 'transfer',
  transferToVesting: 'transfer_to_vesting',
  withdrawVesting: 'withdraw_vesting',
  delegateVestingShares: 'delegate_vesting_shares',
  accountWitnessVote: 'account_witness_vote',
  award: 'award',
  custom: 'custom',
};

export const CURATED_IMPLICIT_FIELD: Partial<Record<keyof CuratedClient, string>> = {
  transfer: 'from',
  transferToVesting: 'from',
  withdrawVesting: 'account',
  delegateVestingShares: 'delegator',
  accountWitnessVote: 'account',
  award: 'initiator',
};
