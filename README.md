# @viz-cx/core

Type-safe TypeScript wrapper for [`viz-js-lib`](https://github.com/VIZ-Blockchain/viz-js-lib) with named-argument curated methods, an operation registry that types every VIZ operation, and a transaction-builder pipeline. Default RPC endpoint: `https://node.viz.cx`.

## Why this exists

`viz-js-lib` ships as CommonJS with no types. There is no `@types/viz-js-lib`. `@viz-cx/core` closes that gap with:

- A typed, named-argument client API.
- An `OperationMap` that types every VIZ broadcast op (curated or not).
- A `tx().build() / sign() / broadcast()` pipeline for offline signing and multi-sig.
- Dual ESM + CJS publish; under 100 KB tarball; zero own runtime deps; `viz-js-lib` is a peer dep.

## Install

```bash
pnpm add @viz-cx/core viz-js-lib
# or:  npm i @viz-cx/core viz-js-lib
```

## Quickstart

```ts
import { createClient, viz } from '@viz-cx/core';

const client = createClient({
  account: 'alice',
  activeKey: process.env.ALICE_ACTIVE_WIF!,
});

const r = await client.transfer({ to: 'bob', amount: viz('1.000'), memo: 'thanks' });
console.log(r.id, r.blockNum);
```

Read-only client (no key needed):

```ts
import { createClient } from '@viz-cx/core';

const reader = createClient();          // VizReadClient
const dgp = await reader.api.getDynamicGlobalProperties();
console.log(dgp.head_block_number);
```

## Curated methods (v1)

```ts
client.transfer({ to, amount, memo? });
client.transferToVesting({ to, amount });
client.withdrawVesting({ amount });
client.delegateVestingShares({ delegatee, vestingShares });
client.accountWitnessVote({ witness, approve });
client.award({ receiver, energy, customSequence?, memo?, beneficiaries? });
client.custom({ requiredActiveAuths?, requiredRegularAuths?, id, json });
```

`from` / `voter` / `account` / `delegator` / `initiator` defaults to the bound account.

## Tx-builder pipeline (power users)

```ts
import { sign } from '@viz-cx/core';

// Build → sign offline → broadcast (e.g., for hardware wallets, multi-sig):
const tx = await client.tx()
  .transfer({ from: 'alice', to: 'bob', amount: '1.000 VIZ' })
  .build();

const signed = await sign(tx, { activeKey: WIF });
await client.broadcast(signed);

// Local-key chain:
await client.tx()
  .transfer({ from: 'alice', to: 'bob', amount: '1.000 VIZ' })
  .sign(WIF)
  .broadcast();
```

## Long-tail ops

Operations not curated as named methods are still typed and reachable via the registry:

```ts
await client.tx()
  .op('committee_vote_request', { voter: 'alice', requestId: 42, voteId: 3 })
  .op('paid_subscribe', { subscriber: 'alice', author: 'bob', level: 1, amount: '1.000 VIZ', period: 30, autoRenewal: true })
  .sign(WIF)
  .broadcast();
```

`op<T>(name, params)` autocompletes the op name and validates params against `OperationMap`.

## Auth helpers

```ts
import { keys } from '@viz-cx/core';

const ks  = keys.fromPassword('alice', 'p4ssw0rd');     // { owner, active, regular, memo }
const wif = keys.fromPassword('alice', 'p4ssw0rd', 'active');
const pub = keys.toPublic(wif);
const { wif: w, pub: p } = keys.generate();
keys.isWif(wif); keys.isPubkey(pub);
```

## Errors

```ts
import { VizRpcError, VizValidationError, VizTransportError } from '@viz-cx/core';
```

- `VizRpcError` — chain rejected the request (`code`, `method`, `data`, `message`).
- `VizValidationError` — input shape problem (`field`, `expected`, `received`).
- `VizTransportError` — network/parse failure (`cause`).

## Configuration

```ts
createClient({
  endpoint: 'https://node.viz.cx',  // default
  account: 'alice',
  activeKey: '5J…',
  timeoutMs: 15_000,                // default
  expirationSec: 30,                // default tx expiration window
});
```

## Operation registry

Every VIZ broadcast op is typed in `OperationMap`. The full list:

```
transfer, transfer_to_vesting, withdraw_vesting, delegate_vesting_shares,
account_witness_vote, award, custom, vote, content, delete_content,
account_update, account_metadata, account_create, set_withdraw_vesting_route,
account_witness_proxy, witness_update, chain_properties_update,
versioned_chain_properties_update, proposal_create, proposal_update,
proposal_delete, escrow_transfer, escrow_dispute, escrow_release, escrow_approve,
committee_worker_create_request, committee_worker_cancel_request,
committee_vote_request, paid_subscribe, set_paid_subscription, create_invite,
claim_invite_balance, invite_registration, use_invite_balance,
request_account_recovery, recover_account, change_recovery_account,
fixed_award, set_account_price, set_subaccount_price, buy_account, target_account_sale
```

Type the params shape with `OperationParams<'op_name'>`. The wire form is `Operation<'op_name'>` (a tagged 2-tuple).

## License

MIT
