---
"@viz-cx/core": minor
---

Drop `viz-js-lib` as a runtime/peer dependency. Cryptography and transaction
serialization are now implemented in-house using `@noble/secp256k1` and
`@noble/hashes`. Consumers no longer need to install `viz-js-lib`. Public API
is unchanged. Correctness is verified against `viz-js-lib` (dev-only test
oracle) plus frozen golden vectors and an opt-in live-node integration test.
