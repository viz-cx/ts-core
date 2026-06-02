---
"@viz-cx/core": patch
---

Fix broadcast against viz-cpp-node: send TaPoS fields as snake_case `ref_block_num` / `ref_block_prefix`.

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
