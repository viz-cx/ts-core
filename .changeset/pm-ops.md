---
"@viz-cx/core": minor
---

Add all HF14 prediction-market broadcast operations (op-ids 66–83, 91–93, 98–99) as typed `OperationMap` entries, `tx()` builder methods and curated client methods (`pmPlaceBet`, `pmCreateMarket`, …). Add the `chain_properties_pm` variant (`PM_PROPS_VERSION = 5`) to `versioned_chain_properties_update` and the matching `ChainProperties` fields. Serialization is oracle-verified against viz-js-lib 0.18.2 and byte-exact against the vectors shared with viz-python-lib / viz-php-lib.
