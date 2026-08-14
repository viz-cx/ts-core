---
"@viz-cx/core": patch
---

Fix read-path types for the viz-cpp-node witness→validator migration. The
node now returns `current_validator` (was `current_witness`) from
`get_dynamic_global_properties`, and `validator` / `validator_signature`
(were `witness` / `witness_signature`) from `get_block` and
`get_block_header`. The new field names are now the primary types and
`getBlockHeader`'s picked shape includes `validator`; the old names are
retained as `@deprecated` aliases for consumers still reading from older
nodes. The write path (op-schema, tx builder) already used the new names.
