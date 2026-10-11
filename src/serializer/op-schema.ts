export type FieldType =
  | 'string' | 'asset' | 'authority' | 'pubkey' | 'bool'
  | 'int8' | 'uint8' | 'uint16' | 'uint32' | 'int16' | 'int64' | 'uint64' | 'varint' | 'time' | 'sha256'
  | 'string[]' | 'string-set' | 'optional-string' | 'optional-time'
  | 'optional-asset' | 'optional-uint16' | 'optional-bool'
  | 'pubkey[]' | 'pubkey-set'
  | 'optional-authority' | 'optional-pubkey'
  | 'beneficiaries' | 'chain_properties' | 'versioned_chain_props'
  | 'operations_array' | 'extensions';

// Field ORDER and TYPE transcribed verbatim from
// node_modules/viz-js-lib/lib/auth/serializer/src/operations.js.
// Each entry is oracle-verified by serializer.oracle.test.ts.
export const OP_SCHEMA: Record<string, ReadonlyArray<readonly [string, FieldType]>> = {
  transfer: [['from','string'],['to','string'],['amount','asset'],['memo','string']],
  transfer_to_vesting: [['from','string'],['to','string'],['amount','asset']],
  withdraw_vesting: [['account','string'],['vesting_shares','asset']],
  account_update: [
    ['account','string'],
    ['master','optional-authority'],
    ['active','optional-authority'],
    ['regular','optional-authority'],
    ['memo_key','pubkey'],
    ['json_metadata','string'],
  ],
  validator_update: [['owner','string'],['url','string'],['block_signing_key','pubkey']],
  account_validator_vote: [['account','string'],['validator','string'],['approve','bool']],
  account_validator_proxy: [['account','string'],['proxy','string']],
  custom: [
    ['required_active_auths','string-set'],
    ['required_regular_auths','string-set'],
    ['id','string'],
    ['json','string'],
  ],
  set_withdraw_vesting_route: [
    ['from_account','string'],['to_account','string'],['percent','uint16'],['auto_vest','bool'],
  ],
  request_account_recovery: [
    ['recovery_account','string'],['account_to_recover','string'],
    ['new_master_authority','authority'],['extensions','extensions'],
  ],
  recover_account: [
    ['account_to_recover','string'],['new_master_authority','authority'],
    ['recent_master_authority','authority'],['extensions','extensions'],
  ],
  change_recovery_account: [
    ['account_to_recover','string'],['new_recovery_account','string'],['extensions','extensions'],
  ],
  escrow_transfer: [
    ['from','string'],['to','string'],['token_amount','asset'],['escrow_id','uint32'],
    ['agent','string'],['fee','asset'],['json_metadata','string'],
    ['ratification_deadline','time'],['escrow_expiration','time'],
  ],
  escrow_dispute: [
    ['from','string'],['to','string'],['agent','string'],['who','string'],['escrow_id','uint32'],
  ],
  escrow_release: [
    ['from','string'],['to','string'],['agent','string'],['who','string'],
    ['receiver','string'],['escrow_id','uint32'],['token_amount','asset'],
  ],
  escrow_approve: [
    ['from','string'],['to','string'],['agent','string'],['who','string'],
    ['escrow_id','uint32'],['approve','bool'],
  ],
  delegate_vesting_shares: [
    ['delegator','string'],['delegatee','string'],['vesting_shares','asset'],
  ],
  account_create: [
    ['fee','asset'],['delegation','asset'],['creator','string'],['new_account_name','string'],
    ['master','authority'],['active','authority'],['regular','authority'],
    ['memo_key','pubkey'],['json_metadata','string'],['referrer','string'],
    ['extensions','extensions'],
  ],
  account_metadata: [['account','string'],['json_metadata','string']],
  proposal_create: [
    ['author','string'],['title','string'],['memo','string'],['expiration_time','time'],
    ['proposed_operations','operations_array'],['review_period_time','optional-time'],
    ['extensions','extensions'],
  ],
  proposal_update: [
    ['author','string'],['title','string'],
    ['active_approvals_to_add','string-set'],['active_approvals_to_remove','string-set'],
    ['master_approvals_to_add','string-set'],['master_approvals_to_remove','string-set'],
    ['regular_approvals_to_add','string-set'],['regular_approvals_to_remove','string-set'],
    ['key_approvals_to_add','pubkey-set'],['key_approvals_to_remove','pubkey-set'],
    ['extensions','extensions'],
  ],
  proposal_delete: [
    ['author','string'],['title','string'],['requester','string'],['extensions','extensions'],
  ],
  chain_properties_update: [['owner','string'],['props','chain_properties']],
  committee_worker_create_request: [
    ['creator','string'],['url','string'],['worker','string'],
    ['required_amount_min','asset'],['required_amount_max','asset'],['duration','uint32'],
  ],
  committee_worker_cancel_request: [['creator','string'],['request_id','uint32']],
  committee_vote_request: [['voter','string'],['request_id','uint32'],['vote_percent','int16']],
  create_invite: [['creator','string'],['balance','asset'],['invite_key','pubkey']],
  claim_invite_balance: [['initiator','string'],['receiver','string'],['invite_secret','string']],
  invite_registration: [
    ['initiator','string'],['new_account_name','string'],
    ['invite_secret','string'],['new_account_key','pubkey'],
  ],
  versioned_chain_properties_update: [['owner','string'],['props','versioned_chain_props']],
  award: [
    ['initiator','string'],['receiver','string'],['energy','uint16'],
    ['custom_sequence','uint64'],['memo','string'],['beneficiaries','beneficiaries'],
  ],
  set_paid_subscription: [
    ['account','string'],['url','string'],['levels','uint16'],['amount','asset'],['period','uint16'],
  ],
  paid_subscribe: [
    ['subscriber','string'],['account','string'],['level','uint16'],
    ['amount','asset'],['period','uint16'],['auto_renewal','bool'],
  ],
  set_account_price: [
    ['account','string'],['account_seller','string'],['account_offer_price','asset'],['account_on_sale','bool'],
  ],
  set_subaccount_price: [
    ['account','string'],['subaccount_seller','string'],['subaccount_offer_price','asset'],['subaccount_on_sale','bool'],
  ],
  buy_account: [
    ['buyer','string'],['account','string'],['account_offer_price','asset'],
    ['account_authorities_key','pubkey'],['tokens_to_shares','asset'],
  ],
  use_invite_balance: [['initiator','string'],['receiver','string'],['invite_secret','string']],
  fixed_award: [
    ['initiator','string'],['receiver','string'],['reward_amount','asset'],['max_energy','uint16'],
    ['custom_sequence','uint64'],['memo','string'],['beneficiaries','beneficiaries'],
  ],
  target_account_sale: [
    ['account','string'],['account_seller','string'],['target_buyer','string'],
    ['account_offer_price','asset'],['account_on_sale','bool'],
  ],
  set_reward_sharing: [['owner','string'],['sharing_rate','uint16']],
  // HF14 Prediction Markets (Onix) — order from viz-cpp-node pm_operations.hpp FC_REFLECT.
  pm_oracle_register: [
    ['owner','string'],['insurance','asset'],['fee_percent','uint16'],['fixed_fee','asset'],
    ['rules_url','string'],['auto_accept_creator','string'],['auto_accept_resolver','string'],
    ['auto_accept','bool'],['extensions','extensions'],
  ],
  pm_oracle_update: [
    ['owner','string'],['insurance_delta','optional-asset'],['fee_percent','optional-uint16'],
    ['fixed_fee','optional-asset'],['rules_url','optional-string'],
    ['auto_accept_creator','optional-string'],['auto_accept_resolver','optional-string'],
    ['auto_accept','optional-bool'],['extensions','extensions'],
  ],
  pm_create_market: [
    ['creator','string'],['oracle','string'],['market_type','uint8'],['outcomes','string[]'],
    ['url','string'],['oracle_fee_percent','uint16'],['oracle_fixed_fee','asset'],
    ['creator_fee_percent','uint16'],['liquidity_fee_percent','uint16'],['liquidity','asset'],
    ['lmsr_b','int64'],['betting_expiration','time'],['result_expiration','time'],
    ['time_penalty_type','uint8'],['time_penalty_value','uint32'],['penalty_curve_type','uint8'],
    ['allow_early_resolution','bool'],['allow_cancellation','bool'],['allow_batch','bool'],
    ['allow_instant_bet','bool'],['endogeneity_tier','uint8'],['dispute_mode','uint8'],
    ['dispute_resolver','string'],['dispute_penalty_percent','int16'],['metadata','string'],
    ['extensions','extensions'],
  ],
  pm_oracle_accept_market: [
    ['oracle','string'],['market_id','int64'],['accept','bool'],
    ['oracle_fee_percent','uint16'],['oracle_fixed_fee','asset'],['extensions','extensions'],
  ],
  pm_place_bet: [
    ['account','string'],['market_id','int64'],['side','int8'],['outcome_index','int16'],
    ['amount','asset'],['min_tokens','int64'],['mode','uint8'],['extensions','extensions'],
  ],
  pm_commit_bet: [
    ['account','string'],['market_id','int64'],['commitment','sha256'],
    ['escrow_amount','asset'],['no_reveal_fee_percent','uint16'],['extensions','extensions'],
  ],
  pm_reveal_bet: [
    ['account','string'],['commit_id','int64'],['side','int8'],['outcome_index','int16'],
    ['amount','asset'],['salt','string'],['min_tokens','int64'],['extensions','extensions'],
  ],
  pm_cancel_bet: [
    ['account','string'],['bet_id','int64'],['min_return','int64'],['extensions','extensions'],
  ],
  pm_add_liquidity: [
    ['provider','string'],['market_id','int64'],['amount','asset'],['extensions','extensions'],
  ],
  pm_withdraw_liquidity: [
    ['provider','string'],['liquidity_id','int64'],['amount','asset'],['extensions','extensions'],
  ],
  pm_resolve_market: [
    ['oracle','string'],['market_id','int64'],['winning_outcome','int16'],
    ['decision_url','string'],['decision_reason','string'],['extensions','extensions'],
  ],
  pm_no_contest: [
    ['oracle','string'],['market_id','int64'],['reason','string'],['extensions','extensions'],
  ],
  pm_dispute_create: [
    ['disputer','string'],['market_id','int64'],['proposed_outcome','int16'],
    ['reason','string'],['extensions','extensions'],
  ],
  pm_dispute_vote: [
    ['voter','string'],['market_id','int64'],['vote_outcome','int16'],
    ['vote_percent','int16'],['extensions','extensions'],
  ],
  pm_dispute_resolve: [
    ['resolver','string'],['market_id','int64'],['correct_outcome','int16'],
    ['penalty_amount','asset'],['ban_oracle','bool'],['ban_oracle_until','time'],
    ['ban_creator','bool'],['ban_creator_until','time'],['extensions','extensions'],
  ],
  pm_transfer_position: [
    ['from','string'],['bet_id','int64'],['to','string'],['amount','int64'],
    ['memo','string'],['extensions','extensions'],
  ],
  pm_lazy_deposit: [['account','string'],['amount','asset'],['extensions','extensions']],
  pm_lazy_withdraw: [
    ['account','string'],['shares','int64'],['emergency','bool'],['extensions','extensions'],
  ],
  pm_leverage_open: [
    ['account','string'],['market_id','int64'],['outcome_index','int16'],
    ['collateral','asset'],['loan','asset'],['min_tokens','int64'],
    ['max_slippage_percent','uint16'],['extensions','extensions'],
  ],
  pm_leverage_close: [
    ['account','string'],['position_id','int64'],['min_return','int64'],['extensions','extensions'],
  ],
  pm_leverage_convert: [
    ['account','string'],['position_id','int64'],['conversion_profit_cost','uint16'],
    ['extensions','extensions'],
  ],
  pm_dispute_oracle_respond: [
    ['oracle','string'],['market_id','int64'],['response','string'],['extensions','extensions'],
  ],
  pm_unban: [
    ['resolver','string'],['target','string'],['unban_oracle','bool'],['unban_creator','bool'],
    ['extensions','extensions'],
  ],
};

// Deprecated aliases share schemas and type IDs:
OP_SCHEMA['account_witness_vote'] = OP_SCHEMA['account_validator_vote']!;
OP_SCHEMA['account_witness_proxy'] = OP_SCHEMA['account_validator_proxy']!;
OP_SCHEMA['witness_update'] = OP_SCHEMA['validator_update']!;
