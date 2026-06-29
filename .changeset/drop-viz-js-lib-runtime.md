---
"@viz-cx/core": minor
---

Drop `viz-js-lib` as a runtime/peer dependency. Cryptography and transaction
serialization are now implemented in-house using `@noble/secp256k1` and
`@noble/hashes`. Consumers no longer need to install `viz-js-lib`. Correctness
is verified against `viz-js-lib` (dev-only test oracle) plus frozen golden
vectors and an opt-in live-node integration test.

**Migration note:** `keys.sign(buf, wif)` now signs `sha256(buf)` directly
(RFC6979, single hash). The old viz-js-lib path signed `sha256(sha256(buf))`.
Signatures produced by the old implementation will not verify under the new
`keys.verify`. Transaction signing via `sign(tx, { activeKey })` is unaffected.
