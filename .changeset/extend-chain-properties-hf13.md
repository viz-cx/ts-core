---
"@viz-cx/core": minor
---

Extend `ChainProperties` to the full `chain_properties_hf13` shape (26 fields, up from 16) and export `HF13_PROPS_VERSION` (= 4, the `static_variant` index for hf13 in `versioned_chain_properties_update`).

The type previously modeled an inconsistent mix of `chain_properties_init` plus a handful of later-hardfork fields. It now covers every field the chain's current `validator_api.get_validator_by_account` returns in `props`, verified against `viz-cpp-node`'s `chain_operations.hpp`. Also fixes a pre-existing test-fixture bug where `min_delegation` was given a `SHARES` amount instead of `VIZ`.
