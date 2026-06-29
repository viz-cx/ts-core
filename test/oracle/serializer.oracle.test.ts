import { describe, it, expect } from 'vitest';
// eslint-disable-next-line no-direct-viz-js-lib -- test oracle
import vizJs from 'viz-js-lib';
import { createRequire } from 'module';
import { ByteWriter } from '../../src/serializer/primitives';
import { writeAsset } from '../../src/serializer/asset';
import { writeAuthority } from '../../src/serializer/authority';

const require = createRequire(import.meta.url);

const ops = (vizJs as any).auth?.serializer ?? require('viz-js-lib/lib/auth/serializer/src/operations');
const types = require('viz-js-lib/lib/auth/serializer/src/types');

function vizHex(serializer: { appendByteBuffer: (b: unknown, v: unknown) => void }, obj: unknown): string {
  const ByteBuffer = require('bytebuffer');
  const b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
  serializer.appendByteBuffer(b, obj);
  return Buffer.from((b.copy(0, b.offset) as { toBuffer: () => Buffer }).toBuffer()).toString('hex');
}

describe('serializer oracle: asset', () => {
  it('serializes VIZ amount identically', () => {
    const w = new ByteWriter();
    writeAsset(w, '1.000 VIZ');
    expect(w.hex()).toBe(vizHex(types.asset, '1.000 VIZ'));
  });
  it('serializes SHARES amount identically', () => {
    const w = new ByteWriter();
    writeAsset(w, '12.345678 SHARES');
    expect(w.hex()).toBe(vizHex(types.asset, '12.345678 SHARES'));
  });
});

describe('serializer oracle: authority', () => {
  it('serializes an authority identically (sorted maps)', () => {
    const auth = {
      weight_threshold: 1,
      account_auths: [['bob', 1], ['alice', 1]],
      key_auths: [],
    };
    const w = new ByteWriter();
    writeAuthority(w, auth as any);
    expect(w.hex()).toBe(vizHex(ops.authority, auth));
  });
});

// ─── Operation oracle ────────────────────────────────────────────────────────

import { writeOperation } from '../../src/serializer/operation';
import { OP_NAMES } from '../../src/ops/registry';
import { OP_SCHEMA } from '../../src/serializer/op-schema';
import { OP_TYPE_IDS } from '../../src/constants';
import { deriveWif, wifToPublic } from '../../src/crypto/keys';

// Generate a deterministic valid VIZ public key for tests
const TEST_PUBKEY = wifToPublic(deriveWif('testaccount', 'master', 'testpassword123'));

const EMPTY_AUTH = { weight_threshold: 1, account_auths: [], key_auths: [[TEST_PUBKEY, 1]] };

const SAMPLES: Record<string, Record<string, unknown>> = {
  transfer: { from: 'alice', to: 'bob', amount: '1.000 VIZ', memo: 'hi' },
  transfer_to_vesting: { from: 'alice', to: 'bob', amount: '2.000 VIZ' },
  withdraw_vesting: { account: 'alice', vesting_shares: '3.000000 SHARES' },
  account_update: {
    account: 'alice',
    master: EMPTY_AUTH,
    active: EMPTY_AUTH,
    regular: undefined,
    memo_key: TEST_PUBKEY,
    json_metadata: '',
  },
  validator_update: { owner: 'alice', url: 'https://viz.cx', block_signing_key: TEST_PUBKEY },
  account_validator_vote: { account: 'alice', validator: 'bob', approve: true },
  account_validator_proxy: { account: 'alice', proxy: 'bob' },
  custom: { required_active_auths: [], required_regular_auths: ['alice'], id: 'x', json: '{}' },
  set_withdraw_vesting_route: { from_account: 'alice', to_account: 'bob', percent: 5000, auto_vest: false },
  request_account_recovery: {
    recovery_account: 'alice',
    account_to_recover: 'bob',
    new_master_authority: EMPTY_AUTH,
    extensions: [],
  },
  recover_account: {
    account_to_recover: 'alice',
    new_master_authority: EMPTY_AUTH,
    recent_master_authority: EMPTY_AUTH,
    extensions: [],
  },
  change_recovery_account: { account_to_recover: 'alice', new_recovery_account: 'bob', extensions: [] },
  escrow_transfer: {
    from: 'alice', to: 'bob', token_amount: '1.000 VIZ', escrow_id: 1,
    agent: 'carol', fee: '0.010 VIZ', json_metadata: '',
    ratification_deadline: '2026-12-31T00:00:00',
    escrow_expiration: '2027-01-31T00:00:00',
  },
  escrow_dispute: { from: 'alice', to: 'bob', agent: 'carol', who: 'alice', escrow_id: 1 },
  escrow_release: {
    from: 'alice', to: 'bob', agent: 'carol', who: 'alice',
    receiver: 'bob', escrow_id: 1, token_amount: '1.000 VIZ',
  },
  escrow_approve: { from: 'alice', to: 'bob', agent: 'carol', who: 'alice', escrow_id: 1, approve: true },
  delegate_vesting_shares: { delegator: 'alice', delegatee: 'bob', vesting_shares: '100.000000 SHARES' },
  account_create: {
    fee: '0.000 VIZ', delegation: '0.000000 SHARES',
    creator: 'alice', new_account_name: 'newuser',
    master: EMPTY_AUTH, active: EMPTY_AUTH, regular: EMPTY_AUTH,
    memo_key: TEST_PUBKEY, json_metadata: '', referrer: '',
    extensions: [],
  },
  account_metadata: { account: 'alice', json_metadata: '{"profile":{}}' },
  proposal_create: {
    author: 'alice', title: 'test', memo: '',
    expiration_time: '2026-12-31T00:00:00',
    proposed_operations: [{ op: ['transfer', { from: 'alice', to: 'bob', amount: '1.000 VIZ', memo: '' }] }],
    review_period_time: undefined,
    extensions: [],
  },
  proposal_update: {
    author: 'alice', title: 'test',
    active_approvals_to_add: [], active_approvals_to_remove: [],
    master_approvals_to_add: [], master_approvals_to_remove: [],
    regular_approvals_to_add: [], regular_approvals_to_remove: [],
    key_approvals_to_add: [], key_approvals_to_remove: [],
    extensions: [],
  },
  proposal_delete: { author: 'alice', title: 'test', requester: 'alice', extensions: [] },
  chain_properties_update: {
    owner: 'alice',
    props: {
      account_creation_fee: '1.000 VIZ', maximum_block_size: 65536,
      create_account_delegation_ratio: 10, create_account_delegation_time: 2592000,
      min_delegation: '1.000000 SHARES',
      min_curation_percent: 0, max_curation_percent: 10000,
      bandwidth_reserve_percent: 100, bandwidth_reserve_below: '30.000000 SHARES',
      flag_energy_additional_cost: 1000, vote_accounting_min_rshares: 5000000,
      committee_request_approve_min_percent: 1000,
    },
  },
  committee_worker_create_request: {
    creator: 'alice', url: 'https://viz.cx/request', worker: 'bob',
    required_amount_min: '100.000 VIZ', required_amount_max: '1000.000 VIZ',
    duration: 2592000,
  },
  committee_worker_cancel_request: { creator: 'alice', request_id: 42 },
  committee_vote_request: { voter: 'alice', request_id: 42, vote_percent: 5000 },
  create_invite: { creator: 'alice', balance: '1.000 VIZ', invite_key: TEST_PUBKEY },
  claim_invite_balance: { initiator: 'alice', receiver: 'bob', invite_secret: 'secret123' },
  invite_registration: {
    initiator: 'alice', new_account_name: 'newuser',
    invite_secret: 'secret123', new_account_key: TEST_PUBKEY,
  },
  versioned_chain_properties_update: {
    owner: 'alice',
    props: [4, {
      account_creation_fee: '1.000 VIZ', maximum_block_size: 65536,
      create_account_delegation_ratio: 10, create_account_delegation_time: 2592000,
      min_delegation: '1.000000 SHARES',
      min_curation_percent: 0, max_curation_percent: 10000,
      bandwidth_reserve_percent: 100, bandwidth_reserve_below: '30.000000 SHARES',
      flag_energy_additional_cost: 1000, vote_accounting_min_rshares: 5000000,
      committee_request_approve_min_percent: 1000,
      inflation_validator_percent: 1000,
      inflation_ratio_committee_vs_reward_fund: 3000,
      inflation_recalc_period: 262800,
      data_operations_cost_additional_bandwidth: 0,
      validator_miss_penalty_percent: 100,
      validator_miss_penalty_duration: 86400,
      create_invite_min_balance: '1.000 VIZ',
      committee_create_request_fee: '1.000 VIZ',
      create_paid_subscription_fee: '1.000 VIZ',
      account_on_sale_fee: '10.000 VIZ',
      subaccount_on_sale_fee: '1.000 VIZ',
      validator_declaration_fee: '1.000 VIZ',
      withdraw_intervals: 104,
      distribution_epoch_length: 28800,
    }],
  },
  award: { initiator: 'alice', receiver: 'bob', energy: 50, custom_sequence: 0, memo: '', beneficiaries: [] },
  fixed_award: {
    initiator: 'alice', receiver: 'bob', reward_amount: '1.000 VIZ',
    max_energy: 10000, custom_sequence: 0, memo: '', beneficiaries: [],
  },
  set_paid_subscription: { account: 'alice', url: 'https://viz.cx/sub', levels: 3, amount: '1.000 VIZ', period: 30 },
  paid_subscribe: { subscriber: 'alice', account: 'bob', level: 1, amount: '1.000 VIZ', period: 30, auto_renewal: true },
  set_account_price: { account: 'alice', account_seller: 'alice', account_offer_price: '100.000 VIZ', account_on_sale: true },
  set_subaccount_price: { account: 'alice', subaccount_seller: 'alice', subaccount_offer_price: '10.000 VIZ', subaccount_on_sale: false },
  buy_account: {
    buyer: 'bob', account: 'alice', account_offer_price: '100.000 VIZ',
    account_authorities_key: TEST_PUBKEY, tokens_to_shares: '0.000 VIZ',
  },
  use_invite_balance: { initiator: 'alice', receiver: 'bob', invite_secret: 'secret123' },
  target_account_sale: {
    account: 'alice', account_seller: 'alice', target_buyer: 'bob',
    account_offer_price: '100.000 VIZ', account_on_sale: true,
  },
  set_reward_sharing: { owner: 'alice', sharing_rate: 5000 },
  // Deprecated aliases — same payload as their canonical equivalents:
  account_witness_vote: { account: 'alice', validator: 'bob', approve: true },
  account_witness_proxy: { account: 'alice', proxy: 'bob' },
  witness_update: { owner: 'alice', url: 'https://viz.cx', block_signing_key: TEST_PUBKEY },
};

describe('serializer oracle: every op', () => {
  for (const [name, sample] of Object.entries(SAMPLES)) {
    it(`serializes ${name} identically`, () => {
      const w = new ByteWriter();
      writeOperation(w, name, sample);
      const ByteBuffer = require('bytebuffer');
      const b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
      ops.operation.appendByteBuffer(b, [name, sample]);
      const expected = Buffer.from((b.copy(0, b.offset) as { toBuffer: () => Buffer }).toBuffer()).toString('hex');
      expect(w.hex()).toBe(expected);
    });
  }
});

it('has a schema + type id for every registered op', () => {
  for (const name of OP_NAMES) {
    expect(OP_SCHEMA[name as string], `schema for ${name}`).toBeDefined();
    expect(OP_TYPE_IDS[name as string], `type id for ${name}`).toBeDefined();
  }
});

it('serializes proposal_update with multiple approvals sorted', () => {
  const sample = {
    author: 'alice', title: 'test',
    active_approvals_to_add: ['charlie', 'alice'],  // unsorted — should be alice, charlie
    active_approvals_to_remove: [],
    master_approvals_to_add: [],
    master_approvals_to_remove: [],
    regular_approvals_to_add: [],
    regular_approvals_to_remove: [],
    key_approvals_to_add: [],
    key_approvals_to_remove: [],
    extensions: [],
  };
  const w = new ByteWriter();
  writeOperation(w, 'proposal_update', sample);
  const ByteBuffer = require('bytebuffer');
  const b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
  ops.operation.appendByteBuffer(b, ['proposal_update', sample]);
  const expected = Buffer.from((b.copy(0, b.offset) as { toBuffer: () => Buffer }).toBuffer()).toString('hex');
  expect(w.hex()).toBe(expected);
});

it('serializes custom op with multiple required_active_auths sorted', () => {
  const sample = {
    required_active_auths: ['zebra', 'alice', 'mike'],  // unsorted — should sort ascending
    required_regular_auths: [],
    id: 'test',
    json: '{}',
  };
  const w = new ByteWriter();
  writeOperation(w, 'custom', sample);
  const ByteBuffer = require('bytebuffer');
  const b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
  ops.operation.appendByteBuffer(b, ['custom', sample]);
  const expected = Buffer.from((b.copy(0, b.offset) as { toBuffer: () => Buffer }).toBuffer()).toString('hex');
  expect(w.hex()).toBe(expected);
});
