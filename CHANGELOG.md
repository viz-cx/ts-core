# @viz-cx/core

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
