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
  /**
   * @deprecated Since viz-js-lib 0.12.4 this op-name is an alias for
   * `account_validator_vote`; the wire field is `validator`, not `witness`.
   * Prefer {@link OperationMap.account_validator_vote}.
   */
  account_witness_vote: {
    account: AccountName;
    validator: AccountName;
    approve: boolean;
  };
  account_validator_vote: {
    account: AccountName;
    validator: AccountName;
    approve: boolean;
  };
  account_validator_proxy: { account: AccountName; proxy: AccountName | '' };
  set_reward_sharing: {
    owner: AccountName;
    sharingRate: number;
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
  /**
   * @deprecated Since viz-js-lib 0.12.4 this op-name is an alias for
   * `validator_update`. Prefer {@link OperationMap.validator_update}.
   */
  witness_update: {
    owner: AccountName;
    url: string;
    blockSigningKey: PublicKey;
  };
  validator_update: {
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

  // ─── HF14 Prediction Markets (Onix) ─────────────────────────
  // Asset fields take AssetInput; ids/percents/indices are plain numbers.
  // Times are ISO strings ('2030-01-01T00:00:00'); `commitment` is 64 hex chars.
  pm_oracle_register: {
    owner: AccountName;
    insurance: AssetInput<'VIZ'>;
    feePercent: number;
    fixedFee: AssetInput<'VIZ'>;
    rulesUrl: string;
    autoAcceptCreator: AccountName | '';
    autoAcceptResolver: AccountName | '';
    autoAccept: boolean;
  };
  pm_oracle_update: {
    owner: AccountName;
    insuranceDelta?: AssetInput<'VIZ'>;
    feePercent?: number;
    fixedFee?: AssetInput<'VIZ'>;
    rulesUrl?: string;
    autoAcceptCreator?: AccountName | '';
    autoAcceptResolver?: AccountName | '';
    autoAccept?: boolean;
  };
  pm_create_market: {
    creator: AccountName;
    oracle: AccountName;
    marketType: number;
    /** Order is preserved on the wire (not sorted). */
    outcomes: string[];
    url: string;
    oracleFeePercent: number;
    oracleFixedFee: AssetInput<'VIZ'>;
    creatorFeePercent: number;
    liquidityFeePercent: number;
    liquidity: AssetInput<'VIZ'>;
    lmsrB: number;
    bettingExpiration: string;
    resultExpiration: string;
    timePenaltyType: number;
    timePenaltyValue: number;
    penaltyCurveType: number;
    allowEarlyResolution: boolean;
    allowCancellation: boolean;
    allowBatch: boolean;
    allowInstantBet: boolean;
    endogeneityTier: number;
    disputeMode: number;
    disputeResolver: AccountName | '';
    disputePenaltyPercent: number;
    metadata: string;
  };
  pm_oracle_accept_market: {
    oracle: AccountName;
    marketId: number;
    accept: boolean;
    oracleFeePercent: number;
    oracleFixedFee: AssetInput<'VIZ'>;
  };
  pm_place_bet: {
    account: AccountName;
    marketId: number;
    /** -1 = none (multi-outcome), 0 = NO, 1 = YES. */
    side: number;
    /** -1 = none (binary). */
    outcomeIndex: number;
    amount: AssetInput<'VIZ'>;
    minTokens: number;
    mode: number;
  };
  pm_commit_bet: {
    account: AccountName;
    marketId: number;
    /** sha256 hex (64 chars). */
    commitment: string;
    escrowAmount: AssetInput<'VIZ'>;
    noRevealFeePercent: number;
  };
  pm_reveal_bet: {
    account: AccountName;
    commitId: number;
    side: number;
    outcomeIndex: number;
    amount: AssetInput<'VIZ'>;
    salt: string;
    minTokens: number;
  };
  pm_cancel_bet: { account: AccountName; betId: number; minReturn: number };
  pm_add_liquidity: { provider: AccountName; marketId: number; amount: AssetInput<'VIZ'> };
  pm_withdraw_liquidity: { provider: AccountName; liquidityId: number; amount: AssetInput<'VIZ'> };
  pm_resolve_market: {
    oracle: AccountName;
    marketId: number;
    winningOutcome: number;
    decisionUrl: string;
    decisionReason: string;
  };
  pm_no_contest: { oracle: AccountName; marketId: number; reason: string };
  pm_dispute_create: {
    disputer: AccountName;
    marketId: number;
    proposedOutcome: number;
    reason: string;
  };
  /** Requires regular authority (active also satisfies it). */
  pm_dispute_vote: {
    voter: AccountName;
    marketId: number;
    voteOutcome: number;
    votePercent: number;
  };
  pm_dispute_resolve: {
    resolver: AccountName;
    marketId: number;
    correctOutcome: number;
    penaltyAmount: AssetInput<'VIZ'>;
    banOracle: boolean;
    banOracleUntil: string;
    banCreator: boolean;
    banCreatorUntil: string;
  };
  pm_transfer_position: {
    from: AccountName;
    betId: number;
    to: AccountName;
    /** Share weight (int64), NOT an asset. */
    amount: number;
    memo?: string;
  };
  pm_lazy_deposit: { account: AccountName; amount: AssetInput<'VIZ'> };
  pm_lazy_withdraw: { account: AccountName; shares: number; emergency: boolean };
  pm_leverage_open: {
    account: AccountName;
    marketId: number;
    outcomeIndex: number;
    collateral: AssetInput<'VIZ'>;
    loan: AssetInput<'VIZ'>;
    minTokens: number;
    maxSlippagePercent: number;
  };
  pm_leverage_close: { account: AccountName; positionId: number; minReturn: number };
  pm_leverage_convert: { account: AccountName; positionId: number; conversionProfitCost: number };
  pm_dispute_oracle_respond: { oracle: AccountName; marketId: number; response: string };
  pm_unban: {
    resolver: AccountName;
    target: AccountName;
    unbanOracle: boolean;
    unbanCreator: boolean;
  };
}

export type OperationName = keyof OperationMap;
export type OperationParams<T extends OperationName> = OperationMap[T];
export type Operation<T extends OperationName = OperationName> =
  { [K in T]: readonly [K, OperationMap[K]] }[T];

export const OP_NAMES: ReadonlyArray<OperationName> = [
  'transfer', 'transfer_to_vesting', 'withdraw_vesting',
  'delegate_vesting_shares', 'account_witness_vote', 'account_validator_vote',
  'award', 'custom',
  'account_update', 'account_metadata', 'account_create',
  'set_withdraw_vesting_route',
  'account_witness_proxy', 'account_validator_proxy',
  'witness_update', 'validator_update',
  'chain_properties_update', 'versioned_chain_properties_update',
  'proposal_create', 'proposal_update', 'proposal_delete',
  'escrow_transfer', 'escrow_dispute', 'escrow_release', 'escrow_approve',
  'committee_worker_create_request', 'committee_worker_cancel_request', 'committee_vote_request',
  'paid_subscribe', 'set_paid_subscription',
  'create_invite', 'claim_invite_balance', 'invite_registration', 'use_invite_balance',
  'request_account_recovery', 'recover_account', 'change_recovery_account',
  'fixed_award', 'set_account_price', 'set_subaccount_price', 'buy_account', 'target_account_sale',
  'set_reward_sharing',
  'pm_oracle_register', 'pm_oracle_update', 'pm_create_market', 'pm_oracle_accept_market',
  'pm_place_bet', 'pm_commit_bet', 'pm_reveal_bet', 'pm_cancel_bet',
  'pm_add_liquidity', 'pm_withdraw_liquidity', 'pm_resolve_market', 'pm_no_contest',
  'pm_dispute_create', 'pm_dispute_vote', 'pm_dispute_resolve', 'pm_transfer_position',
  'pm_lazy_deposit', 'pm_lazy_withdraw',
  'pm_leverage_open', 'pm_leverage_close', 'pm_leverage_convert',
  'pm_dispute_oracle_respond', 'pm_unban',
];
