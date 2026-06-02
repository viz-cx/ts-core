---
"@viz-cx/core": patch
---

Fix HTTP transport against viz-cpp-node: use the legacy `call` JSON-RPC envelope.

viz-cpp-node's `json_rpc` plugin only reads request `params` when the top-level
method is the legacy `call` wrapper (`params: [api, method, args]`). Its
appbase-style `api.method` path splits the dotted method name but never reads
`params`, so every request failed with `Bad Cast: Invalid cast from object_type
to Array`. The transport now wraps all calls in the `call` envelope, so reads
and broadcasts work against public nodes such as `https://node.viz.cx`. The
public `Transport.call(method, params)` signature is unchanged.
