# `@viz-cx/core`: HF14 Prediction-Market operations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@viz-cx/core` 0.8.0 with every broadcastable HF14 Prediction-Market ("Onix") operation (op-ids 66–83, 91–93, 98–99) plus the `chain_properties_pm` variant (index 5) of `versioned_chain_properties_update`, byte-verified against `viz-js-lib` 0.18.2 (oracle) and the frozen hex vectors that `viz-python-lib` / `viz-php-lib` share.

**Architecture:** No new modules. Extend the four existing single-source tables — `OP_TYPE_IDS` (constants), `OP_SCHEMA` (serializer), `OperationMap` (registry), curated maps — and add five field types to `writeField`. Curated methods are generated from the maps, so each op is: one id, one schema row, one type, one curated row, one sample.

**Tech Stack:** unchanged (TypeScript strict, vitest, tsd, tsup, changesets, pnpm). Dev oracle `viz-js-lib` must be bumped `^0.12.7 → ^0.18.2` (upstream 0.15–0.17 added the PM serializers; 0.18.2 is the latest on npm).

**Branch / PR:** `feat/prediction-market-ops` → `viz-cx/ts-core` `main` (you have admin; push the branch directly, open the PR with `gh pr create`). Conventional-commit messages. One minor changeset.

---

## Protocol reference (verbatim from `viz-cpp-node` master, `libraries/protocol/include/graphene/protocol/pm_operations.hpp` + `operations.hpp`)

The wire format is `varint(op-id)` then fields in FC_REFLECT order. `extensions` is always an empty set (one `0x00` byte). Types: `account_name_type` → `string`; `share_type`/`pm_object_id_type` → `int64`; `asset` → `asset`; `fc::sha256` → 32 raw bytes; `time_point_sec` → `time`; `optional<T>` → `0x00` or `0x01`+T.

| id | op | fields (name:type, in wire order) | required authority |
|---|---|---|---|
| 66 | `pm_oracle_register` | owner:string, insurance:asset, fee_percent:uint16, fixed_fee:asset, rules_url:string, auto_accept_creator:string, auto_accept_resolver:string, auto_accept:bool, extensions | active(owner) |
| 67 | `pm_oracle_update` | owner:string, insurance_delta:optional-asset, fee_percent:optional-uint16, fixed_fee:optional-asset, rules_url:optional-string, auto_accept_creator:optional-string, auto_accept_resolver:optional-string, auto_accept:optional-bool, extensions | active(owner) |
| 68 | `pm_create_market` | creator:string, oracle:string, market_type:uint8, outcomes:string[] (**unsorted vector**), url:string, oracle_fee_percent:uint16, oracle_fixed_fee:asset, creator_fee_percent:uint16, liquidity_fee_percent:uint16, liquidity:asset, lmsr_b:int64, betting_expiration:time, result_expiration:time, time_penalty_type:uint8, time_penalty_value:uint32, penalty_curve_type:uint8, allow_early_resolution:bool, allow_cancellation:bool, allow_batch:bool, allow_instant_bet:bool, endogeneity_tier:uint8, dispute_mode:uint8, dispute_resolver:string, dispute_penalty_percent:int16, metadata:string, extensions | active(creator) |
| 69 | `pm_oracle_accept_market` | oracle:string, market_id:int64, accept:bool, oracle_fee_percent:uint16, oracle_fixed_fee:asset, extensions | active(oracle) |
| 70 | `pm_place_bet` | account:string, market_id:int64, side:int8, outcome_index:int16, amount:asset, min_tokens:int64, mode:uint8, extensions | active(account) |
| 71 | `pm_commit_bet` | account:string, market_id:int64, commitment:sha256, escrow_amount:asset, no_reveal_fee_percent:uint16, extensions | active(account) |
| 72 | `pm_reveal_bet` | account:string, commit_id:int64, side:int8, outcome_index:int16, amount:asset, salt:string, min_tokens:int64, extensions | active(account) |
| 73 | `pm_cancel_bet` | account:string, bet_id:int64, min_return:int64, extensions | active(account) |
| 74 | `pm_add_liquidity` | provider:string, market_id:int64, amount:asset, extensions | active(provider) |
| 75 | `pm_withdraw_liquidity` | provider:string, liquidity_id:int64, amount:asset, extensions | active(provider) |
| 76 | `pm_resolve_market` | oracle:string, market_id:int64, winning_outcome:int16, decision_url:string, decision_reason:string, extensions | active(oracle) |
| 77 | `pm_no_contest` | oracle:string, market_id:int64, reason:string, extensions | active(oracle) |
| 78 | `pm_dispute_create` | disputer:string, market_id:int64, proposed_outcome:int16, reason:string, extensions | active(disputer) |
| 79 | `pm_dispute_vote` | voter:string, market_id:int64, vote_outcome:int16, vote_percent:int16, extensions | **regular**(voter) |
| 80 | `pm_dispute_resolve` | resolver:string, market_id:int64, correct_outcome:int16, penalty_amount:asset, ban_oracle:bool, ban_oracle_until:time, ban_creator:bool, ban_creator_until:time, extensions | active(resolver) |
| 81 | `pm_transfer_position` | from:string, bet_id:int64, to:string, amount:**int64** (share weight, not an asset), memo:string, extensions | active(from) |
| 82 | `pm_lazy_deposit` | account:string, amount:asset, extensions | active(account) |
| 83 | `pm_lazy_withdraw` | account:string, shares:int64, emergency:bool, extensions | active(account) |
| 91 | `pm_leverage_open` | account:string, market_id:int64, outcome_index:int16, collateral:asset, loan:asset, min_tokens:int64, max_slippage_percent:uint16, extensions | active(account) |
| 92 | `pm_leverage_close` | account:string, position_id:int64, min_return:int64, extensions | active(account) |
| 93 | `pm_leverage_convert` | account:string, position_id:int64, conversion_profit_cost:uint16, extensions | active(account) |
| 98 | `pm_dispute_oracle_respond` | oracle:string, market_id:int64, response:string, extensions | active(oracle) |
| 99 | `pm_unban` | resolver:string, target:string, unban_oracle:bool, unban_creator:bool, extensions | active(resolver) |

Ids 84–90, 94–97, 100–104 are **virtual** (never broadcast). Do **not** add them to `OP_TYPE_IDS`/`OP_SCHEMA`/`OperationMap`; `@viz-cx/core` only serializes. Id 105 `set_agent_permission` (HF15) is out of scope for this PR.

### `chain_properties_pm` (static_variant index 5) — hf13 fields (all 26 existing) followed by, in this exact order:

```
pm_oracle_registration_fee:asset  pm_min_oracle_insurance:asset  pm_market_creation_fee:asset
pm_min_liquidity:asset  pm_max_outcomes:uint8  pm_max_market_duration:uint32
pm_max_oracle_fee_percent:uint16  pm_oracle_accept_window_sec:uint32
pm_listing_min_coverage_percent:uint16  pm_betting_min_coverage_percent:uint16
pm_default_time_penalty_percent:uint16  pm_max_time_penalty:uint32  pm_dispute_fee:asset
pm_dispute_grace_sec:uint32  pm_oracle_dispute_response_sec:uint32  pm_dispute_auto_close_sec:uint32
pm_dispute_vote_period_sec:uint32  pm_dispute_approve_min_percent:uint16
pm_oracle_penalty_percent:uint16  pm_no_contest_penalty_percent:uint16
pm_dispute_reward_multiplier:uint32  pm_batch_epoch_blocks:uint32  pm_reveal_window_blocks:uint32
pm_commit_no_reveal_penalty_percent:uint16  pm_min_batch_bet:asset  pm_commit_reveal_enabled:bool
pm_processing_cap_per_block:uint32  pm_lazy_pool_enabled:bool  pm_lazy_alloc_percent:uint16
pm_lazy_max_total_alloc_percent:uint16  pm_lazy_lock_sec:uint32  pm_lazy_recall_step_percent:uint16
pm_lazy_emergency_penalty_percent:uint16  pm_lazy_min_liquidity_fee_percent:uint16
pm_leverage_enabled:bool  pm_leverage_fund_percent:uint16  pm_leverage_max_per_position_bp:uint16
pm_leverage_pool_profit_percent:uint16  pm_leverage_safety_margin_percent:uint16
pm_leverage_max_slippage_percent:uint16  pm_leverage_min_market_liquidity:asset
pm_leverage_max_position_ratio_percent:uint16  pm_leverage_expiration_buffer_sec:uint32
pm_leverage_m_factor_percent:uint16  pm_leverage_funding_rate_ppm_per_day:uint32
pm_conversion_profit_cost_percent:uint16  pm_closed_market_retention_sec:uint32
pm_early_exit_reward_cap_percent:uint16
pm_min_bet:asset  pm_settle_rows_per_block:uint32
committee_votes_per_request:uint32  committee_vote_min_vesting:asset
pm_dispute_votes_per_market:uint32  pm_dispute_vote_min_vesting:asset
```

(55 fields; matches `chain_properties_hf14` in viz-js-lib 0.17+ and `_chain_properties_pm_items` in viz-python-lib. The oracle test will catch any slip.)

### Cross-library golden vectors (full op hex = varint id + body)

Source of truth: `/Users/babin/Develop/VIZ/viz-python-lib/tests/test_pm_operations.py` (`PM_CASES`), byte-identical to viz-php-lib and the node. Copy the 23 `(name, kwargs, hex)` tuples verbatim into `test/fixtures/pm-vectors.json` — do not retype them by hand. Inputs use plain wire keys (snake_case, assets as `"1.000 VIZ"` strings, times as `"2030-01-01T00:00:00"`, `commitment` as 64-hex-char string, optional fields as `null`).

---

## File map

| File | Change | Task |
|---|---|---|
| `package.json` | devDep `viz-js-lib` → `^0.18.2` | 1 |
| `src/constants.ts` | +23 op ids | 2 |
| `src/serializer/op-schema.ts` | +5 `FieldType`s, +23 schemas | 3 |
| `src/serializer/operation.ts` | +5 `writeField` cases, `PM_EXTRA` props, variant 5 | 3 |
| `src/types.ts` | `ChainProperties` PM fields, `PM_PROPS_VERSION = 5` | 4 |
| `src/ops/registry.ts` | +23 `OperationMap` entries, `OP_NAMES` | 5 |
| `src/tx.ts` | `ASSET_SYMBOL_FIELDS` additions, +23 `TxBuilder` methods | 6 |
| `src/ops/curated.ts` | +23 curated methods + implicit-field rows | 6 |
| `test/oracle/samples.mjs` | +23 samples | 7 |
| `test/fixtures/pm-vectors.json`, `test/unit/pm-vectors.test.ts` | cross-lib vectors | 7 |
| `test/fixtures/golden.json` | regenerate | 7 |
| `test/unit/constants.test.ts`, `registry.test.ts`, `curated.test.ts`, `test/types/*.test-d.ts` | spot checks | 7 |
| `README.md`, `AGENTS.md` | registry list, op count | 8 |
| `.changeset/pm-ops.md` | minor | 8 |

---

## Task 1: Bump the oracle

- [ ] `pnpm add -D viz-js-lib@^0.18.2` (check `pnpm-workspace.yaml` `minimumReleaseAge` — 0.18.2 may need adding to `minimumReleaseAgeExclude` if it is younger than the cooldown).
- [ ] `pnpm test` — must stay green before any source change. If the existing oracle breaks on 0.18.x, fix that first in its own commit.
- [ ] Verify the oracle now exposes PM serializers: `node -e "const o=require('viz-js-lib/lib/auth/serializer/src/operations'); console.log(o.operation.st_operations.length, !!o.pm_place_bet)"` → `105 true` (or more).
- [ ] Commit: `chore(deps): bump viz-js-lib oracle to 0.18.2 (PM serializers)`

## Task 2: Op ids

- [ ] `src/constants.ts`: append the 23 PM ids from the table under a `// HF14 Prediction Markets (Onix) — virtual ids 84-90, 94-97, 100-104 intentionally absent` comment.
- [ ] `test/unit/constants.test.ts`: add `expect(OP_TYPE_IDS['pm_oracle_register']).toBe(66)`, `pm_lazy_withdraw → 83`, `pm_leverage_open → 91`, `pm_unban → 99`, and `expect(OP_TYPE_IDS['pm_batch_settle']).toBeUndefined()`.
- [ ] Add a parity test in `test/oracle/serializer.oracle.test.ts`: for every name in `OP_TYPE_IDS`, `ops.operation.st_operations[id].operation_name === name` (viz-js-lib `Serializer` instances expose `operation_name`; confirm the property name in `node_modules/viz-js-lib/lib/auth/serializer/src/serializer.js`).

## Task 3: Serializer

- [ ] `op-schema.ts` `FieldType` union: add `'int8' | 'sha256' | 'optional-asset' | 'optional-uint16' | 'optional-bool'`.
- [ ] `op-schema.ts` `OP_SCHEMA`: 23 rows transcribed from the table. `outcomes` is `'string[]'` (the existing unsorted `w.vector`). Every PM op ends with `['extensions','extensions']`.
- [ ] `operation.ts` `writeField`:
  - `int8`: `w.uint8(Number(v) & 0xff)` (JS `&` yields two's complement: `-1 → 0xff`).
  - `sha256`: hex string → 32 raw bytes via `w.raw(hexToBytes(s))`; throw `VizValidationError({ field: 'sha256', expected: '64 hex chars', received })` otherwise. (`hexToBytes` already exists — see import in `tx.ts`.)
  - `optional-asset` / `optional-uint16` / `optional-bool`: `w.optional(v == null ? undefined : ..., ...)` mirroring `optional-string`.
- [ ] `operation.ts`: add `PM_EXTRA = [...HF13_EXTRA, ...55 PM fields]`, push `[...CHAIN_PROPS_INIT_FIELDS, ...PM_EXTRA]` as `VERSIONED_PROPS_FIELDS[5]`, update the error text to `'typeId 0-5'`.
- [ ] Unit test for the new primitives in `test/unit/primitives.test.ts` or a new `test/unit/op-schema.test.ts`: `int8(-1) → "ff"`, `sha256` rejects 63 chars, `optional-uint16(undefined) → "00"`, `optional-uint16(5) → "010500"`.

## Task 4: Types

- [ ] `src/types.ts` `ChainProperties`: append the 55 PM fields as optional camelCase (`pmOracleRegistrationFee?: string`, `pmMaxOutcomes?: number`, `pmCommitRevealEnabled?: boolean`, … `pmDisputeVoteMinVesting?: string`). Assets are strings, bools are booleans, everything else `number`.
- [ ] Export `export const PM_PROPS_VERSION = 5;` with a doc comment ("chain_properties_pm, HF14 — the variant a validator must submit to vote on PM parameters"). Keep `HF13_PROPS_VERSION`.
- [ ] Re-export from `src/index.ts` (next to `HF13_PROPS_VERSION`).

## Task 5: Registry

- [ ] `src/ops/registry.ts`: a `// ─── HF14 Prediction Markets ───` block with 23 entries. Conventions: camelCase keys; `AccountName` for accounts; `AssetInput<'VIZ'>` for every asset; `number` for ids, percents, indices, `side`; `string` for `commitment` (64-hex), `salt`, urls, `memo`, `metadata`; `string[]` for `outcomes`; ISO strings for times. `pm_oracle_update` change fields are `?:` optional. `pm_transfer_position.amount` is `number` with a doc comment "share weight (int64), NOT an asset; 0 = full".
- [ ] `OP_NAMES`: append the 23 names.
- [ ] `test/unit/registry.test.ts`: `OP_NAMES` contains `pm_place_bet`; `expectTypeOf<OperationParams<'pm_oracle_update'>>().toMatchTypeOf<{ owner: string; feePercent?: number }>()`.
- [ ] `test/types/registry.test-d.ts` (or wherever the tsd tests live): `expectError` when `pm_place_bet` lacks `amount`.

## Task 6: Builder + curated

- [ ] `src/tx.ts` `ASSET_SYMBOL_FIELDS`: add `insurance`, `insuranceDelta`, `fixedFee`, `oracleFixedFee`, `liquidity`, `escrowAmount`, `penaltyAmount`, `collateral`, `loan` → `'VIZ'`. (`amount` is already `'VIZ'`; a numeric `pm_transfer_position.amount` passes through because the conversion only fires on string/Asset values — add a unit test proving `op('pm_transfer_position', { amount: 1000 })` keeps `1000`.)
- [ ] `src/tx.ts` `TxBuilder` interface + impl map: 23 methods `pmOracleRegister … pmUnban`.
- [ ] `src/ops/curated.ts`: `CuratedClient` block + `CURATED_METHOD_TO_OP` + `CURATED_IMPLICIT_FIELD` rows. Implicit fields: owner(66,67) creator(68) oracle(69,76,77,98) account(70,71,72,73,82,83,91,92,93) provider(74,75) disputer(78) voter(79) resolver(80,99) from(81).
- [ ] Check how `award` (a regular-authority op) is signed in `src/client.ts` and make `pm_dispute_vote` follow the same key choice. If the client only ever signs with `activeKey`, leave it (active satisfies regular on VIZ) and note it in the method's doc comment.
- [ ] `test/unit/curated.test.ts`: every PM method exists on the client and injects its implicit field (follow the existing pattern there).

## Task 7: Vectors and oracle

- [ ] `test/oracle/samples.mjs`: 23 samples using exactly the python kwargs (so the three libraries share inputs). The oracle test loops over `SAMPLES`, so no new test code is needed for the viz-js-lib comparison.
- [ ] `test/fixtures/pm-vectors.json` + `test/unit/pm-vectors.test.ts`: for each tuple, `writeOperation(w, name, input)` then `expect(w.hex()).toBe(hex)`. This is independent of viz-js-lib and is the consensus guard.
- [ ] `pnpm gen:golden` → commit the regenerated `test/fixtures/golden.json`.
- [ ] `versioned_chain_properties_update` with `[5, {...}]`: add one oracle sample with all 61 fields set (take defaults from the node struct: fees `"10.000 VIZ"`, `pm_min_oracle_insurance "5000.000 VIZ"`, etc. — any valid values work, the oracle compares bytes).

## Task 8: Docs, changeset, gates

- [ ] `README.md` "Operation registry": add the 23 names; one short "Prediction markets" example (`client.pmPlaceBet({ marketId, side: 1, outcomeIndex: -1, amount: '1.500 VIZ' })`).
- [ ] `AGENTS.md`: update the `registry.ts` line: 43 op-names → 66 (63 ops + 3 deprecated witness_* aliases) and mention the oracle version.
- [ ] `.changeset/pm-ops.md`: `"@viz-cx/core": minor` — "Add all HF14 Prediction-Market broadcast operations (op-ids 66–83, 91–93, 98–99) as typed ops, tx-builder methods and curated client methods; add `chain_properties_pm` (variant 5) and `PM_PROPS_VERSION`; bump the dev oracle to viz-js-lib 0.18.2."
- [ ] Gate: `pnpm lint && pnpm lint:types && pnpm test && pnpm build && pnpm test:types && pnpm lint:exports && pnpm size`. The tarball has a 100 KB budget — if `pnpm size` fails, trim doc comments in `registry.ts` before anything else.
- [ ] Commits (suggested): `feat(ops): add HF14 prediction-market operation ids and schemas`, `feat(ops): type and curate prediction-market operations`, `test: cross-library PM serialization vectors`, `docs: prediction-market ops`.
- [ ] `git push -u origin feat/prediction-market-ops && gh pr create --base main --title "feat: HF14 prediction-market operations" --body-file -` with a body that lists the ids, the oracle bump, and links `docs/protocol/operations/prediction-markets.md` in viz-cpp-node.

## Out of scope (follow-ups)

- `set_agent_permission` (op 105, HF15): fields `account:string, agent_name:string, agent_key:pubkey, operations:string-set, expiration:time, addons:string-set, extensions`. viz-js-lib upstream does not have it yet either.
- Typed wrappers for the `prediction_market_api` read methods (39 of them: `get_market`, `get_market_full`, `list_markets`, `get_account_positions`, `get_oracle`, `list_oracles`, `get_dispute`, `get_lazy_pool`, `get_leverage_quote`, `get_pm_chain_properties`, …). Reachable today through the generic transport call.
