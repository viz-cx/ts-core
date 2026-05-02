# `@viz-cx/core` — Design Spec

**Date:** 2026-05-02
**Status:** Draft (pending review)
**Owner:** babin@axveer.com

## 1. Purpose & gap

`viz-js-lib` is the JavaScript library for the VIZ blockchain. It is published as CommonJS, has no TypeScript types, and exposes a positional-argument API generated from a list of operation names. There is no published `@types/viz-js-lib` and no community wrapper that provides types out of the box.

`@viz-cx/core` closes this gap with a **curated TypeScript facade** over `viz-js-lib`:

- A type-safe, named-argument client API.
- An operation registry that types every VIZ operation, even ones the wrapper doesn't curate.
- A power-user transaction-builder pipeline (`build → sign → broadcast`) that supports offline signing, multi-sig, and hardware wallets.
- A default RPC endpoint of `https://node.viz.cx`.
- Dual ESM + CJS publishing so both modern bundler-based dapps and legacy Node services can consume it.

The package is **lightweight** (zero own runtime deps; peer-deps `viz-js-lib`; under 100 KB tarball) and **powerful** (every upstream operation is reachable and typed; the curated ergonomic layer composes with the raw escape hatch).

## 2. Audience & non-goals

### 2.1 Audience

- TypeScript app and bot developers building on VIZ.
- Wallet and dapp developers who need a typed primitive for transaction construction.
- Tooling authors building higher-level packages (e.g., `@viz-cx/cli`, `@viz-cx/react`).

### 2.2 Non-goals (out of scope for v1)

- React / Vue / Svelte hooks — separate `@viz-cx/react` package later.
- A CLI tool — separate `@viz-cx/cli`.
- WebSocket transport / subscription / streaming APIs — v1.1.
- Reimplementing `viz-js-lib`'s crypto. The wrapper delegates all signing/auth to upstream.
- App-specific custom JSON op parsers (apps build these themselves on top of `client.custom(...)`).

## 3. Package shape

### 3.1 Name

`@viz-cx/core` (canonical and only name; no alias package).

### 3.2 Directory layout

```
@viz-cx/core/
├── src/
│   ├── index.ts                 # public exports
│   ├── client.ts                # createClient(), VizClient class
│   ├── tx.ts                    # tx builder pipeline (build → sign → broadcast)
│   ├── ops/
│   │   ├── registry.ts          # OperationMap — single source of truth
│   │   ├── curated.ts           # ergonomic methods for v1 hot subset
│   │   └── raw.ts               # client.tx().op(name, params) escape hatch
│   ├── asset.ts                 # Asset<Symbol> class, viz()/shares() helpers
│   ├── auth.ts                  # keys.fromPassword, keys.toPublic, keys.generate, …
│   ├── errors.ts                # VizRpcError, VizValidationError, VizTransportError
│   ├── transport.ts             # HTTP transport — only file that imports viz-js-lib
│   ├── config.ts                # default endpoint = https://node.viz.cx
│   └── types.ts                 # branded types, shared interfaces
├── test/
│   ├── unit/                    # vitest
│   ├── types/                   # tsd type-level tests
│   └── integration/             # opt-in, real network
├── examples/
│   ├── esm-app/                 # smoke-test consumer (ESM)
│   └── cjs-app/                 # smoke-test consumer (CJS)
├── tsup.config.ts
├── vitest.config.ts
├── vitest.integration.ts
├── package.json
└── tsconfig.json
```

### 3.3 Dependencies

- **Runtime:** zero own runtime dependencies.
- **Peer:** `viz-js-lib` at the major version pinned at implementation time (verified via `npm view viz-js-lib version`).
- **Dev:** `tsup`, `typescript`, `vitest`, `tsd`, `@arethetypeswrong/cli`, `@changesets/cli`.

### 3.4 Build & publish

- `tsup` produces ESM + CJS + `.d.ts` + `.d.cts`, target `es2022`, `platform: 'neutral'`, `splitting: false`, `treeshake: true`.
- `package.json` `exports` map orders `types` first under each conditional; `attw` verifies resolution.
- `sideEffects: false` for tree-shaking.
- `engines.node >= 18`.
- Independent semver from `viz-js-lib`. Start at `0.1.0`; promote to `1.0.0` after at least one minor release without breaking changes.
- Pre-publish gates: `tsc --noEmit`, `vitest run`, `tsd`, `attw --pack .`, 100 KB tarball budget.

### 3.5 `package.json` (skeleton)

```jsonc
{
  "name": "@viz-cx/core",
  "version": "0.1.0",
  "description": "Type-safe TypeScript wrapper for viz-js-lib with a default https://node.viz.cx endpoint.",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": { "import": "./dist/index.d.ts", "require": "./dist/index.d.cts" },
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": false,
  "engines": { "node": ">=18" },
  "peerDependencies": { "viz-js-lib": "^X.Y" },
  "publishConfig": { "access": "public" }
}
```

## 4. Public API

### 4.1 `createClient(...)` — account-bound default

```ts
import { createClient } from '@viz-cx/core';

const client = createClient({
  account: 'alice',
  activeKey: process.env.ALICE_ACTIVE_WIF!,
  // endpoint defaults to 'https://node.viz.cx'
});

await client.transfer({ to: 'bob', amount: '1.000 VIZ', memo: 'thanks' });
```

When `account` and `activeKey` are omitted, `createClient` returns a **read-only client** — TypeScript removes the curated broadcast methods from the type, so `client.transfer(...)` is a compile-time error.

```ts
const reader = createClient();          // type: VizReadClient
await reader.api.getAccounts(['alice']);
// reader.transfer(...)                 // ❌ TS error
```

This is implemented via overloaded `createClient` signatures returning a discriminated type.

### 4.2 Curated broadcast methods (v1)

Seven methods cover financial, staking, witness, and app-protocol flows:

```ts
client.transfer({ to, amount, memo? })
client.transferToVesting({ to, amount })
client.withdrawVesting({ amount })
client.delegateVestingShares({ delegatee, vestingShares })
client.accountWitnessVote({ witness, approve })
client.award({ receiver, energy, customSequence?, memo?, beneficiaries? })
client.custom({ requiredActiveAuths?, requiredRegularAuths?, id, json })
```

Each accepts named args; `from` / `voter` / `account` / `delegator` / `initiator` defaults to the bound account. Returns `Promise<TransactionResult>` with `id`, `blockNum`, `expiration`.

Operations not curated in v1 (e.g., `vote`, `content`, `delete_content`, `account_update`, all committee/escrow/proposal ops) are **fully typed in the registry** and reachable via `client.tx().op(name, params)` — see §4.5.

### 4.3 Read API — `client.api.*`

Mirrors `viz-js-lib`'s API namespaces, fully typed. Covered: Database API, Witness API, AccountByKey, AccountHistory, OperationHistory.

```ts
await client.api.getAccounts(['alice', 'bob']);          // → Account[]
await client.api.getDynamicGlobalProperties();            // → DynamicGlobalProperties
await client.api.getBlock(12345);                         // → Block | null
await client.api.lookupAccountNames(['alice']);           // → (Account | null)[]
await client.api.getAccountHistory('alice', -1, 100);     // → [number, AccountHistoryItem][]
```

### 4.4 Transaction-builder pipeline (power layer)

```ts
import { sign } from '@viz-cx/core';

const tx = await client.tx()
  .transfer({ from: 'alice', to: 'bob', amount: '1.000 VIZ' })
  .build();                                  // → UnsignedTransaction

const signed = sign(tx, { activeKey: WIF }); // pure, offline-safe
await client.broadcast(signed);              // → TransactionResult

// Convenience chain when keys are local:
await client.tx().transfer({...}).sign(WIF).broadcast();
```

`tx()` is **stateless** — does not require `account` / `activeKey` on the client. Hardware wallets and multi-sig flows substitute their own signer for `sign(tx, ...)`.

### 4.5 Raw operation escape hatch (typed)

```ts
await client.tx()
  .op('committee_vote_request', { voter: 'alice', requestId: 42, voteId: 3 })
  .op('paid_subscribe', { subscriber: 'alice', author: 'bob', level: 1, amount: '1.000 VIZ' })
  .sign(WIF)
  .broadcast();
```

Generic signature: `op<T extends OperationName>(name: T, params: OperationParams<T>): TxBuilder`. Op name autocompletes; params are validated against the registry.

### 4.6 Auth utilities — `keys.*`

```ts
import { keys } from '@viz-cx/core';

keys.fromPassword('alice', 'p4ssw0rd', 'active');  // → Wif
keys.fromPassword('alice', 'p4ssw0rd');            // → { owner, active, regular, memo: Wif }
keys.toPublic(wif);                                 // → PublicKey
keys.generate();                                     // → { wif, pub }
keys.isWif(s); keys.isPubkey(s);                    // → boolean (type guards)
keys.sign(buffer, wif); keys.verify(buffer, sig, pub);
```

Thin wrapper around `viz-js-lib`'s `auth.*` namespace, flattened and named.

### 4.7 Asset helpers — phantom-symbol generic

```ts
import { Asset, viz, shares } from '@viz-cx/core';

const a = viz('1.000');                      // Asset<'VIZ'>
const b = viz('0.500');
a.add(b).toString();                          // '1.500 VIZ'
a.add(shares('1.000000'));                   // ❌ TS error: symbol mismatch

Asset.parse('1.000 VIZ');                    // Asset<'VIZ'>
Asset.parse('1 VIZ');                         // throws VizValidationError (precision)
viz('1.000').toJSON();                        // '1.000 VIZ' (RPC-ready)
```

API boundaries accept `AssetInput<S>` — `string | Asset<S> | { value: string; symbol: S }` (wide input). Internally everything normalizes to canonical `bigint` amount + symbol + precision.

### 4.8 Errors

Three error classes covering realistic failure modes:

```ts
import { VizRpcError, VizValidationError, VizTransportError } from '@viz-cx/core';

try {
  await client.transfer({ to: 'bob', amount: '999999.000 VIZ' });
} catch (e) {
  if (e instanceof VizRpcError)        // chain rejected
    console.log(e.code, e.method, e.data);
  if (e instanceof VizValidationError) // bad input shape
    console.log(e.field, e.expected);
  if (e instanceof VizTransportError)  // network, timeout, malformed response
    console.log(e.cause);
}
```

## 5. Type system

### 5.1 Operation registry (the spine)

`src/ops/registry.ts` defines `OperationMap`, an interface mapping every VIZ operation name to its parameter shape:

```ts
export interface OperationMap {
  // Curated v1 ops
  transfer: {
    from: AccountName;
    to: AccountName;
    amount: AssetInput<'VIZ'>;
    memo?: string;
  };
  transfer_to_vesting: { from: AccountName; to: AccountName; amount: AssetInput<'VIZ'> };
  withdraw_vesting:    { account: AccountName; vestingShares: AssetInput<'SHARES'> };
  delegate_vesting_shares: {
    delegator: AccountName;
    delegatee: AccountName;
    vestingShares: AssetInput<'SHARES'>;
  };
  account_witness_vote: { account: AccountName; witness: AccountName; approve: boolean };
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

  // Long-tail ops (typed, reachable via tx().op())
  vote: { voter: AccountName; author: AccountName; permlink: string; weight: number };
  content: {
    parentAuthor?: AccountName;
    parentPermlink: string;
    author: AccountName;
    permlink: string;
    title: string;
    body: string;
    jsonMetadata?: string;
    curationPercent?: number;
  };
  delete_content:                { author: AccountName; permlink: string };
  account_update:                { account: AccountName; owner?: Authority; active?: Authority; regular?: Authority; memoKey?: PublicKey; jsonMetadata?: string };
  account_metadata:              { account: AccountName; jsonMetadata: string };
  proposal_create:               /* full shape from VIZ docs */;
  proposal_update:               /* … */;
  proposal_delete:               /* … */;
  escrow_transfer:               /* … */;
  escrow_dispute:                /* … */;
  escrow_release:                /* … */;
  escrow_approve:                /* … */;
  committee_worker_create_request: /* … */;
  committee_worker_cancel_request: /* … */;
  committee_vote_request:        { voter: AccountName; requestId: number; voteId: number };
  paid_subscribe:                /* … */;
  set_paid_subscription:         /* … */;
  create_invite:                 /* … */;
  claim_invite_balance:          /* … */;
  invite_registration:           /* … */;
  use_invite_balance:            /* … */;
  request_account_recovery:      /* … */;
  recover_account:               /* … */;
  change_recovery_account:       /* … */;
  account_create:                /* … */;
  set_withdraw_vesting_route:    /* … */;
  witness_update:                /* … */;
  account_witness_proxy:         /* … */;
  chain_properties_update:       /* … */;
  versioned_chain_properties_update: /* … */;
  fixed_award:                   /* … */;
  set_account_price:             /* … */;
  set_subaccount_price:          /* … */;
  buy_account:                   /* … */;
  target_account_sale:           /* … */;
  // Implementation populates each `/* … */` from VIZ-JS-LIB-COVERAGE-STATUS.md and VIZ chain schema.
}

export type OperationName = keyof OperationMap;
export type OperationParams<T extends OperationName> = OperationMap[T];
export type Operation<T extends OperationName = OperationName> =
  { [K in T]: [K, OperationMap[K]] }[T];   // tagged tuple, wire-format
```

### 5.2 Shared atomic types

```ts
export type AccountName = string & { readonly __brand: 'AccountName' };
export type PublicKey   = string & { readonly __brand: 'PublicKey' };
export type Wif         = string & { readonly __brand: 'Wif' };
export type AssetSymbol = 'VIZ' | 'SHARES';
export type AssetInput<S extends AssetSymbol = AssetSymbol> =
  string | Asset<S> | { value: string; symbol: S };

export interface Authority {
  weightThreshold: number;
  accountAuths: [AccountName, number][];
  keyAuths: [PublicKey, number][];
}

export interface Beneficiary { account: AccountName; weight: number }

export interface UnsignedTransaction {
  refBlockNum: number;
  refBlockPrefix: number;
  expiration: string;
  operations: Operation[];
  extensions: unknown[];
}
export interface SignedTransaction extends UnsignedTransaction { signatures: string[] }
export interface TransactionResult { id: string; blockNum: number; expiration: string }
```

Branded types are constructed via helper functions: `account('alice')`, `publicKey('VIZ7Cm…')`, `wif('5J…')`. Each helper validates format and returns the branded type or throws `VizValidationError`.

### 5.3 Curated method types are *derived*

```ts
type CuratedMethod<Op extends OperationName, Implicit extends keyof OperationMap[Op]> =
  (args: Omit<OperationMap[Op], Implicit>) => Promise<TransactionResult>;

interface VizClient {
  transfer:                CuratedMethod<'transfer',                'from'>;
  transferToVesting:       CuratedMethod<'transfer_to_vesting',     'from'>;
  withdrawVesting:         CuratedMethod<'withdraw_vesting',        'account'>;
  delegateVestingShares:   CuratedMethod<'delegate_vesting_shares', 'delegator'>;
  accountWitnessVote:      CuratedMethod<'account_witness_vote',    'account'>;
  award:                   CuratedMethod<'award',                   'initiator'>;
  custom:                  CuratedMethod<'custom',                  never>;     // no implicit field
  tx(): TxBuilder;
  api:  ReadApi;
  broadcast(signed: SignedTransaction): Promise<TransactionResult>;
}
```

Adding fields to a registry entry automatically updates the corresponding curated method's type. There is no parallel hand-written type to drift.

### 5.4 `tx()` builder

```ts
interface TxBuilder {
  op<T extends OperationName>(name: T, params: OperationParams<T>): TxBuilder;
  transfer(p: OperationParams<'transfer'>): TxBuilder;            // explicit `from`
  transferToVesting(p: OperationParams<'transfer_to_vesting'>): TxBuilder;
  withdrawVesting(p: OperationParams<'withdraw_vesting'>): TxBuilder;
  delegateVestingShares(p: OperationParams<'delegate_vesting_shares'>): TxBuilder;
  accountWitnessVote(p: OperationParams<'account_witness_vote'>): TxBuilder;
  award(p: OperationParams<'award'>): TxBuilder;
  custom(p: OperationParams<'custom'>): TxBuilder;
  build(): UnsignedTransaction;
  sign(key: Wif | string): SignedTransactionBuilder;
}

interface SignedTransactionBuilder {
  broadcast(): Promise<TransactionResult>;
  toJSON(): SignedTransaction;
}

export function sign(tx: UnsignedTransaction, opts: { activeKey: Wif | string }): SignedTransaction;
```

## 6. Configuration

### 6.1 Default endpoint

`https://node.viz.cx`. Overridable per-client:

```ts
createClient({ endpoint: 'https://my.node.example' });
```

### 6.2 v1 client options

```ts
interface ClientOptions {
  endpoint?: string;              // default: 'https://node.viz.cx'
  account?: AccountName | string; // bind a default sender (enables curated methods)
  activeKey?: Wif | string;       // sign curated broadcast calls with this
  timeoutMs?: number;             // default 15_000
  expirationSec?: number;         // tx expiration window, default 30
}
```

### 6.3 Deferred to v1.1+

- `endpoint: string[]` — failover / round-robin.
- `transport: ws('wss://...')` — WebSocket transport.
- `signer: Signer` — pluggable signing for hardware wallets.

## 7. Adapter seam

`src/transport.ts` is the **only** file that imports `viz-js-lib` at runtime. It exposes:

```ts
export interface Transport {
  call(method: string, params: unknown[]): Promise<unknown>;
  broadcast(signed: SignedTransaction): Promise<TransactionResult>;
  getDynamicGlobalProperties(): Promise<DynamicGlobalProperties>;
  // …other low-level RPCs needed by tx builder for ref_block computation
}

export function createHttpTransport(endpoint: string, opts?: { timeoutMs?: number }): Transport;
```

Everything else in the codebase (client, tx builder, curated methods, read API) imports `Transport` from this file and never `viz-js-lib` directly. Upgrading `viz-js-lib` requires changes only in `transport.ts` (and possibly `auth.ts`, which also delegates).

A contributor README note (or a custom ESLint rule) enforces "no `import 'viz-js-lib'` outside `src/transport.ts` and `src/auth.ts`."

## 8. Testing

### 8.1 Type tests (`tsd`)

The most important test layer. Run on every PR. Examples:

```ts
expectType<{ from: AccountName; to: AccountName; amount: AssetInput<'VIZ'>; memo?: string }>(
  {} as OperationParams<'transfer'>
);

const c = createClient({ account: 'alice' as AccountName, activeKey: 'WIF' as Wif });
expectType<Promise<TransactionResult>>(c.transfer({ to: 'bob' as AccountName, amount: viz('1.000') }));
expectError(c.transfer({ to: 'bob' as AccountName, amount: shares('1.000000') }));
expectError(c.transfer({ amount: '1.000 VIZ' }));

const reader = createClient();
expectError(reader.transfer({ to: 'bob' as AccountName, amount: '1.000 VIZ' }));
```

### 8.2 Unit tests (`vitest`)

- `Asset.parse` precision validation, math, symbol-mismatch throws.
- Branded-type constructors validate input format.
- Operation registry → wire-format serialization (tagged tuple).
- Error classification (RPC vs validation vs transport).
- `tx().build()` produces correct `expiration`, `refBlockNum`, op array.
- Mocked-transport unit tests for curated client methods.
- Coverage target: > 80 % line coverage on `asset.ts`, `errors.ts`, `tx.ts`, `client.ts`.

### 8.3 Integration tests (opt-in)

Real network against `https://node.viz.cx`. Read-only paths only. Skipped by default in CI.

```bash
pnpm test:integration
```

Tests skip with a warning (rather than failing) if the endpoint is unreachable.

**No broadcasting in CI, ever.** Mocked transport is sufficient for broadcast-path unit tests; live broadcasting requires managing a funded test account, key handling in CI secrets, and produces non-deterministic results.

### 8.4 Consumer smoke tests

`examples/esm-app` and `examples/cjs-app` import `@viz-cx/core`, build with their respective module systems, and run a trivial read query. Catches publish-time issues `attw` might miss.

## 9. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `viz-js-lib` ships breaking change | Medium | High | All upstream calls in `transport.ts` and `auth.ts`; CI matrix tests latest upstream |
| Upstream RPC schema changes (new field) | Medium | Low | Schema response types use `unknown` for forward-compat unknown fields; document policy |
| Branded types frustrate users | Medium | Medium | Document `account()`, `wif()` constructors prominently in README; consider escape-hatch helpers if real friction emerges in beta feedback |
| `node.viz.cx` outage during integration tests | Low | Low | Tests skip with warning if endpoint unreachable |
| Bundle size creeps past "lightweight" claim | Low | Medium | 100 KB tarball budget enforced in `prepublishOnly`; `sideEffects: false` |
| `attw` false positives on resolver upgrade | Low | Low | Pin `attw` version; review on upgrade |
| Hardware wallet integration emerges before v1.1 | Medium | Low | `tx().build()` → `sign(tx, …)` → `broadcast(signed)` already supports a custom signer; document the seam |

## 10. Definition of done — v0.1.0

- All seven curated v1 ops typed and wrapped: `transfer`, `transferToVesting`, `withdrawVesting`, `delegateVestingShares`, `accountWitnessVote`, `award`, `custom`.
- Operation registry covers the full set of broadcast ops + virtual ops listed in `VIZ-JS-LIB-COVERAGE-STATUS.md`, with parameter types.
- Read API (`client.api.*`) covers Database, Witness, AccountByKey, AccountHistory, OperationHistory namespaces.
- Auth utilities: `keys.fromPassword`, `keys.toPublic`, `keys.generate`, `keys.isWif`, `keys.isPubkey`, `keys.sign`, `keys.verify`.
- `Asset` class with `viz()` / `shares()` helpers and phantom-symbol type safety.
- Error classes: `VizRpcError`, `VizValidationError`, `VizTransportError`.
- Default endpoint `https://node.viz.cx`, overridable.
- Dual ESM + CJS publish; `attw` clean.
- `tsd` type tests pass; unit tests > 80 % line coverage on core modules; integration smoke test against `node.viz.cx` passes locally.
- README with quickstart, full curated-ops examples, op-builder pipeline example, link to operation registry for long-tail ops.
- 100 KB tarball budget respected.
- Published to npm as `@viz-cx/core@0.1.0` with `latest` dist-tag.

## 11. Roadmap beyond v1

- v1.1: WebSocket transport; endpoint failover (`endpoint: string[]`); pluggable `Signer` interface for hardware wallets.
- v1.2: Curate the next tier of ops (`vote`, `content`, `accountUpdate`, etc.) as named methods on `VizClient`.
- Future: `@viz-cx/react` (hooks), `@viz-cx/cli` (admin tool).
