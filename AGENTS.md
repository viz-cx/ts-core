# Repository guide for AI agents

This file orients Claude Code, Codex, Cursor, and any other AI coding agent working in `@viz-cx/core`.

## Project in one paragraph

`@viz-cx/core` is a type-safe TypeScript facade over the untyped `viz-js-lib` for the VIZ blockchain. It exposes named-argument curated methods for every broadcast operation, a typed `OperationMap` covering the long tail, and a `tx().build() → sign() → broadcast()` builder for offline signing and hardware wallet flows. Dual ESM+CJS publish, `viz-js-lib` is a peer dependency, no runtime deps of our own.

## Commands

| Goal | Command |
| --- | --- |
| Install | `pnpm install --frozen-lockfile` |
| Build (dual ESM+CJS via tsup) | `pnpm build` |
| Unit tests | `pnpm test` |
| Type-level tests (tsd) | `pnpm build && pnpm test:types` (build first — tsd reads `dist/index.d.ts`) |
| Lint | `pnpm lint` |
| Typecheck | `pnpm lint:types` |
| Exports sanity (arethetypeswrong) | `pnpm lint:exports` |
| Tarball size budget | `pnpm size` |
| Smoke test against live node | `pnpm smoke` |
| Pre-publish gate | `pnpm prepublishOnly` |

Use **pnpm**, not npm — lockfile is `pnpm-lock.yaml`.

## Source layout

```
src/
  index.ts          public exports (the published API surface)
  client.ts         createClient(), VizClient, VizReadClient
  tx.ts             TxBuilder, deepConvertKeys (camelCase→snake_case), wire defaults
  api.ts            read API namespaces (database_api, validator_api, …)
  asset.ts          Asset<S> with phantom-symbol generics, viz()/shares() factories
  auth.ts           keys.* helpers (fromPassword, generate, sign, verify, type guards)
  transport.ts      HTTP JSON-RPC transport, error normalization
  config.ts         client config defaults
  errors.ts         VizRpcError, VizValidationError, VizTransportError
  types.ts          branded types (AccountName, PublicKey, Wif), ChainProperties
  viz-js-lib.d.ts   ambient module declaration for the untyped peer dep
  ops/
    registry.ts     single source of truth for OperationMap — 42 broadcast ops
    curated.ts      named-arg curated methods, implicit-field injection map
    raw.ts          op('name', params) escape hatch

test/
  unit/             vitest unit tests — one file per src module
  types/            tsd type-level assertions
  integration/      live-node integration tests (gated, off by default)
```

## Key invariants

- **VIZ uses `master` authority, not `owner`** (unlike Steem/Hive). All authority fields use VIZ naming: `master`, `newMasterAuthority`, `masterApprovalsToAdd`, etc. Do not auto-convert `master`↔`owner`.
- **camelCase → snake_case at the wire boundary only.** Source code, type names, and curated method args are camelCase. `tx.ts:deepConvertKeys` recursively converts at serialize time. Nested `Authority` objects and `versioned_chain_properties_update` static-variants must round-trip — keep `deepConvertKeys` recursing into arrays (`v.map(deepConvertKeys)`).
- **`viz-js-lib` ships two operation registries.** `lib/broadcast/operations.js` is broader than the binary serializer's `st_operations` in `lib/auth/serializer/src/operations.js`. Only ops with a binary serializer are broadcastable today. `claim_reward_balance` is in the former but not the latter — do not add it to our registry until upstream wires the serializer.
- **Witness → validator rename (viz-js-lib 0.12.6).** New ops: `validator_update`, `account_validator_vote`, `account_validator_proxy`, `set_reward_sharing`. Old `witness_*` op-names remain as deprecated aliases that route through the new serializers. The serializer aliases the op *name* but rejects the old `witness` field — `account_witness_vote` payloads must now use `validator`. Read API namespace moved from `witness_api` to `validator_api`.
- **Asset fields accept three shapes**: canonical string (`'1.000 VIZ'`), an `Asset` instance, or `{ value, symbol }`. `energy`/`maxEnergy` are chain units (100 = 1%).
- **No runtime dependencies.** `viz-js-lib` is `peerDependencies`. Don't add `dependencies` without strong justification — the 100 KB tarball budget is enforced by `pnpm size`.

## Adding a new operation

1. Add the param shape to `OperationMap` in `src/ops/registry.ts` (use camelCase field names).
2. Add it to the `OP_NAMES` array.
3. If a curated method makes sense, add it in `src/ops/curated.ts` and register implicit-field injection (e.g. `from: boundAccount`) in `CURATED_IMPLICIT_FIELD`.
4. Add a corresponding builder method on `TxBuilder` in `src/tx.ts`. If any field is an asset with a fixed symbol (e.g. always SHARES), register it in `ASSET_SYMBOL_FIELDS`.
5. Test: assert `transaction.operations[0]` snake_case shape in `test/unit/curated.test.ts` or `tx.test.ts`. Use the chain mock from those tests.
6. Type test: add a `tsd` assertion in `test/types/operations.test-d.ts`.
7. Update README's "Curated methods" and "Operation registry" sections.

## Release process

- Versioning via **Changesets**. To ship a change: `pnpm changeset` (or hand-write `.changeset/<slug>.md`) → push.
- `changesets/action@v1` opens a "Version Packages" PR that bumps `package.json` + `CHANGELOG.md` and deletes consumed changesets.
- Merging that PR triggers `release.yml`, which compares local version vs npm and publishes the delta via **npm Trusted Publisher (OIDC)** — no `NPM_TOKEN` involved.
- Required workflow perms: `id-token: write`, `contents: write`, `pull-requests: write`.
- The runner upgrades npm to ≥ 11.5.1 in-job (Node 20 ships an npm too old for OIDC Trusted Publisher).
- Provenance attestation is on (`npm publish --provenance`).

## Gotchas / footguns

- Running `npm install` (instead of `pnpm install`) writes a `package-lock.json` and corrupts the dep graph. If it ever appears, delete it and re-run `pnpm install --lockfile-only`.
- `setup-node`'s `registry-url` input writes `_authToken=` into `.npmrc` — that blocks OIDC fallback. Keep it OUT of `release.yml`.
- npm returns **404 on PUT** to mean "unauthorized" (it hides whether the package exists). Don't chase the literal "not found" — diagnose the token/OIDC chain instead.
- `pnpm test:types` requires `dist/` — always run `pnpm build` first. CI matrix does this.

## Public-API stability

Anything exported from `src/index.ts` is part of the published surface. Renaming or removing those names is a **major** version bump. Internal helpers that aren't re-exported can be refactored freely.
