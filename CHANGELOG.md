# @viz-cx/core

## 0.7.0

### Minor Changes

- cc8584a: Drop `viz-js-lib` as a runtime/peer dependency. Cryptography and transaction
  serialization are now implemented in-house using `@noble/secp256k1` and
  `@noble/hashes`. Consumers no longer need to install `viz-js-lib`. Correctness
  is verified against `viz-js-lib` (dev-only test oracle) plus frozen golden
  vectors and an opt-in live-node integration test.

  **Migration note:** `keys.sign(buf, wif)` now signs `sha256(buf)` directly
  (RFC6979, single hash). The old viz-js-lib path signed `sha256(sha256(buf))`.
  Signatures produced by the old implementation will not verify under the new
  `keys.verify`. Transaction signing via `sign(tx, { activeKey })` is unaffected.

## 0.6.1

### Patch Changes

- 4dabc70: Bump `vitest` and `@vitest/coverage-v8` from `^1.6.0` to `^3.2.6`, resolving the critical Dependabot advisory (Vitest UI server arbitrary file read/exec, GHSA fixed in 3.2.6). Dev-dependency only — no change to the published surface.

  All gates pass under vitest 3: lint, typecheck, 106/106 unit tests, tsd, attw exports, tarball size. Coverage config: excluded ambient `.d.ts` files and recalibrated the `functions` threshold (vitest 3's v8 provider counts inner closures/arrows as uncovered even when their lines run, so lines/statements/branches remain the meaningful gates at 98%/98%/92%).

  The low-severity esbuild advisory (dev-server file read on Windows, transitively via `tsup`) is intentionally not addressed here: the patched esbuild `0.28.1` is outside tsup 8.5.1's declared `^0.27.0` range, and the vector (dev server on Windows) does not apply to this repo's Linux CI / `vitest run` usage. Revisit once tsup widens its esbuild range.

- 268010b: Track `viz-js-lib` 0.12.7. Bump the peer/dev dependency from `^0.12.6` to `^0.12.7`.

  Upstream 0.12.7 removes long-deprecated social/content API methods (`get_content`, `get_blog*`, `get_follow*`, `get_discussions_by_*`, `get_vesting_delegations`, `lookup_accounts`, …) and moves `babel-preset-env`/`cross-env` out of runtime `dependencies` into `devDependencies`. None of the removed methods are referenced by `@viz-cx/core`'s API surface, so this is a clean version track with no behavior change. The build, type, exports, and tarball-size gates all pass against 0.12.7, and the dependency cleanup drops ~80 transitive babel/cross-env packages from installs.

## 0.6.0

### Minor Changes

- 60adafe: Extend `ChainProperties` to the full `chain_properties_hf13` shape (26 fields, up from 16) and export `HF13_PROPS_VERSION` (= 4, the `static_variant` index for hf13 in `versioned_chain_properties_update`).

  The type previously modeled an inconsistent mix of `chain_properties_init` plus a handful of later-hardfork fields. It now covers every field the chain's current `validator_api.get_validator_by_account` returns in `props`, verified against `viz-cpp-node`'s `chain_operations.hpp`. Also fixes a pre-existing test-fixture bug where `min_delegation` was given a `SHARES` amount instead of `VIZ`.

## 0.5.3

### Patch Changes

- 3fb098d: Fix broadcast against viz-cpp-node: send TaPoS fields as snake_case `ref_block_num` / `ref_block_prefix`.

  The signature is computed over the snake_case wire shape, but `broadcast()` was
  sending the signed transaction with camelCase `refBlockNum` / `refBlockPrefix`.
  viz-cpp-node parses incoming transactions by the snake_case field names, so it
  read both TaPoS values as `0`, recomputed a digest that differed from the signed
  one, and rejected every write as missing authority. Lenient public nodes still
  accepted the tx into the mempool and returned an optimistic block number from the
  synchronous broadcast, so failures were silent — the transaction simply never
  made it into a block. `broadcast()` now serializes the payload to the snake_case
  wire shape that matches the signed digest. Affects all write operations (award,
  transfers, withdrawals).

## 0.5.2

### Patch Changes

- b1d1598: Accept all on-chain-valid VIZ account names in `account()`.

  The validator rejected names outside 3–16 characters, but viz-cpp-node's
  `is_valid_account_name` permits 2–32 characters (`CHAIN_MIN_ACCOUNT_NAME_LENGTH`
  = 2, `CHAIN_MAX_ACCOUNT_NAME_LENGTH` = 32); only _creating_ a new account
  requires 3+. Existing short accounts such as `id` are valid and must pass
  validation. `account()` now allows 2–32 characters with dot-separated segments
  of ≥2 characters each.

- b1d1598: Fix HTTP transport against viz-cpp-node: use the legacy `call` JSON-RPC envelope.

  viz-cpp-node's `json_rpc` plugin only reads request `params` when the top-level
  method is the legacy `call` wrapper (`params: [api, method, args]`). Its
  appbase-style `api.method` path splits the dotted method name but never reads
  `params`, so every request failed with `Bad Cast: Invalid cast from object_type
to Array`. The transport now wraps all calls in the `call` envelope, so reads
  and broadcasts work against public nodes such as `https://node.viz.cx`. The
  public `Transport.call(method, params)` signature is unchanged.

## 0.5.1

### Patch Changes

- 1fa30d4: CI: switch publish auth to npm Trusted Publisher (OIDC) and bump deprecated Node 20 GitHub Actions (`actions/checkout`, `actions/setup-node`, `pnpm/action-setup`) to v6 so workflows keep running after the June 2026 Node 24 forced-default cutoff. No runtime/library changes — devops only.

## 0.5.0

### Minor Changes

- e81c622: Track viz-js-lib 0.12.6 witness→validator migration:

  - Add new ops: `validator_update`, `account_validator_vote`, `account_validator_proxy`, `set_reward_sharing` with matching curated methods (`validatorUpdate`, `accountValidatorVote`, `accountValidatorProxy`, `setRewardSharing`).
  - Switch read API namespace from `witness_api` to `validator_api`; add `getValidatorByAccount` / `getActiveValidators` to `ReadApi`.
  - **Breaking**: `account_witness_vote` / `accountWitnessVote` now takes `validator` instead of `witness` — the upstream serializer aliases the op-name but requires the new field. Old `witness_*` op-names, curated methods, and API methods remain as deprecated aliases that route through the new `validator_*` path.
  - Add optional validator-renamed governance fields (`inflationValidatorPercent`, `validatorMissPenaltyPercent`, `validatorMissPenaltyDuration`, `validatorDeclarationFee`) to `ChainProperties`.

## 0.2.0

### Minor Changes

- 4b6c12d: Initial release: type-safe wrapper over `viz-js-lib` with curated client (`transfer`, `transferToVesting`, `withdrawVesting`, `delegateVestingShares`, `accountWitnessVote`, `award`, `custom`), full operation registry typing for long-tail ops via `tx().op(...)`, transaction-builder pipeline with offline signing, dual ESM/CJS publish, default endpoint `https://node.viz.cx`.
