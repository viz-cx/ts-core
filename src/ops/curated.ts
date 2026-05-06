import type { OperationMap, OperationName } from './registry';
import type { TransactionResult } from '../types';

export type CuratedMethod<Op extends OperationName, Implicit extends keyof OperationMap[Op]> =
  (args: Omit<OperationMap[Op], Implicit>) => Promise<TransactionResult>;

export interface CuratedClient {
  // ─── Hot-path v1 ────────────────────────────────────────────
  transfer:              CuratedMethod<'transfer',                'from'>;
  transferToVesting:     CuratedMethod<'transfer_to_vesting',     'from'>;
  withdrawVesting:       CuratedMethod<'withdraw_vesting',        'account'>;
  delegateVestingShares: CuratedMethod<'delegate_vesting_shares', 'delegator'>;
  accountWitnessVote:    CuratedMethod<'account_witness_vote',    'account'>;
  award:                 CuratedMethod<'award',                   'initiator'>;
  fixedAward:            CuratedMethod<'fixed_award',             'initiator'>;
  custom:                CuratedMethod<'custom',                  never>;

  // ─── Account management ─────────────────────────────────────
  accountUpdate:         CuratedMethod<'account_update',          'account'>;
  accountMetadata:       CuratedMethod<'account_metadata',        'account'>;
  accountCreate:         CuratedMethod<'account_create',          'creator'>;
  accountWitnessProxy:   CuratedMethod<'account_witness_proxy',   'account'>;

  // ─── Vesting routes ─────────────────────────────────────────
  setWithdrawVestingRoute: CuratedMethod<'set_withdraw_vesting_route', 'fromAccount'>;

  // ─── Witness ────────────────────────────────────────────────
  witnessUpdate:                   CuratedMethod<'witness_update',                    'owner'>;
  chainPropertiesUpdate:           CuratedMethod<'chain_properties_update',           'owner'>;
  versionedChainPropertiesUpdate:  CuratedMethod<'versioned_chain_properties_update', 'owner'>;

  // ─── Proposals ──────────────────────────────────────────────
  proposalCreate: CuratedMethod<'proposal_create', 'author'>;
  proposalUpdate: CuratedMethod<'proposal_update', 'author'>;
  proposalDelete: CuratedMethod<'proposal_delete', 'requester'>;

  // ─── Escrow ─────────────────────────────────────────────────
  escrowTransfer: CuratedMethod<'escrow_transfer', 'from'>;
  escrowDispute:  CuratedMethod<'escrow_dispute',  'who'>;
  escrowRelease:  CuratedMethod<'escrow_release',  'who'>;
  escrowApprove:  CuratedMethod<'escrow_approve',  'who'>;

  // ─── Committee ──────────────────────────────────────────────
  committeeWorkerCreateRequest: CuratedMethod<'committee_worker_create_request', 'creator'>;
  committeeWorkerCancelRequest: CuratedMethod<'committee_worker_cancel_request', 'creator'>;
  committeeVoteRequest:         CuratedMethod<'committee_vote_request',         'voter'>;

  // ─── Subscriptions ──────────────────────────────────────────
  paidSubscribe:      CuratedMethod<'paid_subscribe',      'subscriber'>;
  setPaidSubscription: CuratedMethod<'set_paid_subscription', 'account'>;

  // ─── Invites ────────────────────────────────────────────────
  createInvite:       CuratedMethod<'create_invite',       'creator'>;
  claimInviteBalance: CuratedMethod<'claim_invite_balance', 'initiator'>;
  inviteRegistration: CuratedMethod<'invite_registration', 'initiator'>;
  useInviteBalance:   CuratedMethod<'use_invite_balance',  'initiator'>;

  // ─── Account recovery ───────────────────────────────────────
  requestAccountRecovery: CuratedMethod<'request_account_recovery', 'recoveryAccount'>;
  recoverAccount:         CuratedMethod<'recover_account',          'accountToRecover'>;
  changeRecoveryAccount:  CuratedMethod<'change_recovery_account',  'accountToRecover'>;

  // ─── Account marketplace ────────────────────────────────────
  setAccountPrice:    CuratedMethod<'set_account_price',    'account'>;
  setSubaccountPrice: CuratedMethod<'set_subaccount_price', 'account'>;
  buyAccount:         CuratedMethod<'buy_account',          'buyer'>;
  targetAccountSale:  CuratedMethod<'target_account_sale',  'account'>;
}

export const CURATED_METHOD_TO_OP: Record<keyof CuratedClient, OperationName> = {
  transfer: 'transfer',
  transferToVesting: 'transfer_to_vesting',
  withdrawVesting: 'withdraw_vesting',
  delegateVestingShares: 'delegate_vesting_shares',
  accountWitnessVote: 'account_witness_vote',
  award: 'award',
  fixedAward: 'fixed_award',
  custom: 'custom',
  accountUpdate: 'account_update',
  accountMetadata: 'account_metadata',
  accountCreate: 'account_create',
  accountWitnessProxy: 'account_witness_proxy',
  setWithdrawVestingRoute: 'set_withdraw_vesting_route',
  witnessUpdate: 'witness_update',
  chainPropertiesUpdate: 'chain_properties_update',
  versionedChainPropertiesUpdate: 'versioned_chain_properties_update',
  proposalCreate: 'proposal_create',
  proposalUpdate: 'proposal_update',
  proposalDelete: 'proposal_delete',
  escrowTransfer: 'escrow_transfer',
  escrowDispute: 'escrow_dispute',
  escrowRelease: 'escrow_release',
  escrowApprove: 'escrow_approve',
  committeeWorkerCreateRequest: 'committee_worker_create_request',
  committeeWorkerCancelRequest: 'committee_worker_cancel_request',
  committeeVoteRequest: 'committee_vote_request',
  paidSubscribe: 'paid_subscribe',
  setPaidSubscription: 'set_paid_subscription',
  createInvite: 'create_invite',
  claimInviteBalance: 'claim_invite_balance',
  inviteRegistration: 'invite_registration',
  useInviteBalance: 'use_invite_balance',
  requestAccountRecovery: 'request_account_recovery',
  recoverAccount: 'recover_account',
  changeRecoveryAccount: 'change_recovery_account',
  setAccountPrice: 'set_account_price',
  setSubaccountPrice: 'set_subaccount_price',
  buyAccount: 'buy_account',
  targetAccountSale: 'target_account_sale',
};

export const CURATED_IMPLICIT_FIELD: Partial<Record<keyof CuratedClient, string>> = {
  transfer: 'from',
  transferToVesting: 'from',
  withdrawVesting: 'account',
  delegateVestingShares: 'delegator',
  accountWitnessVote: 'account',
  award: 'initiator',
  fixedAward: 'initiator',
  accountUpdate: 'account',
  accountMetadata: 'account',
  accountCreate: 'creator',
  accountWitnessProxy: 'account',
  setWithdrawVestingRoute: 'fromAccount',
  witnessUpdate: 'owner',
  chainPropertiesUpdate: 'owner',
  versionedChainPropertiesUpdate: 'owner',
  proposalCreate: 'author',
  proposalUpdate: 'author',
  proposalDelete: 'requester',
  escrowTransfer: 'from',
  escrowDispute: 'who',
  escrowRelease: 'who',
  escrowApprove: 'who',
  committeeWorkerCreateRequest: 'creator',
  committeeWorkerCancelRequest: 'creator',
  committeeVoteRequest: 'voter',
  paidSubscribe: 'subscriber',
  setPaidSubscription: 'account',
  createInvite: 'creator',
  claimInviteBalance: 'initiator',
  inviteRegistration: 'initiator',
  useInviteBalance: 'initiator',
  requestAccountRecovery: 'recoveryAccount',
  recoverAccount: 'accountToRecover',
  changeRecoveryAccount: 'accountToRecover',
  setAccountPrice: 'account',
  setSubaccountPrice: 'account',
  buyAccount: 'buyer',
  targetAccountSale: 'account',
};
