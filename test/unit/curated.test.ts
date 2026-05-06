import { describe, it, expect, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createClient } from '../../src/client';
import type { VizClient } from '../../src/client';
import type { Transport } from '../../src/transport';
import type { PublicKey, Authority, ChainProperties } from '../../src/types';
import { keys } from '../../src/auth';

const dgpResponse = {
  head_block_id: '00000010abcdef1234567890',
  head_block_number: 16,
  time: '2026-05-02T00:00:00',
};

function fakeTransport(): Transport {
  const call = vi.fn().mockImplementation(async (method: string) => {
    if (method === 'database_api.get_dynamic_global_properties') return dgpResponse;
    return null;
  }) as Transport['call'];
  const broadcast = vi.fn().mockResolvedValue({
    id: 'tx-id', blockNum: 17, expiration: '2026-05-02T00:00:30',
  });
  return { call, broadcast };
}

const WIF = keys.fromPassword('alice', 'p4ssw0rd-test-only', 'active');
const PUB = keys.toPublic(WIF) as PublicKey;
const OTHER_PUB = keys.toPublic(keys.fromPassword('bob', 'p4ssw0rd-test-only', 'active')) as PublicKey;

// Authority with one signing key — required for ops the VIZ serializer validates strictly.
const AUTH: Authority = { weightThreshold: 1, accountAuths: [], keyAuths: [[PUB, 1]] };
// Empty authority — valid structure, used where the serializer doesn't require keys.
const EMPTY_AUTH: Authority = { weightThreshold: 1, accountAuths: [], keyAuths: [] };

const CHAIN_PROPS: ChainProperties = {
  accountCreationFee: '1.000 VIZ',
  maximumBlockSize: 65536,
  createAccountDelegationRatio: 10,
  createAccountDelegationTime: 2592000,
  minDelegation: '1.000000 SHARES',
  minCurationPercent: 0,
  maxCurationPercent: 10000,
  bandwidthReservePercent: 1000,
  bandwidthReserveBelow: '1.000000 SHARES',
  flagEnergyAdditionalCost: 0,
  voteAccountingMinRshares: 5000000,
  committeeRequestApproveMinPercent: 1000,
};

async function send(method: keyof VizClient, args: Record<string, unknown>) {
  const t = fakeTransport();
  const c = createClient({ account: 'alice', activeKey: WIF, transport: t });
  await (c as unknown as Record<string, (a: unknown) => Promise<unknown>>)[method]!(args);
  const [[sentTx]] = (t.broadcast as Mock).mock.calls as [[{ operations: [string, Record<string, unknown>][] }]];
  return sentTx.operations[0] as [string, Record<string, unknown>];
}

describe('curated methods', () => {
  // ─── Vesting ────────────────────────────────────────────────────────────────

  describe('transferToVesting', () => {
    it('injects `from` and serializes VIZ amount', async () => {
      const [op, p] = await send('transferToVesting', { to: 'bob', amount: '2.000 VIZ' });
      expect(op).toBe('transfer_to_vesting');
      expect(p).toMatchObject({ from: 'alice', to: 'bob', amount: '2.000 VIZ' });
    });
  });

  describe('withdrawVesting', () => {
    it('injects `account`, snake-cases vesting_shares', async () => {
      const [op, p] = await send('withdrawVesting', { vestingShares: '100.000000 SHARES' });
      expect(op).toBe('withdraw_vesting');
      expect(p).toMatchObject({ account: 'alice', vesting_shares: '100.000000 SHARES' });
    });
  });

  describe('delegateVestingShares', () => {
    it('injects `delegator`, snake-cases vesting_shares', async () => {
      const [op, p] = await send('delegateVestingShares', {
        delegatee: 'bob', vestingShares: '0.000001 SHARES',
      });
      expect(op).toBe('delegate_vesting_shares');
      expect(p).toMatchObject({ delegator: 'alice', delegatee: 'bob', vesting_shares: '0.000001 SHARES' });
    });
  });

  describe('setWithdrawVestingRoute', () => {
    it('injects `fromAccount` as wire `from_account`', async () => {
      const [op, p] = await send('setWithdrawVestingRoute', {
        toAccount: 'bob', percent: 100, autoVest: true,
      });
      expect(op).toBe('set_withdraw_vesting_route');
      expect(p).toMatchObject({ from_account: 'alice', to_account: 'bob', percent: 100, auto_vest: true });
    });
  });

  // ─── Award ──────────────────────────────────────────────────────────────────

  describe('award', () => {
    it('injects `initiator`, applies custom_sequence=0 and beneficiaries=[] defaults', async () => {
      const [op, p] = await send('award', { receiver: 'bob', energy: 1000 });
      expect(op).toBe('award');
      expect(p).toMatchObject({
        initiator: 'alice', receiver: 'bob', energy: 1000,
        custom_sequence: 0, beneficiaries: [],
      });
    });

    it('passes through explicit memo and beneficiaries', async () => {
      const [, p] = await send('award', {
        receiver: 'bob', energy: 500, memo: 'thanks',
        beneficiaries: [{ account: 'charlie', weight: 1000 }],
      });
      expect(p).toMatchObject({ memo: 'thanks', beneficiaries: [{ account: 'charlie', weight: 1000 }] });
    });
  });

  // ─── Account management ─────────────────────────────────────────────────────

  describe('accountUpdate', () => {
    it('injects `account`, requires memoKey, applies json_metadata default', async () => {
      const [op, p] = await send('accountUpdate', { memoKey: PUB });
      expect(op).toBe('account_update');
      expect(p).toMatchObject({ account: 'alice', memo_key: PUB, json_metadata: '' });
    });

    it('passes through explicit jsonMetadata', async () => {
      const [, p] = await send('accountUpdate', { memoKey: PUB, jsonMetadata: '{"x":1}' });
      expect(p).toMatchObject({ account: 'alice', memo_key: PUB, json_metadata: '{"x":1}' });
    });

    it('deep-converts optional master authority keys', async () => {
      const [, p] = await send('accountUpdate', { memoKey: PUB, master: AUTH });
      expect(p).toMatchObject({
        master: { weight_threshold: 1, account_auths: [], key_auths: [[PUB, 1]] },
      });
    });
  });

  describe('accountMetadata', () => {
    it('injects `account`', async () => {
      const [op, p] = await send('accountMetadata', { jsonMetadata: '{"profile":"test"}' });
      expect(op).toBe('account_metadata');
      expect(p).toMatchObject({ account: 'alice', json_metadata: '{"profile":"test"}' });
    });
  });

  describe('accountCreate', () => {
    it('injects `creator`, serializes fee and delegation, deep-converts Authority', async () => {
      const [op, p] = await send('accountCreate', {
        fee: '3.000 VIZ',
        delegation: '0.000000 SHARES',
        newAccountName: 'newuser',
        master: AUTH,
        active: AUTH,
        regular: AUTH,
        memoKey: PUB,
        jsonMetadata: '',
      });
      expect(op).toBe('account_create');
      expect(p).toMatchObject({
        creator: 'alice',
        fee: '3.000 VIZ',
        delegation: '0.000000 SHARES',
        new_account_name: 'newuser',
        memo_key: PUB,
        master: { weight_threshold: 1, account_auths: [], key_auths: [[PUB, 1]] },
        active: { weight_threshold: 1 },
        regular: { weight_threshold: 1 },
      });
    });
  });

  describe('accountWitnessProxy', () => {
    it('injects `account`', async () => {
      const [op, p] = await send('accountWitnessProxy', { proxy: 'bob' });
      expect(op).toBe('account_witness_proxy');
      expect(p).toMatchObject({ account: 'alice', proxy: 'bob' });
    });
  });

  // ─── Witness / governance ───────────────────────────────────────────────────

  describe('accountWitnessVote', () => {
    it('injects `account`', async () => {
      const [op, p] = await send('accountWitnessVote', { witness: 'bob', approve: true });
      expect(op).toBe('account_witness_vote');
      expect(p).toMatchObject({ account: 'alice', witness: 'bob', approve: true });
    });
  });

  describe('witnessUpdate', () => {
    it('injects `owner`, snake-cases block_signing_key', async () => {
      const [op, p] = await send('witnessUpdate', { url: 'https://viz.cx', blockSigningKey: PUB });
      expect(op).toBe('witness_update');
      expect(p).toMatchObject({ owner: 'alice', url: 'https://viz.cx', block_signing_key: PUB });
    });
  });

  describe('chainPropertiesUpdate', () => {
    it('injects `owner`, deep-converts ChainProperties keys', async () => {
      const [op, p] = await send('chainPropertiesUpdate', { props: CHAIN_PROPS });
      expect(op).toBe('chain_properties_update');
      expect(p).toMatchObject({
        owner: 'alice',
        props: {
          account_creation_fee: '1.000 VIZ',
          maximum_block_size: 65536,
          min_delegation: '1.000000 SHARES',
        },
      });
    });
  });

  describe('versionedChainPropertiesUpdate', () => {
    it('injects `owner`, serializes props as static_variant [typeId, data]', async () => {
      const [op, p] = await send('versionedChainPropertiesUpdate', { props: [0, CHAIN_PROPS] });
      expect(op).toBe('versioned_chain_properties_update');
      expect(p).toMatchObject({
        owner: 'alice',
        props: [0, { account_creation_fee: '1.000 VIZ', maximum_block_size: 65536 }],
      });
    });
  });

  // ─── Proposals ──────────────────────────────────────────────────────────────

  describe('proposalCreate', () => {
    it('injects `author`, snake-cases expiration_time', async () => {
      const [op, p] = await send('proposalCreate', {
        title: 'My Proposal',
        expirationTime: '2026-06-01T00:00:00',
        proposedOperations: [],
      });
      expect(op).toBe('proposal_create');
      expect(p).toMatchObject({
        author: 'alice', title: 'My Proposal', expiration_time: '2026-06-01T00:00:00',
      });
    });
  });

  describe('proposalUpdate', () => {
    it('injects `author`, uses masterApprovalsToAdd (not ownerApprovals)', async () => {
      const [op, p] = await send('proposalUpdate', {
        title: 'My Proposal', masterApprovalsToAdd: ['bob'],
      });
      expect(op).toBe('proposal_update');
      expect(p).toMatchObject({ author: 'alice', title: 'My Proposal', master_approvals_to_add: ['bob'] });
    });
  });

  describe('proposalDelete', () => {
    it('injects `requester`, leaves `author` untouched', async () => {
      const [op, p] = await send('proposalDelete', { author: 'bob', title: 'My Proposal' });
      expect(op).toBe('proposal_delete');
      expect(p).toMatchObject({ requester: 'alice', author: 'bob', title: 'My Proposal' });
    });
  });

  // ─── Escrow ─────────────────────────────────────────────────────────────────

  describe('escrowTransfer', () => {
    it('injects `from`, serializes both VIZ amounts, snake-cases compound keys', async () => {
      const [op, p] = await send('escrowTransfer', {
        to: 'bob', agent: 'charlie', escrowId: 1,
        fee: '0.100 VIZ', tokenAmount: '10.000 VIZ',
        ratificationDeadline: '2026-05-10T00:00:00',
        escrowExpiration: '2026-05-20T00:00:00',
      });
      expect(op).toBe('escrow_transfer');
      expect(p).toMatchObject({
        from: 'alice', to: 'bob', agent: 'charlie',
        escrow_id: 1,
        fee: '0.100 VIZ',
        token_amount: '10.000 VIZ',
        ratification_deadline: '2026-05-10T00:00:00',
        escrow_expiration: '2026-05-20T00:00:00',
      });
    });
  });

  describe('escrowDispute', () => {
    it('injects `who`', async () => {
      const [op, p] = await send('escrowDispute', {
        from: 'bob', to: 'charlie', agent: 'dave', escrowId: 1,
      });
      expect(op).toBe('escrow_dispute');
      expect(p).toMatchObject({ who: 'alice', from: 'bob', escrow_id: 1 });
    });
  });

  describe('escrowRelease', () => {
    it('injects `who`, serializes token_amount', async () => {
      const [op, p] = await send('escrowRelease', {
        from: 'bob', to: 'charlie', agent: 'dave', receiver: 'bob', escrowId: 1,
        tokenAmount: '5.000 VIZ',
      });
      expect(op).toBe('escrow_release');
      expect(p).toMatchObject({ who: 'alice', token_amount: '5.000 VIZ' });
    });
  });

  describe('escrowApprove', () => {
    it('injects `who`', async () => {
      const [op, p] = await send('escrowApprove', {
        from: 'bob', to: 'charlie', agent: 'dave', escrowId: 1, approve: true,
      });
      expect(op).toBe('escrow_approve');
      expect(p).toMatchObject({ who: 'alice', approve: true, escrow_id: 1 });
    });
  });

  // ─── Committee ──────────────────────────────────────────────────────────────

  describe('committeeWorkerCreateRequest', () => {
    it('injects `creator`, serializes both VIZ amounts, uses `worker` and `duration`', async () => {
      const [op, p] = await send('committeeWorkerCreateRequest', {
        url: 'https://viz.cx', worker: 'bob',
        requiredAmountMin: '100.000 VIZ', requiredAmountMax: '500.000 VIZ',
        duration: 30,
      });
      expect(op).toBe('committee_worker_create_request');
      expect(p).toMatchObject({
        creator: 'alice',
        worker: 'bob',
        required_amount_min: '100.000 VIZ',
        required_amount_max: '500.000 VIZ',
        duration: 30,
      });
    });
  });

  describe('committeeWorkerCancelRequest', () => {
    it('injects `creator`, snake-cases request_id', async () => {
      const [op, p] = await send('committeeWorkerCancelRequest', { requestId: 42 });
      expect(op).toBe('committee_worker_cancel_request');
      expect(p).toMatchObject({ creator: 'alice', request_id: 42 });
    });
  });

  describe('committeeVoteRequest', () => {
    it('injects `voter`, uses votePercent (not voteId)', async () => {
      const [op, p] = await send('committeeVoteRequest', { requestId: 1, votePercent: 5000 });
      expect(op).toBe('committee_vote_request');
      expect(p).toMatchObject({ voter: 'alice', request_id: 1, vote_percent: 5000 });
    });
  });

  // ─── Subscriptions ──────────────────────────────────────────────────────────

  describe('paidSubscribe', () => {
    it('injects `subscriber`, uses `account` (not author), serializes VIZ amount', async () => {
      const [op, p] = await send('paidSubscribe', {
        account: 'bob', level: 1, amount: '1.000 VIZ', period: 30, autoRenewal: true,
      });
      expect(op).toBe('paid_subscribe');
      expect(p).toMatchObject({
        subscriber: 'alice', account: 'bob', amount: '1.000 VIZ', auto_renewal: true,
      });
    });
  });

  describe('setPaidSubscription', () => {
    it('injects `account`, serializes VIZ amount', async () => {
      const [op, p] = await send('setPaidSubscription', {
        url: 'https://viz.cx', levels: 3, amount: '1.000 VIZ', period: 30,
      });
      expect(op).toBe('set_paid_subscription');
      expect(p).toMatchObject({ account: 'alice', levels: 3, amount: '1.000 VIZ' });
    });
  });

  // ─── Invites ────────────────────────────────────────────────────────────────

  describe('claimInviteBalance', () => {
    it('injects `initiator`, snake-cases invite_secret', async () => {
      const [op, p] = await send('claimInviteBalance', { receiver: 'bob', inviteSecret: 'secret123' });
      expect(op).toBe('claim_invite_balance');
      expect(p).toMatchObject({ initiator: 'alice', receiver: 'bob', invite_secret: 'secret123' });
    });
  });

  describe('inviteRegistration', () => {
    it('injects `initiator`, snake-cases new_account_name and new_account_key', async () => {
      const [op, p] = await send('inviteRegistration', {
        newAccountName: 'newuser', inviteSecret: 'secret123', newAccountKey: OTHER_PUB,
      });
      expect(op).toBe('invite_registration');
      expect(p).toMatchObject({
        initiator: 'alice',
        new_account_name: 'newuser',
        invite_secret: 'secret123',
        new_account_key: OTHER_PUB,
      });
    });
  });

  describe('useInviteBalance', () => {
    it('injects `initiator`', async () => {
      const [op, p] = await send('useInviteBalance', { receiver: 'bob', inviteSecret: 'secret123' });
      expect(op).toBe('use_invite_balance');
      expect(p).toMatchObject({ initiator: 'alice', receiver: 'bob', invite_secret: 'secret123' });
    });
  });

  // ─── Account recovery ───────────────────────────────────────────────────────

  describe('requestAccountRecovery', () => {
    it('injects `recoveryAccount` as recovery_account, uses newMasterAuthority', async () => {
      const [op, p] = await send('requestAccountRecovery', {
        accountToRecover: 'bob',
        newMasterAuthority: AUTH,
      });
      expect(op).toBe('request_account_recovery');
      expect(p).toMatchObject({
        recovery_account: 'alice',
        account_to_recover: 'bob',
        new_master_authority: { weight_threshold: 1, account_auths: [], key_auths: [[PUB, 1]] },
      });
    });
  });

  describe('recoverAccount', () => {
    it('injects `accountToRecover` as account_to_recover, uses master authority names', async () => {
      const [op, p] = await send('recoverAccount', {
        newMasterAuthority: AUTH,
        recentMasterAuthority: EMPTY_AUTH,
      });
      expect(op).toBe('recover_account');
      expect(p).toMatchObject({
        account_to_recover: 'alice',
        new_master_authority: { weight_threshold: 1, key_auths: [[PUB, 1]] },
        recent_master_authority: { weight_threshold: 1, key_auths: [] },
      });
    });
  });

  describe('changeRecoveryAccount', () => {
    it('injects `accountToRecover` as account_to_recover', async () => {
      const [op, p] = await send('changeRecoveryAccount', { newRecoveryAccount: 'bob' });
      expect(op).toBe('change_recovery_account');
      expect(p).toMatchObject({ account_to_recover: 'alice', new_recovery_account: 'bob' });
    });
  });

  // ─── Account marketplace ────────────────────────────────────────────────────

  describe('setAccountPrice', () => {
    it('injects `account`, serializes VIZ asset, snake-cases compound keys', async () => {
      const [op, p] = await send('setAccountPrice', {
        accountSeller: 'bob', accountOfferPrice: '5.000 VIZ', accountOnSale: true,
      });
      expect(op).toBe('set_account_price');
      expect(p).toMatchObject({
        account: 'alice',
        account_seller: 'bob',
        account_offer_price: '5.000 VIZ',
        account_on_sale: true,
      });
    });
  });

  describe('setSubaccountPrice', () => {
    it('injects `account`, serializes subaccount_offer_price', async () => {
      const [op, p] = await send('setSubaccountPrice', {
        subaccountSeller: 'bob', subaccountOfferPrice: '1.000 VIZ', subaccountOnSale: false,
      });
      expect(op).toBe('set_subaccount_price');
      expect(p).toMatchObject({
        account: 'alice',
        subaccount_seller: 'bob',
        subaccount_offer_price: '1.000 VIZ',
        subaccount_on_sale: false,
      });
    });
  });

  describe('buyAccount', () => {
    it('injects `buyer`, serializes both VIZ amounts, snake-cases account_authorities_key', async () => {
      const [op, p] = await send('buyAccount', {
        account: 'bob',
        accountOfferPrice: '5.000 VIZ',
        accountAuthoritiesKey: OTHER_PUB,
        tokensToShares: '0.000 VIZ',
      });
      expect(op).toBe('buy_account');
      expect(p).toMatchObject({
        buyer: 'alice',
        account: 'bob',
        account_offer_price: '5.000 VIZ',
        tokens_to_shares: '0.000 VIZ',
        account_authorities_key: OTHER_PUB,
      });
    });
  });

  describe('targetAccountSale', () => {
    it('injects `account`, includes all required fields', async () => {
      const [op, p] = await send('targetAccountSale', {
        accountSeller: 'bob', targetBuyer: 'charlie',
        accountOfferPrice: '5.000 VIZ', accountOnSale: true,
      });
      expect(op).toBe('target_account_sale');
      expect(p).toMatchObject({
        account: 'alice',
        account_seller: 'bob',
        target_buyer: 'charlie',
        account_offer_price: '5.000 VIZ',
        account_on_sale: true,
      });
    });
  });

  // ─── custom (no implicit) ───────────────────────────────────────────────────

  describe('custom', () => {
    it('broadcasts without implicit injection, snake-cases required_active_auths', async () => {
      const [op, p] = await send('custom', {
        requiredActiveAuths: ['alice'],
        id: 'my_app',
        json: '{"action":"test"}',
      });
      expect(op).toBe('custom');
      expect(p).toMatchObject({
        required_active_auths: ['alice'],
        id: 'my_app',
        json: '{"action":"test"}',
      });
    });
  });
});
