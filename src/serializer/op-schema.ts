export type FieldType =
  | 'string' | 'asset' | 'authority' | 'pubkey' | 'bool'
  | 'uint8' | 'uint16' | 'uint32' | 'int16' | 'int64' | 'uint64' | 'varint' | 'time'
  | 'string[]' | 'string-set' | 'optional-string' | 'optional-time'
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
};

// Deprecated aliases share schemas and type IDs:
OP_SCHEMA['account_witness_vote'] = OP_SCHEMA['account_validator_vote']!;
OP_SCHEMA['account_witness_proxy'] = OP_SCHEMA['account_validator_proxy']!;
OP_SCHEMA['witness_update'] = OP_SCHEMA['validator_update']!;
