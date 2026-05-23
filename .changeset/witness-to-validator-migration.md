---
'@viz-cx/core': minor
---

Track viz-js-lib 0.12.6 witness→validator migration:

- Add new ops: `validator_update`, `account_validator_vote`, `account_validator_proxy`, `set_reward_sharing` with matching curated methods (`validatorUpdate`, `accountValidatorVote`, `accountValidatorProxy`, `setRewardSharing`).
- Switch read API namespace from `witness_api` to `validator_api`; add `getValidatorByAccount` / `getActiveValidators` to `ReadApi`.
- **Breaking**: `account_witness_vote` / `accountWitnessVote` now takes `validator` instead of `witness` — the upstream serializer aliases the op-name but requires the new field. Old `witness_*` op-names, curated methods, and API methods remain as deprecated aliases that route through the new `validator_*` path.
- Add optional validator-renamed governance fields (`inflationValidatorPercent`, `validatorMissPenaltyPercent`, `validatorMissPenaltyDuration`, `validatorDeclarationFee`) to `ChainProperties`.
