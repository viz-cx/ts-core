import type { AccountName, AssetInput, Authority, Beneficiary, ChainProperties, PublicKey } from '../types';

export interface OperationMap {
  // ─── Curated v1 ─────────────────────────────────────────────
  transfer: {
    from: AccountName;
    to: AccountName;
    amount: AssetInput<'VIZ'>;
    memo?: string;
  };
  transfer_to_vesting: {
    from: AccountName;
    to: AccountName;
    amount: AssetInput<'VIZ'>;
  };
  withdraw_vesting: {
    account: AccountName;
    vestingShares: AssetInput<'SHARES'>;
  };
  delegate_vesting_shares: {
    delegator: AccountName;
    delegatee: AccountName;
    vestingShares: AssetInput<'SHARES'>;
  };
  account_witness_vote: {
    account: AccountName;
    witness: AccountName;
    approve: boolean;
  };
  award: {
    initiator: AccountName;
    receiver: AccountName;
    energy: number;
    customSequence?: number;
    memo?: string;
    beneficiaries?: Beneficiary[];
  };
  custom: {
    requiredActiveAuths?: AccountName[];
    requiredRegularAuths?: AccountName[];
    id: string;
    json: string;
  };

  // ─── Long-tail (typed; reachable via tx().op()) ─────────────
  account_update: {
    account: AccountName;
    // VIZ uses "master" for the owner-level authority (not "owner")
    master?: Authority;
    active?: Authority;
    regular?: Authority;
    memoKey: PublicKey;
    jsonMetadata?: string;
  };
  account_metadata: { account: AccountName; jsonMetadata: string };
  account_create: {
    fee: AssetInput<'VIZ'>;
    delegation: AssetInput<'SHARES'>;
    creator: AccountName;
    newAccountName: AccountName;
    // VIZ uses "master" for the owner-level authority (not "owner")
    master: Authority;
    active: Authority;
    regular: Authority;
    memoKey: PublicKey;
    jsonMetadata: string;
    referrer?: AccountName;
  };
  set_withdraw_vesting_route: {
    fromAccount: AccountName;
    toAccount: AccountName;
    percent: number;
    autoVest: boolean;
  };
  account_witness_proxy: { account: AccountName; proxy: AccountName | '' };
  witness_update: {
    owner: AccountName;
    url: string;
    blockSigningKey: PublicKey;
  };
  chain_properties_update: {
    owner: AccountName;
    props: ChainProperties;
  };
  // props is a static_variant: pass as [typeId, ChainProperties] where typeId 0 = chain_properties_init.
  versioned_chain_properties_update: {
    owner: AccountName;
    props: readonly [number, ChainProperties];
  };
  proposal_create: {
    author: AccountName;
    title: string;
    memo?: string;
    expirationTime: string;
    proposedOperations: ReadonlyArray<readonly [string, Record<string, unknown>]>;
    reviewPeriodTime?: string;
  };
  proposal_update: {
    author: AccountName;
    title: string;
    activeApprovalsToAdd?: AccountName[];
    activeApprovalsToRemove?: AccountName[];
    // VIZ uses "master" not "owner" for the owner-level authority approvals
    masterApprovalsToAdd?: AccountName[];
    masterApprovalsToRemove?: AccountName[];
    regularApprovalsToAdd?: AccountName[];
    regularApprovalsToRemove?: AccountName[];
    keyApprovalsToAdd?: PublicKey[];
    keyApprovalsToRemove?: PublicKey[];
  };
  proposal_delete: { author: AccountName; title: string; requester: AccountName };
  escrow_transfer: {
    from: AccountName;
    to: AccountName;
    agent: AccountName;
    escrowId: number;
    fee: AssetInput<'VIZ'>;
    tokenAmount: AssetInput<'VIZ'>;
    ratificationDeadline: string;
    escrowExpiration: string;
    jsonMetadata?: string;
  };
  escrow_dispute: {
    from: AccountName;
    to: AccountName;
    agent: AccountName;
    who: AccountName;
    escrowId: number;
  };
  escrow_release: {
    from: AccountName;
    to: AccountName;
    agent: AccountName;
    who: AccountName;
    receiver: AccountName;
    escrowId: number;
    tokenAmount: AssetInput<'VIZ'>;
  };
  escrow_approve: {
    from: AccountName;
    to: AccountName;
    agent: AccountName;
    who: AccountName;
    escrowId: number;
    approve: boolean;
  };
  committee_worker_create_request: {
    creator: AccountName;
    url: string;
    worker: AccountName;
    requiredAmountMin: AssetInput<'VIZ'>;
    requiredAmountMax: AssetInput<'VIZ'>;
    duration: number;
  };
  committee_worker_cancel_request: { creator: AccountName; requestId: number };
  committee_vote_request: { voter: AccountName; requestId: number; votePercent: number };
  paid_subscribe: {
    subscriber: AccountName;
    account: AccountName;
    level: number;
    amount: AssetInput<'VIZ'>;
    period: number;
    autoRenewal: boolean;
  };
  set_paid_subscription: {
    account: AccountName;
    url: string;
    levels: number;
    amount: AssetInput<'VIZ'>;
    period: number;
  };
  create_invite: { creator: AccountName; balance: AssetInput<'VIZ'>; inviteKey: PublicKey };
  claim_invite_balance: { initiator: AccountName; receiver: AccountName; inviteSecret: string };
  invite_registration: { initiator: AccountName; newAccountName: AccountName; inviteSecret: string; newAccountKey: PublicKey };
  use_invite_balance: { initiator: AccountName; receiver: AccountName; inviteSecret: string };
  request_account_recovery: {
    recoveryAccount: AccountName;
    accountToRecover: AccountName;
    // VIZ uses "master" authority terminology (not "owner")
    newMasterAuthority: Authority;
  };
  recover_account: {
    accountToRecover: AccountName;
    newMasterAuthority: Authority;
    recentMasterAuthority: Authority;
  };
  change_recovery_account: {
    accountToRecover: AccountName;
    newRecoveryAccount: AccountName;
  };
  fixed_award: {
    initiator: AccountName;
    receiver: AccountName;
    rewardAmount: AssetInput<'VIZ'>;
    maxEnergy: number;
    customSequence?: number;
    memo?: string;
    beneficiaries?: Beneficiary[];
  };
  set_account_price: {
    account: AccountName;
    accountSeller: AccountName;
    accountOfferPrice: AssetInput<'VIZ'>;
    accountOnSale: boolean;
  };
  set_subaccount_price: {
    account: AccountName;
    subaccountSeller: AccountName;
    subaccountOfferPrice: AssetInput<'VIZ'>;
    subaccountOnSale: boolean;
  };
  buy_account: {
    buyer: AccountName;
    account: AccountName;
    accountOfferPrice: AssetInput<'VIZ'>;
    accountAuthoritiesKey: PublicKey;
    tokensToShares: AssetInput<'VIZ'>;
  };
  target_account_sale: {
    account: AccountName;
    accountSeller: AccountName;
    targetBuyer: AccountName;
    accountOfferPrice: AssetInput<'VIZ'>;
    accountOnSale: boolean;
  };
}

export type OperationName = keyof OperationMap;
export type OperationParams<T extends OperationName> = OperationMap[T];
export type Operation<T extends OperationName = OperationName> =
  { [K in T]: readonly [K, OperationMap[K]] }[T];

export const OP_NAMES: ReadonlyArray<OperationName> = [
  'transfer', 'transfer_to_vesting', 'withdraw_vesting',
  'delegate_vesting_shares', 'account_witness_vote', 'award', 'custom',
  'account_update', 'account_metadata', 'account_create',
  'set_withdraw_vesting_route', 'account_witness_proxy', 'witness_update',
  'chain_properties_update', 'versioned_chain_properties_update',
  'proposal_create', 'proposal_update', 'proposal_delete',
  'escrow_transfer', 'escrow_dispute', 'escrow_release', 'escrow_approve',
  'committee_worker_create_request', 'committee_worker_cancel_request', 'committee_vote_request',
  'paid_subscribe', 'set_paid_subscription',
  'create_invite', 'claim_invite_balance', 'invite_registration', 'use_invite_balance',
  'request_account_recovery', 'recover_account', 'change_recovery_account',
  'fixed_award', 'set_account_price', 'set_subaccount_price', 'buy_account', 'target_account_sale',
];
