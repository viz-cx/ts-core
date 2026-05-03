# @viz-cx/core

Type-safe TypeScript wrapper for the [VIZ blockchain](https://viz.cx) built on top of [`viz-js-lib`](https://github.com/VIZ-Blockchain/viz-js-lib).

`viz-js-lib` ships with no TypeScript types and a positional-argument API. This package closes that gap:

- Named-argument curated methods for the most common operations
- An `OperationMap` that types every VIZ broadcast operation — including long-tail ops available via the transaction builder
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

```ts
client.transfer({ to, amount, memo? });
client.transferToVesting({ to, amount });
client.withdrawVesting({ vestingShares });
client.delegateVestingShares({ delegatee, vestingShares });
client.accountWitnessVote({ witness, approve });
client.award({ receiver, energy, customSequence?, memo?, beneficiaries? });
client.fixedAward({ receiver, rewardAmount, maxEnergy, customSequence?, memo?, beneficiaries? });
client.custom({ requiredActiveAuths?, requiredRegularAuths?, id, json });
```

`amount` and `vestingShares` accept a canonical string (`'1.000 VIZ'`, `'1.000000 SHARES'`), an `Asset` object, or `{ value, symbol }`. `energy` and `maxEnergy` are in chain units (100 = 1%).

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

## Long-tail operations

Every VIZ broadcast operation is typed. Reach any operation via `tx().op()`:

```ts
await client.tx()
  .op('committee_vote_request', { voter: 'alice', requestId: 42, voteId: 3 })
  .op('paid_subscribe', {
    subscriber: 'alice', author: 'bob',
    level: 1, amount: '1.000 VIZ', period: 30, autoRenewal: true,
  })
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
await client.api.getActiveWitnesses();
await client.api.getKeyReferences([pubKey]);
```

## Auth helpers

```ts
import { keys } from '@viz-cx/core';

const all   = keys.fromPassword('alice', 'password');         // { owner, active, regular, memo }
const wif   = keys.fromPassword('alice', 'password', 'active');
const pub   = keys.toPublic(wif);
const fresh = keys.generate();                                 // { wif, pub }

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
account_witness_vote  award  fixed_award  custom
vote  content  delete_content  account_update  account_metadata  account_create
set_withdraw_vesting_route  account_witness_proxy  witness_update
chain_properties_update  versioned_chain_properties_update
proposal_create  proposal_update  proposal_delete
escrow_transfer  escrow_dispute  escrow_release  escrow_approve
committee_worker_create_request  committee_worker_cancel_request  committee_vote_request
paid_subscribe  set_paid_subscription
create_invite  claim_invite_balance  invite_registration  use_invite_balance
request_account_recovery  recover_account  change_recovery_account
fixed_award  set_account_price  set_subaccount_price  buy_account  target_account_sale
```

```ts
import type { OperationParams, OperationName, Operation } from '@viz-cx/core';

type TransferParams = OperationParams<'transfer'>;
// → { from: AccountName; to: AccountName; amount: AssetInput<'VIZ'>; memo?: string }
```

## License

MIT
