# @viz-cx/core

Type-safe TypeScript wrapper for the [VIZ blockchain](https://viz.cx) built on top of [`viz-js-lib`](https://github.com/VIZ-Blockchain/viz-js-lib).

`viz-js-lib` ships with no TypeScript types and a positional-argument API. This package closes that gap:

- Named-argument curated methods for every VIZ broadcast operation
- An `OperationMap` that types every operation — long-tail ops are also reachable via the transaction builder
- A `tx().build() → sign() → broadcast()` pipeline for offline signing and hardware wallet integration
- Dual ESM + CJS publish, under 100 KB, `viz-js-lib` as a peer dependency

## Install

```bash
npm add @viz-cx/core viz-js-lib
# or
pnpm add @viz-cx/core viz-js-lib
```

## Quickstart

```ts
import { createClient, viz } from '@viz-cx/core';

// Write client — provide account + key
const client = createClient({
  account: 'alice',
  activeKey: process.env.ALICE_ACTIVE_WIF!,
});

const result = await client.transfer({ to: 'bob', amount: viz('1.000'), memo: 'thanks' });
console.log(result.id, result.blockNum);

// Read-only client — no key needed
const reader = createClient();
const dgp = await reader.api.getDynamicGlobalProperties();
console.log(dgp.head_block_number);
```

## Curated methods

The bound account is injected automatically — you only supply the other fields.

**Transfers & vesting**
```ts
client.transfer({ to, amount, memo? })
client.transferToVesting({ to, amount })
client.withdrawVesting({ vestingShares })
client.delegateVestingShares({ delegatee, vestingShares })
client.setWithdrawVestingRoute({ toAccount, percent, autoVest })
```

**Awards**
```ts
client.award({ receiver, energy, customSequence?, memo?, beneficiaries? })
client.fixedAward({ receiver, rewardAmount, maxEnergy, customSequence?, memo?, beneficiaries? })
```

**Account management**
```ts
client.accountUpdate({ memoKey, master?, active?, regular?, jsonMetadata? })
client.accountMetadata({ jsonMetadata })
client.accountCreate({ fee, delegation, newAccountName, master, active, regular, memoKey, jsonMetadata, referrer? })
client.accountValidatorVote({ validator, approve })   // formerly accountWitnessVote
client.accountValidatorProxy({ proxy })               // formerly accountWitnessProxy
```

**Validator & governance**
```ts
client.validatorUpdate({ url, blockSigningKey })      // formerly witnessUpdate
client.setRewardSharing({ sharingRate })              // uint16 basis points (0–10000)
client.chainPropertiesUpdate({ props })
client.versionedChainPropertiesUpdate({ props })  // props: [typeId, ChainProperties]
```

> **Witness → validator migration**: the VIZ blockchain (since hardfork-era viz-cpp-node + viz-js-lib 0.12.4) renamed `witness_*` to `validator_*`. The old curated methods (`accountWitnessVote`, `accountWitnessProxy`, `witnessUpdate`) remain as deprecated aliases that route through the same underlying serializer. New code should use the validator-named methods. Note that even the deprecated `accountWitnessVote` now takes a `validator` field (the upstream serializer no longer accepts `witness`).

**Proposals**
```ts
client.proposalCreate({ title, expirationTime, proposedOperations, memo?, reviewPeriodTime? })
client.proposalUpdate({ title, activeApprovalsToAdd?, activeApprovalsToRemove?,
                        masterApprovalsToAdd?, masterApprovalsToRemove?,
                        regularApprovalsToAdd?, regularApprovalsToRemove?,
                        keyApprovalsToAdd?, keyApprovalsToRemove? })
client.proposalDelete({ author, title })
```

**Escrow**
```ts
client.escrowTransfer({ to, agent, escrowId, fee, tokenAmount, ratificationDeadline, escrowExpiration, jsonMetadata? })
client.escrowDispute({ from, to, agent, escrowId })
client.escrowRelease({ from, to, agent, receiver, escrowId, tokenAmount })
client.escrowApprove({ from, to, agent, escrowId, approve })
```

**Committee**
```ts
client.committeeWorkerCreateRequest({ url, worker, requiredAmountMin, requiredAmountMax, duration })
client.committeeWorkerCancelRequest({ requestId })
client.committeeVoteRequest({ requestId, votePercent })
```

**Paid subscriptions**
```ts
client.paidSubscribe({ account, level, amount, period, autoRenewal })
client.setPaidSubscription({ url, levels, amount, period })
```

**Invites**
```ts
client.createInvite({ balance, inviteKey })
client.claimInviteBalance({ receiver, inviteSecret })
client.inviteRegistration({ newAccountName, inviteSecret, newAccountKey })
client.useInviteBalance({ receiver, inviteSecret })
```

**Account recovery**
```ts
client.requestAccountRecovery({ accountToRecover, newMasterAuthority })
client.recoverAccount({ newMasterAuthority, recentMasterAuthority })
client.changeRecoveryAccount({ newRecoveryAccount })
```

**Account marketplace**
```ts
client.setAccountPrice({ accountSeller, accountOfferPrice, accountOnSale })
client.setSubaccountPrice({ subaccountSeller, subaccountOfferPrice, subaccountOnSale })
client.buyAccount({ account, accountOfferPrice, accountAuthoritiesKey, tokensToShares })
client.targetAccountSale({ accountSeller, targetBuyer, accountOfferPrice, accountOnSale })
```

**Custom**
```ts
client.custom({ requiredActiveAuths?, requiredRegularAuths?, id, json })
```

Asset fields (`amount`, `vestingShares`, `fee`, etc.) accept a canonical string (`'1.000 VIZ'`, `'1.000000 SHARES'`), an `Asset` object, or `{ value, symbol }`. `energy` and `maxEnergy` are in chain units (100 = 1%).

> **Note on VIZ authority naming**: VIZ uses `master` where Steem/Hive use `owner`. All authority-related fields follow VIZ naming (`master`, `newMasterAuthority`, `masterApprovalsToAdd`, etc.).

## Transaction builder

For advanced use cases — offline signing, hardware wallets, batching multiple operations:

```ts
import { sign } from '@viz-cx/core';

// Build → sign offline → broadcast
const tx = await client.tx()
  .transfer({ from: 'alice', to: 'bob', amount: '1.000 VIZ' })
  .build();

const signed = await sign(tx, { activeKey: WIF });
await client.broadcast(signed);

// Or chain it in one call
await client.tx()
  .transfer({ from: 'alice', to: 'bob', amount: '1.000 VIZ' })
  .sign(WIF)
  .broadcast();
```

The transaction builder exposes the same methods as the curated client (without implicit injection), plus `op<T>(name, params)` for any typed operation:

```ts
await client.tx()
  .committeeVoteRequest({ voter: 'alice', requestId: 42, votePercent: 5000 })
  .op('set_paid_subscription', { account: 'alice', url: 'https://viz.cx', levels: 3, amount: '1.000 VIZ', period: 30 })
  .sign(WIF)
  .broadcast();
```

`op<T>(name, params)` autocompletes operation names and validates parameter shapes against `OperationMap`.

## Read API

```ts
const client = createClient();

await client.api.getDynamicGlobalProperties();
await client.api.getAccounts(['alice', 'bob']);
await client.api.getBlock(12345);
await client.api.getAccountHistory('alice', -1, 20);
await client.api.getActiveValidators();          // formerly getActiveWitnesses
await client.api.getValidatorByAccount('alice'); // formerly getWitnessByAccount
await client.api.getKeyReferences([pubKey]);
```

## Auth helpers

```ts
import { keys } from '@viz-cx/core';

const all   = keys.fromPassword('alice', 'password');          // { owner, active, regular, memo }
const wif   = keys.fromPassword('alice', 'password', 'active');
const pub   = keys.toPublic(wif);
const fresh = keys.generate();                                  // { wif, pub }

keys.isWif(wif);     // type guard
keys.isPubkey(pub);  // type guard

const sig = keys.sign(buf, wif);
keys.verify(buf, sig, pub);
```

## Error handling

```ts
import { VizRpcError, VizValidationError, VizTransportError } from '@viz-cx/core';

try {
  await client.transfer({ to: 'bob', amount: viz('1.000') });
} catch (e) {
  if (e instanceof VizRpcError)        console.error(e.code, e.method, e.data);
  if (e instanceof VizValidationError) console.error(e.field, e.expected, e.received);
  if (e instanceof VizTransportError)  console.error(e.cause);
}
```

## Configuration

```ts
createClient({
  endpoint:      'https://node.viz.cx', // default
  account:       'alice',
  activeKey:     '5J…',
  timeoutMs:     15_000,                // default
  expirationSec: 30,                    // default transaction expiry window
});
```

## Operation registry

All VIZ broadcast operations are typed in `OperationMap`:

```
transfer  transfer_to_vesting  withdraw_vesting  delegate_vesting_shares
account_validator_vote  account_witness_vote (deprecated alias)
award  fixed_award  custom
account_update  account_metadata  account_create
set_withdraw_vesting_route
account_validator_proxy  account_witness_proxy (deprecated alias)
validator_update  witness_update (deprecated alias)
set_reward_sharing
chain_properties_update  versioned_chain_properties_update
proposal_create  proposal_update  proposal_delete
escrow_transfer  escrow_dispute  escrow_release  escrow_approve
committee_worker_create_request  committee_worker_cancel_request  committee_vote_request
paid_subscribe  set_paid_subscription
create_invite  claim_invite_balance  invite_registration  use_invite_balance
request_account_recovery  recover_account  change_recovery_account
set_account_price  set_subaccount_price  buy_account  target_account_sale
```

```ts
import type { OperationParams, OperationName, Operation } from '@viz-cx/core';

type TransferParams = OperationParams<'transfer'>;
// → { from: AccountName; to: AccountName; amount: AssetInput<'VIZ'>; memo?: string }
```

## Contributing

See [`AGENTS.md`](./AGENTS.md) for repo conventions, commands, and the release flow (the same file orients both human contributors and AI coding agents).

## License

MIT
