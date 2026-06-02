---
"@viz-cx/core": patch
---

Accept all on-chain-valid VIZ account names in `account()`.

The validator rejected names outside 3–16 characters, but viz-cpp-node's
`is_valid_account_name` permits 2–32 characters (`CHAIN_MIN_ACCOUNT_NAME_LENGTH`
= 2, `CHAIN_MAX_ACCOUNT_NAME_LENGTH` = 32); only *creating* a new account
requires 3+. Existing short accounts such as `id` are valid and must pass
validation. `account()` now allows 2–32 characters with dot-separated segments
of ≥2 characters each.
