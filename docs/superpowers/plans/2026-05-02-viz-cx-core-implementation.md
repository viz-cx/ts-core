# `@viz-cx/core` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and ship `@viz-cx/core@0.1.0`, a type-safe TypeScript wrapper over `viz-js-lib` with a curated client, an operation-registry-driven type system, a tx-builder pipeline, and a default `https://node.viz.cx` endpoint.

**Architecture:** Single source of truth is `OperationMap` in `src/ops/registry.ts`. Curated client methods are derived via mapped types from that map. Only `src/transport.ts` and `src/auth.ts` import `viz-js-lib`; everything else talks to the `Transport` interface. Dual ESM + CJS via `tsup`; tests in three layers (`tsd` for types, `vitest` for units, opt-in integration against the real RPC).

**Tech Stack:** TypeScript 5.4+ (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), `tsup` (bundler), `vitest` (unit/integration), `tsd` (type-level tests), `@arethetypeswrong/cli` (export-map verification), `@changesets/cli` (release flow), `pnpm` (package manager), `viz-js-lib` (peer dep).

**Spec reference:** `docs/superpowers/specs/2026-05-02-viz-cx-core-design.md`

---

## File structure

Each file gets one task. The shape was decided in the spec; this plan locks it in.

| File | Responsibility | Task |
|---|---|---|
| `package.json` | manifest, scripts, exports map, peer dep | 1 |
| `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `vitest.integration.ts`, `.gitignore` | toolchain config | 1 |
| `scripts/check-tarball-size.mjs` | 100 KB budget gate | 2 |
| `src/errors.ts` | `VizRpcError`, `VizValidationError`, `VizTransportError` | 3 |
| `src/types.ts` | branded types, shared interfaces | 4 |
| `src/asset.ts` | `Asset<S>` class, `viz()`, `shares()` | 5 |
| `src/ops/registry.ts` | `OperationMap`, `OperationParams`, `Operation` | 6 |
| `src/config.ts` | default endpoint, `ClientOptions` defaults | 7 |
| `src/transport.ts` | HTTP transport (raw JSON-RPC, no `viz-js-lib`) | 8 |
| `src/auth.ts` | `keys.*` thin wrapper over `viz-js-lib` `auth.*` | 9 |
| `src/tx.ts` | `TxBuilder`, `sign()`, `broadcast()` plumbing | 10 |
| `src/ops/curated.ts` | derived method types + impls | 11 |
| `src/ops/raw.ts` | `tx().op(name, params)` escape hatch | 11 |
| `src/api.ts` | typed read API (`client.api.*`) | 12 |
| `src/client.ts` | `createClient()` overloads → `VizClient` \| `VizReadClient` | 13 |
| `src/index.ts` | public re-exports | 14 |
| `.eslintrc.cjs` | guard rule: no `viz-js-lib` import outside transport/auth | 15 |
| `test/types/*.test-d.ts` | `tsd` type tests | 16 |
| `test/unit/*.test.ts` | `vitest` unit tests | 17 |
| `test/integration/*.test.ts` | opt-in real-network tests | 17 |
| `examples/esm-app/`, `examples/cjs-app/` | dual-module smoke tests | 18 |
| `scripts/smoke-test.mjs` | pack + install + run examples | 18 |
| `.github/workflows/ci.yml`, `.github/workflows/release.yml` | CI + release pipelines | 19 |
| `README.md` | quickstart, curated ops, builder pipeline, registry pointer | 20 |
| `.changeset/` | changesets bootstrap | 21 |

---

## Task 1: Repository scaffolding & toolchain

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `vitest.integration.ts`
- Create: `.gitignore`
- Create: `.npmignore`
- Create: `LICENSE` (MIT)

- [ ] **Step 1: Initialize git and pnpm**

```bash
cd /Users/babin/Develop/VIZ/ts-core
git init -b main
echo "node-linker=hoisted" > .npmrc
```

- [ ] **Step 2: Write `.gitignore`**

```
node_modules/
dist/
.pack-tmp/
*.tgz
coverage/
.DS_Store
*.log
.env
.env.*
!.env.example
.turbo/
.cache/
```

- [ ] **Step 3: Write `package.json`**

```jsonc
{
  "name": "@viz-cx/core",
  "version": "0.1.0",
  "description": "Type-safe TypeScript wrapper for viz-js-lib with a default https://node.viz.cx endpoint.",
  "keywords": ["viz", "viz-blockchain", "blockchain", "typescript", "viz-js-lib"],
  "homepage": "https://github.com/viz-cx/ts-core#readme",
  "bugs": "https://github.com/viz-cx/ts-core/issues",
  "license": "MIT",
  "author": "babin@axveer.com",
  "repository": { "type": "git", "url": "git+https://github.com/viz-cx/ts-core.git" },
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": { "import": "./dist/index.d.ts", "require": "./dist/index.d.cts" },
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": false,
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "tsup",
    "clean": "rm -rf dist .pack-tmp coverage",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage",
    "test:types": "tsd",
    "test:integration": "vitest run --config vitest.integration.ts",
    "lint": "eslint . --ext .ts",
    "lint:types": "tsc --noEmit",
    "lint:exports": "attw --pack . --profile node16",
    "size": "node scripts/check-tarball-size.mjs",
    "smoke": "node scripts/smoke-test.mjs",
    "prepublishOnly": "pnpm clean && pnpm build && pnpm lint:types && pnpm test && pnpm test:types && pnpm lint:exports && pnpm size",
    "release": "changeset publish"
  },
  "peerDependencies": {
    "viz-js-lib": "*"
  },
  "devDependencies": {
    "@arethetypeswrong/cli": "^0.15.4",
    "@changesets/cli": "^2.27.7",
    "@types/node": "^20.14.0",
    "@typescript-eslint/eslint-plugin": "^7.13.0",
    "@typescript-eslint/parser": "^7.13.0",
    "@vitest/coverage-v8": "^1.6.0",
    "eslint": "^8.57.0",
    "tsd": "^0.31.1",
    "tsup": "^8.1.0",
    "typescript": "^5.4.5",
    "viz-js-lib": "*",
    "vitest": "^1.6.0"
  },
  "publishConfig": { "access": "public" },
  "tsd": { "directory": "test/types" }
}
```

> Replace `viz-js-lib`'s `*` with the exact resolved version after Step 5 below.

- [ ] **Step 4: Write `tsconfig.json`**

```jsonc
{
  "compilerOptions": {
    "target": "es2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["es2022", "dom"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "useDefineForClassFields": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "examples", "scripts"]
}
```

- [ ] **Step 5: Write `tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  treeshake: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  platform: 'neutral',
  minify: false,
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
});
```

- [ ] **Step 6: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/types.ts'],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
```

- [ ] **Step 7: Write `vitest.integration.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
```

- [ ] **Step 8: Write `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 babin@axveer.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 9: Install dependencies (and pin `viz-js-lib`)**

```bash
pnpm install
pnpm view viz-js-lib version    # observe the latest published major
# Edit package.json: replace "viz-js-lib": "*" in peerDependencies and devDependencies with "^<major>.<minor>"
pnpm install
```

- [ ] **Step 10: Verify clean tooling**

Run: `pnpm lint:types`
Expected: PASS (no source files yet, but config compiles).

Run: `pnpm test`
Expected: "No test files found" — vitest exits 0 with `--passWithNoTests` ... if it errors, add `passWithNoTests: true` to `vitest.config.ts`.

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "chore: scaffold repo, toolchain, package.json"
```

---

## Task 2: Tarball-size guard script

**Files:**
- Create: `scripts/check-tarball-size.mjs`

This script enforces the 100 KB tarball budget. It runs as part of `prepublishOnly`.

- [ ] **Step 1: Write `scripts/check-tarball-size.mjs`**

```js
#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BUDGET_BYTES = 100 * 1024;
const PACK_DIR = '.pack-tmp';

rmSync(PACK_DIR, { recursive: true, force: true });
mkdirSync(PACK_DIR, { recursive: true });

execFileSync('pnpm', ['pack', '--pack-destination', PACK_DIR], { stdio: 'inherit' });

const tarball = readdirSync(PACK_DIR).find((f) => f.endsWith('.tgz'));
if (!tarball) {
  console.error('No .tgz produced by pnpm pack');
  process.exit(1);
}

const size = statSync(join(PACK_DIR, tarball)).size;
const kb = (size / 1024).toFixed(2);
const budgetKb = (BUDGET_BYTES / 1024).toFixed(2);

if (size > BUDGET_BYTES) {
  console.error(`Tarball ${tarball} is ${kb} KB, exceeds budget ${budgetKb} KB`);
  process.exit(1);
}
console.log(`Tarball ${tarball}: ${kb} KB (budget ${budgetKb} KB) — OK`);
rmSync(PACK_DIR, { recursive: true, force: true });
```

- [ ] **Step 2: Sanity-check it runs (will fail until `dist/` exists)**

Run: `node scripts/check-tarball-size.mjs`
Expected: errors because no `dist/` yet — that's fine; we'll re-run after first build.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-tarball-size.mjs
git commit -m "chore: add tarball size guard script"
```

---

## Task 3: Error classes

**Files:**
- Create: `src/errors.ts`
- Create: `test/unit/errors.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/errors.test.ts
import { describe, it, expect } from 'vitest';
import { VizRpcError, VizValidationError, VizTransportError } from '../../src/errors';

describe('errors', () => {
  it('VizRpcError carries code, method, data', () => {
    const e = new VizRpcError({ code: -32000, method: 'broadcast_transaction', data: { x: 1 }, message: 'rejected' });
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(VizRpcError);
    expect(e.name).toBe('VizRpcError');
    expect(e.code).toBe(-32000);
    expect(e.method).toBe('broadcast_transaction');
    expect(e.data).toEqual({ x: 1 });
    expect(e.message).toBe('rejected');
  });

  it('VizValidationError carries field and expected', () => {
    const e = new VizValidationError({ field: 'amount', expected: 'string with 3-decimal precision', received: '1 VIZ' });
    expect(e).toBeInstanceOf(VizValidationError);
    expect(e.field).toBe('amount');
    expect(e.expected).toContain('precision');
  });

  it('VizTransportError preserves cause', () => {
    const cause = new Error('fetch failed');
    const e = new VizTransportError({ message: 'network', cause });
    expect(e).toBeInstanceOf(VizTransportError);
    expect(e.cause).toBe(cause);
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm test test/unit/errors.test.ts`
Expected: FAIL — `Cannot find module '../../src/errors'`.

- [ ] **Step 3: Implement `src/errors.ts`**

```ts
export class VizRpcError extends Error {
  readonly code: number;
  readonly method: string;
  readonly data: unknown;
  constructor(opts: { code: number; method: string; data?: unknown; message: string }) {
    super(opts.message);
    this.name = 'VizRpcError';
    this.code = opts.code;
    this.method = opts.method;
    this.data = opts.data;
  }
}

export class VizValidationError extends Error {
  readonly field: string;
  readonly expected: string;
  readonly received: unknown;
  constructor(opts: { field: string; expected: string; received: unknown; message?: string }) {
    super(opts.message ?? `Invalid ${opts.field}: expected ${opts.expected}`);
    this.name = 'VizValidationError';
    this.field = opts.field;
    this.expected = opts.expected;
    this.received = opts.received;
  }
}

export class VizTransportError extends Error {
  override readonly cause?: unknown;
  constructor(opts: { message: string; cause?: unknown }) {
    super(opts.message);
    this.name = 'VizTransportError';
    this.cause = opts.cause;
  }
}
```

- [ ] **Step 4: Run test**

Run: `pnpm test test/unit/errors.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/errors.ts test/unit/errors.test.ts
git commit -m "feat: add VizRpcError, VizValidationError, VizTransportError"
```

---

## Task 4: Branded atomic types & shared interfaces

**Files:**
- Create: `src/types.ts`
- Create: `test/unit/types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/types.test.ts
import { describe, it, expect } from 'vitest';
import { account, publicKey, wif } from '../../src/types';
import { VizValidationError } from '../../src/errors';

describe('branded constructors', () => {
  it('account() accepts valid names', () => {
    expect(account('alice')).toBe('alice');
    expect(account('alice-bob')).toBe('alice-bob');
    expect(account('a1b2c3.d4e5')).toBe('a1b2c3.d4e5');
  });

  it('account() rejects names that violate VIZ rules', () => {
    expect(() => account('Al')).toThrow(VizValidationError);     // uppercase
    expect(() => account('a')).toThrow(VizValidationError);      // too short
    expect(() => account('a'.repeat(17))).toThrow(VizValidationError); // too long
    expect(() => account('-alice')).toThrow(VizValidationError); // leading dash
    expect(() => account('alice_bob')).toThrow(VizValidationError); // underscore
  });

  it('publicKey() accepts VIZ7-prefixed keys', () => {
    const k = 'VIZ7' + 'A'.repeat(50);
    expect(publicKey(k)).toBe(k);
    expect(() => publicKey('STM7abc')).toThrow(VizValidationError);
  });

  it('wif() accepts plausible base58 secrets', () => {
    const k = '5J' + 'A'.repeat(49);
    expect(wif(k)).toBe(k);
    expect(() => wif('not-a-key')).toThrow(VizValidationError);
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm test test/unit/types.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/types.ts`**

```ts
import { VizValidationError } from './errors';
import type { Asset } from './asset';

export type AccountName = string & { readonly __brand: 'AccountName' };
export type PublicKey   = string & { readonly __brand: 'PublicKey' };
export type Wif         = string & { readonly __brand: 'Wif' };

export type AssetSymbol = 'VIZ' | 'SHARES';
export type AssetInput<S extends AssetSymbol = AssetSymbol> =
  | string
  | Asset<S>
  | { value: string; symbol: S };

export interface Authority {
  weightThreshold: number;
  accountAuths: Array<readonly [AccountName, number]>;
  keyAuths: Array<readonly [PublicKey, number]>;
}

export interface Beneficiary { account: AccountName; weight: number }

export interface Operation<T extends string = string> {
  readonly 0: T;
  readonly 1: Record<string, unknown>;
  readonly length: 2;
}

export interface UnsignedTransaction {
  refBlockNum: number;
  refBlockPrefix: number;
  expiration: string;
  operations: ReadonlyArray<readonly [string, Record<string, unknown>]>;
  extensions: ReadonlyArray<unknown>;
}

export interface SignedTransaction extends UnsignedTransaction {
  signatures: ReadonlyArray<string>;
}

export interface TransactionResult {
  id: string;
  blockNum: number;
  expiration: string;
}

const ACCOUNT_RE = /^[a-z][a-z0-9-]{1,14}[a-z0-9](?:\.[a-z][a-z0-9-]{1,14}[a-z0-9])*$/;

export function account(s: string): AccountName {
  if (typeof s !== 'string' || s.length < 3 || s.length > 16 || !ACCOUNT_RE.test(s)) {
    throw new VizValidationError({
      field: 'account',
      expected: 'lowercase 3-16 chars, alnum + dashes, starts/ends alnum, dot-separated segments',
      received: s,
    });
  }
  return s as AccountName;
}

export function publicKey(s: string): PublicKey {
  if (typeof s !== 'string' || !s.startsWith('VIZ') || s.length < 50 || s.length > 60) {
    throw new VizValidationError({
      field: 'publicKey',
      expected: "VIZ-prefixed base58 string",
      received: s,
    });
  }
  return s as PublicKey;
}

export function wif(s: string): Wif {
  if (typeof s !== 'string' || !s.startsWith('5') || s.length < 50 || s.length > 53) {
    throw new VizValidationError({
      field: 'wif',
      expected: 'base58 WIF starting with 5',
      received: '<redacted>',
    });
  }
  return s as Wif;
}
```

- [ ] **Step 4: Run test**

Run: `pnpm test test/unit/types.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/types.ts test/unit/types.test.ts
git commit -m "feat: add branded types AccountName/PublicKey/Wif and shared interfaces"
```

---

## Task 5: `Asset<S>` class with phantom-symbol generic

**Files:**
- Create: `src/asset.ts`
- Create: `test/unit/asset.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/asset.test.ts
import { describe, it, expect } from 'vitest';
import { Asset, viz, shares } from '../../src/asset';
import { VizValidationError } from '../../src/errors';

describe('Asset', () => {
  it('parses canonical "1.000 VIZ"', () => {
    const a = Asset.parse('1.000 VIZ');
    expect(a.symbol).toBe('VIZ');
    expect(a.precision).toBe(3);
    expect(a.amount).toBe(1000n);
    expect(a.toString()).toBe('1.000 VIZ');
    expect(a.toJSON()).toBe('1.000 VIZ');
  });

  it('parses "1.000000 SHARES"', () => {
    const a = Asset.parse('1.000000 SHARES');
    expect(a.symbol).toBe('SHARES');
    expect(a.precision).toBe(6);
    expect(a.amount).toBe(1_000_000n);
  });

  it('rejects wrong precision', () => {
    expect(() => Asset.parse('1 VIZ')).toThrow(VizValidationError);
    expect(() => Asset.parse('1.00 VIZ')).toThrow(VizValidationError);
    expect(() => Asset.parse('1.0000 VIZ')).toThrow(VizValidationError);
  });

  it('rejects unknown symbols', () => {
    // @ts-expect-error - ZAR not an AssetSymbol
    expect(() => Asset.parse('1.000 ZAR')).toThrow(VizValidationError);
  });

  it('add() preserves symbol', () => {
    const r = viz('1.000').add(viz('0.500'));
    expect(r.toString()).toBe('1.500 VIZ');
  });

  it('viz() and shares() factories', () => {
    expect(viz('2.500').toString()).toBe('2.500 VIZ');
    expect(shares('0.000001').toString()).toBe('0.000001 SHARES');
  });

  it('compare', () => {
    expect(viz('1.000').lt(viz('2.000'))).toBe(true);
    expect(viz('1.000').eq(viz('1.000'))).toBe(true);
  });

  it('Asset.from accepts Asset, string, or object', () => {
    const a = viz('1.000');
    expect(Asset.from<'VIZ'>(a, 'VIZ').amount).toBe(1000n);
    expect(Asset.from<'VIZ'>('1.000 VIZ', 'VIZ').amount).toBe(1000n);
    expect(Asset.from<'VIZ'>({ value: '1.000', symbol: 'VIZ' }, 'VIZ').amount).toBe(1000n);
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm test test/unit/asset.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/asset.ts`**

```ts
import { VizValidationError } from './errors';
import type { AssetSymbol, AssetInput } from './types';

const PRECISION: Record<AssetSymbol, number> = { VIZ: 3, SHARES: 6 };

export class Asset<S extends AssetSymbol = AssetSymbol> {
  readonly amount: bigint;
  readonly symbol: S;
  readonly precision: number;

  private constructor(amount: bigint, symbol: S) {
    this.amount = amount;
    this.symbol = symbol;
    this.precision = PRECISION[symbol];
  }

  static parse<S extends AssetSymbol>(s: string): Asset<S> {
    if (typeof s !== 'string') {
      throw new VizValidationError({ field: 'asset', expected: 'string "<value> <SYMBOL>"', received: s });
    }
    const m = /^(\d+)\.(\d+) (VIZ|SHARES)$/.exec(s);
    if (!m) {
      throw new VizValidationError({ field: 'asset', expected: '"<int>.<frac> VIZ|SHARES"', received: s });
    }
    const [, intPart, fracPart, sym] = m as unknown as [string, string, string, AssetSymbol];
    const expectedPrecision = PRECISION[sym];
    if (fracPart.length !== expectedPrecision) {
      throw new VizValidationError({
        field: 'asset.precision',
        expected: `${expectedPrecision} fractional digits for ${sym}`,
        received: s,
      });
    }
    const amount = BigInt(intPart + fracPart);
    return new Asset<S>(amount, sym as S);
  }

  static from<S extends AssetSymbol>(input: AssetInput<S>, symbol: S): Asset<S> {
    if (input instanceof Asset) {
      if (input.symbol !== symbol) {
        throw new VizValidationError({
          field: 'asset.symbol',
          expected: symbol,
          received: input.symbol,
        });
      }
      return input as Asset<S>;
    }
    if (typeof input === 'string') {
      const a = Asset.parse<S>(input);
      if (a.symbol !== symbol) {
        throw new VizValidationError({ field: 'asset.symbol', expected: symbol, received: a.symbol });
      }
      return a;
    }
    return Asset.parse<S>(`${input.value} ${input.symbol}`);
  }

  add(other: Asset<S>): Asset<S> {
    this.requireSameSymbol(other);
    return new Asset<S>(this.amount + other.amount, this.symbol);
  }
  sub(other: Asset<S>): Asset<S> {
    this.requireSameSymbol(other);
    return new Asset<S>(this.amount - other.amount, this.symbol);
  }
  eq(other: Asset<S>): boolean { this.requireSameSymbol(other); return this.amount === other.amount; }
  lt(other: Asset<S>): boolean { this.requireSameSymbol(other); return this.amount < other.amount; }
  gt(other: Asset<S>): boolean { this.requireSameSymbol(other); return this.amount > other.amount; }

  toString(): string {
    const s = this.amount.toString().padStart(this.precision + 1, '0');
    const intPart = s.slice(0, s.length - this.precision);
    const fracPart = s.slice(s.length - this.precision);
    return `${intPart}.${fracPart} ${this.symbol}`;
  }
  toJSON(): string { return this.toString(); }

  private requireSameSymbol(other: Asset<AssetSymbol>): void {
    if (this.symbol !== other.symbol) {
      throw new VizValidationError({
        field: 'asset.symbol',
        expected: this.symbol,
        received: other.symbol,
      });
    }
  }
}

export const viz = (value: string): Asset<'VIZ'> => Asset.parse<'VIZ'>(`${value} VIZ`);
export const shares = (value: string): Asset<'SHARES'> => Asset.parse<'SHARES'>(`${value} SHARES`);
```

- [ ] **Step 4: Run test**

Run: `pnpm test test/unit/asset.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/asset.ts test/unit/asset.test.ts
git commit -m "feat: add Asset<S> class with viz()/shares() factories"
```

---

## Task 6: Operation registry (single source of truth)

**Files:**
- Create: `src/ops/registry.ts`
- Create: `test/unit/registry.test.ts`

The registry is the spine of the type system. Long-tail ops are typed even if not curated.

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/registry.test.ts
import { describe, it, expectTypeOf } from 'vitest';
import type { OperationMap, OperationName, OperationParams, Operation } from '../../src/ops/registry';

describe('operation registry', () => {
  it('exposes curated v1 op shapes', () => {
    expectTypeOf<OperationParams<'transfer'>>().toMatchTypeOf<{
      from: string; to: string; amount: unknown; memo?: string;
    }>();
    expectTypeOf<OperationParams<'award'>>().toMatchTypeOf<{
      initiator: string; receiver: string; energy: number;
    }>();
    expectTypeOf<OperationParams<'custom'>>().toMatchTypeOf<{
      id: string; json: string;
    }>();
  });

  it('exposes long-tail ops', () => {
    expectTypeOf<OperationName>().toMatchTypeOf<'vote' | 'content' | 'proposal_create'>();
  });

  it('Operation<T> is a tagged 2-tuple', () => {
    expectTypeOf<Operation<'transfer'>>().toMatchTypeOf<readonly ['transfer', OperationParams<'transfer'>]>();
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm test test/unit/registry.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/ops/registry.ts`**

```ts
import type { AccountName, AssetInput, Authority, Beneficiary, PublicKey } from '../types';

export interface OperationMap {
  // ─── Curated v1 ─────────────────────────────────────────────
  transfer: {
    from: AccountName;
    to: AccountName;
    amount: AssetInput<'VIZ'>;
    memo?: string;
  };
  transfer_to_vesting: {
    from: AccountName;
    to: AccountName;
    amount: AssetInput<'VIZ'>;
  };
  withdraw_vesting: {
    account: AccountName;
    vestingShares: AssetInput<'SHARES'>;
  };
  delegate_vesting_shares: {
    delegator: AccountName;
    delegatee: AccountName;
    vestingShares: AssetInput<'SHARES'>;
  };
  account_witness_vote: {
    account: AccountName;
    witness: AccountName;
    approve: boolean;
  };
  award: {
    initiator: AccountName;
    receiver: AccountName;
    energy: number;
    customSequence?: number;
    memo?: string;
    beneficiaries?: Beneficiary[];
  };
  custom: {
    requiredActiveAuths?: AccountName[];
    requiredRegularAuths?: AccountName[];
    id: string;
    json: string;
  };

  // ─── Long-tail (typed; reachable via tx().op()) ─────────────
  vote: {
    voter: AccountName;
    author: AccountName;
    permlink: string;
    weight: number;
  };
  content: {
    parentAuthor?: AccountName;
    parentPermlink: string;
    author: AccountName;
    permlink: string;
    title: string;
    body: string;
    jsonMetadata?: string;
    curationPercent?: number;
  };
  delete_content: { author: AccountName; permlink: string };
  account_update: {
    account: AccountName;
    owner?: Authority;
    active?: Authority;
    regular?: Authority;
    memoKey?: PublicKey;
    jsonMetadata?: string;
  };
  account_metadata: { account: AccountName; jsonMetadata: string };
  account_create: {
    fee: AssetInput<'VIZ'>;
    creator: AccountName;
    newAccountName: AccountName;
    owner: Authority;
    active: Authority;
    regular: Authority;
    memoKey: PublicKey;
    jsonMetadata: string;
    referrer?: AccountName;
  };
  set_withdraw_vesting_route: {
    fromAccount: AccountName;
    toAccount: AccountName;
    percent: number;
    autoVest: boolean;
  };
  account_witness_proxy: { account: AccountName; proxy: AccountName | '' };
  witness_update: {
    owner: AccountName;
    url: string;
    blockSigningKey: PublicKey;
  };
  chain_properties_update: {
    owner: AccountName;
    props: Record<string, unknown>;
  };
  versioned_chain_properties_update: {
    owner: AccountName;
    props: { version: number } & Record<string, unknown>;
  };
  proposal_create: {
    author: AccountName;
    title: string;
    memo?: string;
    expirationTime: string;
    proposedOperations: ReadonlyArray<readonly [string, Record<string, unknown>]>;
    reviewPeriodTime?: string;
  };
  proposal_update: {
    author: AccountName;
    title: string;
    activeApprovalsToAdd?: AccountName[];
    activeApprovalsToRemove?: AccountName[];
    ownerApprovalsToAdd?: AccountName[];
    ownerApprovalsToRemove?: AccountName[];
    keyApprovalsToAdd?: PublicKey[];
    keyApprovalsToRemove?: PublicKey[];
  };
  proposal_delete: { author: AccountName; title: string; requester: AccountName };
  escrow_transfer: {
    from: AccountName;
    to: AccountName;
    agent: AccountName;
    escrowId: number;
    fee: AssetInput<'VIZ'>;
    tokenAmount: AssetInput<'VIZ'>;
    ratificationDeadline: string;
    escrowExpiration: string;
    jsonMeta?: string;
  };
  escrow_dispute: {
    from: AccountName;
    to: AccountName;
    agent: AccountName;
    who: AccountName;
    escrowId: number;
  };
  escrow_release: {
    from: AccountName;
    to: AccountName;
    agent: AccountName;
    who: AccountName;
    receiver: AccountName;
    escrowId: number;
    tokenAmount: AssetInput<'VIZ'>;
  };
  escrow_approve: {
    from: AccountName;
    to: AccountName;
    agent: AccountName;
    who: AccountName;
    escrowId: number;
    approve: boolean;
  };
  committee_worker_create_request: {
    creator: AccountName;
    url: string;
    workerAccount: AccountName;
    requiredAmountMin: AssetInput<'VIZ'>;
    requiredAmountMax: AssetInput<'VIZ'>;
    durationOfPaymentInDays: number;
    durationOfWorkInDays: number;
    paymentBeginsInDays: number;
  };
  committee_worker_cancel_request: { creator: AccountName; requestId: number };
  committee_vote_request: { voter: AccountName; requestId: number; voteId: number };
  paid_subscribe: {
    subscriber: AccountName;
    author: AccountName;
    level: number;
    amount: AssetInput<'VIZ'>;
    period: number;
    autoRenewal: boolean;
  };
  set_paid_subscription: {
    account: AccountName;
    url: string;
    levels: number;
    amount: AssetInput<'VIZ'>;
    period: number;
  };
  create_invite: { creator: AccountName; balance: AssetInput<'VIZ'>; inviteKey: PublicKey };
  claim_invite_balance: { initiator: AccountName; receiver: AccountName; inviteSecret: string };
  invite_registration: { initiator: AccountName; newAccountName: AccountName; inviteSecret: string; newAccountKey: PublicKey };
  use_invite_balance: { initiator: AccountName; receiver: AccountName; inviteSecret: string };
  request_account_recovery: {
    recoveryAccount: AccountName;
    accountToRecover: AccountName;
    newOwnerAuthority: Authority;
  };
  recover_account: {
    accountToRecover: AccountName;
    newOwnerAuthority: Authority;
    recentOwnerAuthority: Authority;
  };
  change_recovery_account: {
    accountToRecover: AccountName;
    newRecoveryAccount: AccountName;
  };
  fixed_award: {
    initiator: AccountName;
    receiver: AccountName;
    rewardAmount: AssetInput<'SHARES'>;
    maxEnergy: number;
    customSequence?: number;
    memo?: string;
    beneficiaries?: Beneficiary[];
  };
  set_account_price: {
    account: AccountName;
    accountSeller: AccountName;
    accountOfferPrice: AssetInput<'VIZ'>;
    accountOnSale: boolean;
  };
  set_subaccount_price: {
    account: AccountName;
    subaccountSeller: AccountName;
    subaccountOfferPrice: AssetInput<'VIZ'>;
    subaccountOnSale: boolean;
  };
  buy_account: {
    buyer: AccountName;
    account: AccountName;
    accountOfferPrice: AssetInput<'VIZ'>;
    accountAuthoritiesKey: PublicKey;
    tokensToShares: AssetInput<'VIZ'>;
  };
  target_account_sale: { account: AccountName; targetBuyer: AccountName };
}

export type OperationName = keyof OperationMap;
export type OperationParams<T extends OperationName> = OperationMap[T];
export type Operation<T extends OperationName = OperationName> =
  { [K in T]: readonly [K, OperationMap[K]] }[T];

export const OP_NAMES: ReadonlyArray<OperationName> = [
  'transfer', 'transfer_to_vesting', 'withdraw_vesting',
  'delegate_vesting_shares', 'account_witness_vote', 'award', 'custom',
  'vote', 'content', 'delete_content',
  'account_update', 'account_metadata', 'account_create',
  'set_withdraw_vesting_route', 'account_witness_proxy', 'witness_update',
  'chain_properties_update', 'versioned_chain_properties_update',
  'proposal_create', 'proposal_update', 'proposal_delete',
  'escrow_transfer', 'escrow_dispute', 'escrow_release', 'escrow_approve',
  'committee_worker_create_request', 'committee_worker_cancel_request', 'committee_vote_request',
  'paid_subscribe', 'set_paid_subscription',
  'create_invite', 'claim_invite_balance', 'invite_registration', 'use_invite_balance',
  'request_account_recovery', 'recover_account', 'change_recovery_account',
  'fixed_award', 'set_account_price', 'set_subaccount_price', 'buy_account', 'target_account_sale',
];
```

- [ ] **Step 4: Run test**

Run: `pnpm test test/unit/registry.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ops/registry.ts test/unit/registry.test.ts
git commit -m "feat: add operation registry as single source of truth"
```

---

## Task 7: Config & defaults

**Files:**
- Create: `src/config.ts`
- Create: `test/unit/config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/config.test.ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_ENDPOINT, DEFAULT_TIMEOUT_MS, DEFAULT_EXPIRATION_SEC, normalizeOptions } from '../../src/config';

describe('config', () => {
  it('exposes DEFAULT_ENDPOINT https://node.viz.cx', () => {
    expect(DEFAULT_ENDPOINT).toBe('https://node.viz.cx');
  });

  it('normalizeOptions fills defaults', () => {
    const o = normalizeOptions({});
    expect(o.endpoint).toBe('https://node.viz.cx');
    expect(o.timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
    expect(o.expirationSec).toBe(DEFAULT_EXPIRATION_SEC);
  });

  it('normalizeOptions preserves overrides', () => {
    const o = normalizeOptions({ endpoint: 'https://x.test', timeoutMs: 5000 });
    expect(o.endpoint).toBe('https://x.test');
    expect(o.timeoutMs).toBe(5000);
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm test test/unit/config.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/config.ts`**

```ts
import type { AccountName, Wif } from './types';

export const DEFAULT_ENDPOINT = 'https://node.viz.cx';
export const DEFAULT_TIMEOUT_MS = 15_000;
export const DEFAULT_EXPIRATION_SEC = 30;

export interface ClientOptions {
  endpoint?: string;
  account?: AccountName | string;
  activeKey?: Wif | string;
  timeoutMs?: number;
  expirationSec?: number;
}

export interface NormalizedOptions {
  endpoint: string;
  account?: string;
  activeKey?: string;
  timeoutMs: number;
  expirationSec: number;
}

export function normalizeOptions(opts: ClientOptions): NormalizedOptions {
  return {
    endpoint: opts.endpoint ?? DEFAULT_ENDPOINT,
    account: opts.account,
    activeKey: opts.activeKey,
    timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    expirationSec: opts.expirationSec ?? DEFAULT_EXPIRATION_SEC,
  };
}
```

- [ ] **Step 4: Run test**

Run: `pnpm test test/unit/config.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/config.ts test/unit/config.test.ts
git commit -m "feat: add ClientOptions normalization with defaults"
```

---

## Task 8: HTTP transport (raw JSON-RPC; no `viz-js-lib` import)

**Files:**
- Create: `src/transport.ts`
- Create: `test/unit/transport.test.ts`

The transport speaks raw JSON-RPC against the VIZ node. It does NOT import `viz-js-lib` — keeping this file `viz-js-lib`-free is what makes the bundle stay small and the upstream surface contained to `auth.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/transport.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createHttpTransport } from '../../src/transport';
import { VizRpcError, VizTransportError } from '../../src/errors';

describe('createHttpTransport', () => {
  it('issues a JSON-RPC POST and returns the result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: { ok: true } }),
    });
    const t = createHttpTransport('https://node.test', { fetch: fetchMock as unknown as typeof fetch });
    const r = await t.call('database_api.get_dynamic_global_properties', []);
    expect(r).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://node.test');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.method).toBe('database_api.get_dynamic_global_properties');
    expect(body.params).toEqual([]);
  });

  it('throws VizRpcError when result has error payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'bad', data: 'detail' } }),
    });
    const t = createHttpTransport('https://node.test', { fetch: fetchMock as unknown as typeof fetch });
    await expect(t.call('some.method', [])).rejects.toBeInstanceOf(VizRpcError);
  });

  it('throws VizTransportError on non-2xx', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'oops', text: async () => 'err' });
    const t = createHttpTransport('https://node.test', { fetch: fetchMock as unknown as typeof fetch });
    await expect(t.call('x', [])).rejects.toBeInstanceOf(VizTransportError);
  });

  it('throws VizTransportError on fetch failure', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('econnrefused'));
    const t = createHttpTransport('https://node.test', { fetch: fetchMock as unknown as typeof fetch });
    await expect(t.call('x', [])).rejects.toBeInstanceOf(VizTransportError);
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm test test/unit/transport.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/transport.ts`**

```ts
import { VizRpcError, VizTransportError } from './errors';
import type { SignedTransaction, TransactionResult } from './types';

export interface Transport {
  call<T = unknown>(method: string, params: unknown[]): Promise<T>;
  broadcast(signed: SignedTransaction): Promise<TransactionResult>;
}

export interface HttpTransportOptions {
  timeoutMs?: number;
  fetch?: typeof fetch;
}

interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

export function createHttpTransport(endpoint: string, opts: HttpTransportOptions = {}): Transport {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const fetchFn = opts.fetch ?? fetch;
  let nextId = 1;

  async function call<T>(method: string, params: unknown[]): Promise<T> {
    const id = nextId++;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetchFn(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
        signal: ac.signal,
      });
    } catch (e) {
      throw new VizTransportError({ message: `Transport failed for ${method}`, cause: e });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new VizTransportError({
        message: `HTTP ${res.status} ${res.statusText} on ${method}`,
      });
    }

    let body: JsonRpcResponse<T>;
    try {
      body = (await res.json()) as JsonRpcResponse<T>;
    } catch (e) {
      throw new VizTransportError({ message: `Malformed JSON for ${method}`, cause: e });
    }

    if (body.error) {
      throw new VizRpcError({
        code: body.error.code,
        method,
        data: body.error.data,
        message: body.error.message,
      });
    }
    if (body.result === undefined) {
      throw new VizTransportError({ message: `Empty result for ${method}` });
    }
    return body.result;
  }

  async function broadcast(signed: SignedTransaction): Promise<TransactionResult> {
    const r = await call<{ id: string; block_num: number; expiration: string }>(
      'network_broadcast_api.broadcast_transaction_synchronous',
      [signed],
    );
    return { id: r.id, blockNum: r.block_num, expiration: r.expiration };
  }

  return { call, broadcast };
}
```

- [ ] **Step 4: Run test**

Run: `pnpm test test/unit/transport.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/transport.ts test/unit/transport.test.ts
git commit -m "feat: add HTTP JSON-RPC transport with error mapping"
```

---

## Task 9: Auth utilities (`keys.*`)

**Files:**
- Create: `src/auth.ts`
- Create: `test/unit/auth.test.ts`

This file imports `viz-js-lib` and flattens its `auth.*` namespace into a typed `keys` object.

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/auth.test.ts
import { describe, it, expect } from 'vitest';
import { keys } from '../../src/auth';

describe('keys', () => {
  it('fromPassword(account, password) returns full key set', () => {
    const ks = keys.fromPassword('alice', 'p4ssw0rd-test-only');
    expect(typeof ks.owner).toBe('string');
    expect(typeof ks.active).toBe('string');
    expect(typeof ks.regular).toBe('string');
    expect(typeof ks.memo).toBe('string');
    expect(ks.owner.startsWith('5')).toBe(true);
  });

  it('fromPassword(account, password, role) returns single WIF', () => {
    const k = keys.fromPassword('alice', 'p4ssw0rd-test-only', 'active');
    expect(typeof k).toBe('string');
    expect(k.startsWith('5')).toBe(true);
  });

  it('toPublic(wif) returns VIZ-prefixed public key', () => {
    const wif = keys.fromPassword('alice', 'p4ssw0rd-test-only', 'active');
    const pub = keys.toPublic(wif);
    expect(pub.startsWith('VIZ')).toBe(true);
  });

  it('isWif and isPubkey type guards', () => {
    const wif = keys.fromPassword('alice', 'p4ssw0rd-test-only', 'active');
    expect(keys.isWif(wif)).toBe(true);
    expect(keys.isWif('not-a-wif')).toBe(false);
    expect(keys.isPubkey(keys.toPublic(wif))).toBe(true);
  });

  it('generate() returns wif and pub', () => {
    const { wif, pub } = keys.generate();
    expect(wif.startsWith('5')).toBe(true);
    expect(pub.startsWith('VIZ')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm test test/unit/auth.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/auth.ts`**

```ts
// eslint-disable-next-line viz-cx/no-direct-viz-js-lib  -- intentional adapter seam
import vizJs from 'viz-js-lib';
import type { PublicKey, Wif } from './types';
import { VizValidationError } from './errors';

type Role = 'owner' | 'active' | 'regular' | 'memo';
const ROLES: ReadonlyArray<Role> = ['owner', 'active', 'regular', 'memo'];

interface KeySet {
  owner: Wif;
  active: Wif;
  regular: Wif;
  memo: Wif;
}

interface VizAuth {
  getPrivateKeys(account: string, password: string, roles: ReadonlyArray<Role>): Record<string, string>;
  wifToPublic(wif: string): string;
  isWif(s: string): boolean;
  isPubkey(s: string): boolean;
  signature: { sign(buf: Buffer | Uint8Array, wif: string): string; verify(buf: Buffer | Uint8Array, sig: string, pub: string): boolean };
}

const auth: VizAuth = (vizJs as unknown as { auth: VizAuth }).auth;

function fromPassword(account: string, password: string): KeySet;
function fromPassword(account: string, password: string, role: Role): Wif;
function fromPassword(account: string, password: string, role?: Role): Wif | KeySet {
  if (role !== undefined && !ROLES.includes(role)) {
    throw new VizValidationError({ field: 'role', expected: ROLES.join('|'), received: role });
  }
  const map = auth.getPrivateKeys(account, password, role ? [role] : ROLES);
  if (role) {
    const w = map[role];
    if (!w) throw new VizValidationError({ field: 'role', expected: 'derivable WIF', received: role });
    return w as Wif;
  }
  return {
    owner:   map.owner   as Wif,
    active:  map.active  as Wif,
    regular: map.regular as Wif,
    memo:    map.memo    as Wif,
  };
}

function toPublic(w: Wif | string): PublicKey {
  return auth.wifToPublic(w) as PublicKey;
}

function generate(): { wif: Wif; pub: PublicKey } {
  // Use a high-entropy random seed; rely on upstream's key-derivation correctness.
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const seed = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const wif = auth.getPrivateKeys('seed', seed, ['active']).active as Wif;
  return { wif, pub: toPublic(wif) };
}

function isWif(s: unknown): s is Wif {
  return typeof s === 'string' && auth.isWif(s);
}

function isPubkey(s: unknown): s is PublicKey {
  return typeof s === 'string' && auth.isPubkey(s);
}

function sign(buf: Uint8Array, w: Wif | string): string {
  return auth.signature.sign(buf, w);
}

function verify(buf: Uint8Array, sig: string, pub: PublicKey | string): boolean {
  return auth.signature.verify(buf, sig, pub);
}

export const keys = { fromPassword, toPublic, generate, isWif, isPubkey, sign, verify };
export type { KeySet, Role };
```

- [ ] **Step 4: Run test**

Run: `pnpm test test/unit/auth.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/auth.ts test/unit/auth.test.ts
git commit -m "feat: add keys.* utilities (thin wrapper over viz-js-lib auth)"
```

---

## Task 10: Tx builder & `sign()`

**Files:**
- Create: `src/tx.ts`
- Create: `test/unit/tx.test.ts`

The builder collects ops, fetches `ref_block_num` / `ref_block_prefix` / dynamic global properties from the transport, computes `expiration`, and produces an `UnsignedTransaction`. Signing delegates to `viz-js-lib`'s `auth.transaction.sign` to avoid reimplementing canonical byte layout.

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/tx.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createTxBuilder } from '../../src/tx';
import type { Transport } from '../../src/transport';

const fakeTransport = (overrides: Partial<Transport> = {}): Transport => ({
  call: vi.fn().mockImplementation(async (method: string) => {
    if (method === 'database_api.get_dynamic_global_properties') {
      return { head_block_id: '00000010abcdef1234567890', head_block_number: 16, time: '2026-05-02T00:00:00' };
    }
    return null;
  }) as Transport['call'],
  broadcast: vi.fn().mockResolvedValue({ id: 'txid', blockNum: 17, expiration: '2026-05-02T00:00:30' }),
  ...overrides,
});

describe('TxBuilder', () => {
  it('build() emits ops as tagged tuples', async () => {
    const t = fakeTransport();
    const tx = await createTxBuilder({ transport: t, expirationSec: 30 })
      .transfer({ from: 'alice', to: 'bob', amount: '1.000 VIZ' })
      .build();
    expect(tx.operations).toHaveLength(1);
    expect(tx.operations[0]![0]).toBe('transfer');
    expect(tx.operations[0]![1]).toMatchObject({ from: 'alice', to: 'bob', amount: '1.000 VIZ' });
    expect(typeof tx.refBlockNum).toBe('number');
    expect(typeof tx.refBlockPrefix).toBe('number');
    expect(typeof tx.expiration).toBe('string');
  });

  it('op() typed escape hatch produces tagged tuple', async () => {
    const tx = await createTxBuilder({ transport: fakeTransport(), expirationSec: 30 })
      .op('committee_vote_request', { voter: 'alice', requestId: 1, voteId: 1 })
      .build();
    expect(tx.operations[0]![0]).toBe('committee_vote_request');
  });

  it('Asset inputs normalize to wire string', async () => {
    const tx = await createTxBuilder({ transport: fakeTransport(), expirationSec: 30 })
      .transfer({ from: 'alice', to: 'bob', amount: '2.500 VIZ' })
      .build();
    expect((tx.operations[0]![1] as { amount: string }).amount).toBe('2.500 VIZ');
  });

  it('rejects empty op list', async () => {
    await expect(createTxBuilder({ transport: fakeTransport(), expirationSec: 30 }).build())
      .rejects.toThrow(/at least one operation/i);
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm test test/unit/tx.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/tx.ts`**

```ts
// eslint-disable-next-line viz-cx/no-direct-viz-js-lib  -- intentional adapter seam
import vizJs from 'viz-js-lib';
import { Asset } from './asset';
import { VizValidationError } from './errors';
import type { Transport } from './transport';
import type {
  AssetInput,
  AssetSymbol,
  SignedTransaction,
  TransactionResult,
  UnsignedTransaction,
  Wif,
} from './types';
import type { OperationMap, OperationName, OperationParams } from './ops/registry';

type WireOp = readonly [string, Record<string, unknown>];

export interface TxBuilderOptions {
  transport: Transport;
  expirationSec: number;
}

export interface TxBuilder {
  op<T extends OperationName>(name: T, params: OperationParams<T>): TxBuilder;
  transfer(p: OperationParams<'transfer'>): TxBuilder;
  transferToVesting(p: OperationParams<'transfer_to_vesting'>): TxBuilder;
  withdrawVesting(p: OperationParams<'withdraw_vesting'>): TxBuilder;
  delegateVestingShares(p: OperationParams<'delegate_vesting_shares'>): TxBuilder;
  accountWitnessVote(p: OperationParams<'account_witness_vote'>): TxBuilder;
  award(p: OperationParams<'award'>): TxBuilder;
  custom(p: OperationParams<'custom'>): TxBuilder;
  build(): Promise<UnsignedTransaction>;
  sign(key: Wif | string): SignedTxBuilder;
}

export interface SignedTxBuilder {
  toJSON(): Promise<SignedTransaction>;
  broadcast(): Promise<TransactionResult>;
}

const ASSET_SYMBOL_FIELDS: Record<string, AssetSymbol> = {
  amount: 'VIZ',
  vestingShares: 'SHARES',
  fee: 'VIZ',
  tokenAmount: 'VIZ',
  rewardAmount: 'SHARES',
  balance: 'VIZ',
  accountOfferPrice: 'VIZ',
  subaccountOfferPrice: 'VIZ',
  tokensToShares: 'VIZ',
  requiredAmountMin: 'VIZ',
  requiredAmountMax: 'VIZ',
};

function normalizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    const sym = ASSET_SYMBOL_FIELDS[k];
    if (sym && (typeof v === 'string' || v instanceof Asset || (v && typeof v === 'object' && 'value' in v))) {
      out[k] = Asset.from(v as AssetInput, sym).toString();
    } else {
      out[k] = v;
    }
  }
  return out;
}

function refBlockNumFromHeadId(headBlockId: string): number {
  const numHex = headBlockId.slice(0, 8);
  return parseInt(numHex, 16) & 0xffff;
}

function refBlockPrefixFromHeadId(headBlockId: string): number {
  const prefixHex = headBlockId.slice(8, 16);
  const swapped = prefixHex.match(/.{2}/g)!.reverse().join('');
  return parseInt(swapped, 16) >>> 0;
}

function plusSeconds(iso: string, sec: number): string {
  const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'));
  return new Date(d.getTime() + sec * 1000).toISOString().replace(/\.\d{3}Z$/, '');
}

interface VizAuthTx {
  signTransaction(tx: object, keys: string[]): { signatures: string[] };
}
const txAuth: VizAuthTx = (vizJs as unknown as { auth: VizAuthTx }).auth;

export function createTxBuilder(opts: TxBuilderOptions): TxBuilder {
  const ops: WireOp[] = [];

  const builder: TxBuilder = {
    op<T extends OperationName>(name: T, params: OperationParams<T>): TxBuilder {
      ops.push([name as string, normalizeParams(params as Record<string, unknown>)]);
      return builder;
    },
    transfer:                (p) => builder.op('transfer', p),
    transferToVesting:       (p) => builder.op('transfer_to_vesting', p),
    withdrawVesting:         (p) => builder.op('withdraw_vesting', p),
    delegateVestingShares:   (p) => builder.op('delegate_vesting_shares', p),
    accountWitnessVote:      (p) => builder.op('account_witness_vote', p),
    award:                   (p) => builder.op('award', p),
    custom:                  (p) => builder.op('custom', p),

    async build() {
      if (ops.length === 0) {
        throw new VizValidationError({ field: 'operations', expected: 'at least one operation', received: 0 });
      }
      const dgp = await opts.transport.call<{ head_block_id: string; time: string }>(
        'database_api.get_dynamic_global_properties',
        [],
      );
      return {
        refBlockNum: refBlockNumFromHeadId(dgp.head_block_id),
        refBlockPrefix: refBlockPrefixFromHeadId(dgp.head_block_id),
        expiration: plusSeconds(dgp.time, opts.expirationSec),
        operations: ops.slice(),
        extensions: [],
      };
    },

    sign(key) {
      let cached: Promise<SignedTransaction> | null = null;
      const signed = (): Promise<SignedTransaction> => {
        if (!cached) {
          cached = (async () => {
            const tx = await builder.build();
            const wire = {
              ref_block_num: tx.refBlockNum,
              ref_block_prefix: tx.refBlockPrefix,
              expiration: tx.expiration,
              operations: tx.operations,
              extensions: tx.extensions,
            };
            const { signatures } = txAuth.signTransaction(wire, [key]);
            return { ...tx, signatures };
          })();
        }
        return cached;
      };
      return {
        async toJSON() { return signed(); },
        async broadcast() {
          const s = await signed();
          return opts.transport.broadcast(s);
        },
      };
    },
  };
  return builder;
}

export async function sign(
  tx: UnsignedTransaction,
  options: { activeKey: Wif | string },
): Promise<SignedTransaction> {
  const wire = {
    ref_block_num: tx.refBlockNum,
    ref_block_prefix: tx.refBlockPrefix,
    expiration: tx.expiration,
    operations: tx.operations,
    extensions: tx.extensions,
  };
  const { signatures } = txAuth.signTransaction(wire, [options.activeKey]);
  return { ...tx, signatures };
}
```

- [ ] **Step 4: Run test**

Run: `pnpm test test/unit/tx.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tx.ts test/unit/tx.test.ts
git commit -m "feat: add TxBuilder pipeline and pure sign() function"
```

---

## Task 11: Curated method types (derived) & raw escape hatch

**Files:**
- Create: `src/ops/curated.ts`
- Create: `src/ops/raw.ts`

There's no separate test file — these are types-and-implementations consumed by `client.ts`. Behavior is verified through `client.test.ts` (Task 13) and `tsd` tests (Task 16).

- [ ] **Step 1: Implement `src/ops/curated.ts`**

```ts
import type { OperationMap, OperationName } from './registry';
import type { TransactionResult } from '../types';

export type CuratedMethod<Op extends OperationName, Implicit extends keyof OperationMap[Op]> =
  (args: Omit<OperationMap[Op], Implicit>) => Promise<TransactionResult>;

export interface CuratedClient {
  transfer:              CuratedMethod<'transfer',                'from'>;
  transferToVesting:     CuratedMethod<'transfer_to_vesting',     'from'>;
  withdrawVesting:       CuratedMethod<'withdraw_vesting',        'account'>;
  delegateVestingShares: CuratedMethod<'delegate_vesting_shares', 'delegator'>;
  accountWitnessVote:    CuratedMethod<'account_witness_vote',    'account'>;
  award:                 CuratedMethod<'award',                   'initiator'>;
  custom:                CuratedMethod<'custom',                  never>;
}

export interface CuratedFieldMap {
  transfer: 'from';
  transfer_to_vesting: 'from';
  withdraw_vesting: 'account';
  delegate_vesting_shares: 'delegator';
  account_witness_vote: 'account';
  award: 'initiator';
}

export const CURATED_METHOD_TO_OP: Record<keyof CuratedClient, OperationName> = {
  transfer: 'transfer',
  transferToVesting: 'transfer_to_vesting',
  withdrawVesting: 'withdraw_vesting',
  delegateVestingShares: 'delegate_vesting_shares',
  accountWitnessVote: 'account_witness_vote',
  award: 'award',
  custom: 'custom',
};

export const CURATED_IMPLICIT_FIELD: Partial<Record<keyof CuratedClient, string>> = {
  transfer: 'from',
  transferToVesting: 'from',
  withdrawVesting: 'account',
  delegateVestingShares: 'delegator',
  accountWitnessVote: 'account',
  award: 'initiator',
};
```

- [ ] **Step 2: Implement `src/ops/raw.ts`**

```ts
import type { OperationName, OperationParams } from './registry';

export interface RawTxOp {
  op<T extends OperationName>(name: T, params: OperationParams<T>): this;
}
```

- [ ] **Step 3: Verify the project still compiles**

Run: `pnpm lint:types`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ops/curated.ts src/ops/raw.ts
git commit -m "feat: derive curated method types from operation registry"
```

---

## Task 12: Read API (`client.api.*`)

**Files:**
- Create: `src/api.ts`
- Create: `test/unit/api.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/api.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createReadApi } from '../../src/api';
import type { Transport } from '../../src/transport';

describe('ReadApi', () => {
  it('getAccounts maps to database_api.get_accounts', async () => {
    const call = vi.fn().mockResolvedValue([{ name: 'alice' }]);
    const t: Transport = { call, broadcast: vi.fn() };
    const api = createReadApi(t);
    const r = await api.getAccounts(['alice']);
    expect(call).toHaveBeenCalledWith('database_api.get_accounts', [['alice']]);
    expect(r).toEqual([{ name: 'alice' }]);
  });

  it('getDynamicGlobalProperties maps correctly', async () => {
    const call = vi.fn().mockResolvedValue({ head_block_number: 100 });
    const t: Transport = { call, broadcast: vi.fn() };
    const api = createReadApi(t);
    await api.getDynamicGlobalProperties();
    expect(call).toHaveBeenCalledWith('database_api.get_dynamic_global_properties', []);
  });

  it('getBlock maps with positional args', async () => {
    const call = vi.fn().mockResolvedValue(null);
    const t: Transport = { call, broadcast: vi.fn() };
    const api = createReadApi(t);
    await api.getBlock(12345);
    expect(call).toHaveBeenCalledWith('database_api.get_block', [12345]);
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm test test/unit/api.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/api.ts`**

```ts
import type { Transport } from './transport';
import type { AccountName } from './types';

export interface DynamicGlobalProperties {
  head_block_number: number;
  head_block_id: string;
  time: string;
  current_witness: string;
  total_pow?: number;
  total_vesting_fund?: string;
  total_vesting_shares?: string;
  [k: string]: unknown;
}

export interface Account {
  id: number;
  name: AccountName;
  owner: unknown;
  active: unknown;
  regular: unknown;
  memo_key: string;
  json_metadata: string;
  balance: string;
  vesting_shares: string;
  energy: number;
  [k: string]: unknown;
}

export interface Block {
  previous: string;
  timestamp: string;
  witness: string;
  transaction_merkle_root: string;
  extensions: unknown[];
  witness_signature: string;
  transactions: unknown[];
  block_id: string;
  signing_key: string;
  transaction_ids: string[];
  [k: string]: unknown;
}

export type AccountHistoryItem = {
  trx_id: string;
  block: number;
  trx_in_block: number;
  op_in_trx: number;
  virtual_op: number;
  timestamp: string;
  op: readonly [string, Record<string, unknown>];
};

export interface ReadApi {
  getDynamicGlobalProperties(): Promise<DynamicGlobalProperties>;
  getAccounts(names: ReadonlyArray<AccountName | string>): Promise<Account[]>;
  lookupAccountNames(names: ReadonlyArray<AccountName | string>): Promise<(Account | null)[]>;
  getBlock(blockNum: number): Promise<Block | null>;
  getBlockHeader(blockNum: number): Promise<Pick<Block, 'previous' | 'timestamp' | 'witness'> | null>;
  getAccountHistory(name: AccountName | string, from: number, limit: number): Promise<Array<readonly [number, AccountHistoryItem]>>;
  getOpsInBlock(blockNum: number, onlyVirtual: boolean): Promise<AccountHistoryItem[]>;
  getKeyReferences(keys: string[]): Promise<string[][]>;
  getWitnessByAccount(account: AccountName | string): Promise<unknown>;
  getActiveWitnesses(): Promise<string[]>;
}

export function createReadApi(t: Transport): ReadApi {
  return {
    getDynamicGlobalProperties: () => t.call('database_api.get_dynamic_global_properties', []),
    getAccounts:                (names) => t.call('database_api.get_accounts', [names.slice()]),
    lookupAccountNames:         (names) => t.call('database_api.lookup_account_names', [names.slice()]),
    getBlock:                   (n) => t.call('database_api.get_block', [n]),
    getBlockHeader:             (n) => t.call('database_api.get_block_header', [n]),
    getAccountHistory:          (n, from, limit) => t.call('account_history.get_account_history', [n, from, limit]),
    getOpsInBlock:              (n, onlyVirtual) => t.call('operation_history.get_ops_in_block', [n, onlyVirtual]),
    getKeyReferences:           (keys) => t.call('account_by_key.get_key_references', [keys]),
    getWitnessByAccount:        (a) => t.call('witness_api.get_witness_by_account', [a]),
    getActiveWitnesses:         () => t.call('witness_api.get_active_witnesses', []),
  };
}
```

- [ ] **Step 4: Run test**

Run: `pnpm test test/unit/api.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/api.ts test/unit/api.test.ts
git commit -m "feat: add typed read API (database/witness/account-by-key/history)"
```

---

## Task 13: `createClient()` with discriminated read/write types

**Files:**
- Create: `src/client.ts`
- Create: `test/unit/client.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/client.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createClient } from '../../src/client';
import type { Transport } from '../../src/transport';

const dgpResponse = { head_block_id: '00000010abcdef1234567890', head_block_number: 16, time: '2026-05-02T00:00:00' };

function fakeTransport(): Transport {
  const call = vi.fn().mockImplementation(async (method: string) => {
    if (method === 'database_api.get_dynamic_global_properties') return dgpResponse;
    if (method === 'database_api.get_accounts') return [{ name: 'alice' }];
    return null;
  }) as Transport['call'];
  const broadcast = vi.fn().mockResolvedValue({ id: 'tx-id', blockNum: 17, expiration: '2026-05-02T00:00:30' });
  return { call, broadcast };
}

describe('createClient', () => {
  it('returns a read-only client when no account', async () => {
    const c = createClient({ transport: fakeTransport() });
    const accounts = await c.api.getAccounts(['alice']);
    expect(accounts[0]?.name).toBe('alice');
    // @ts-expect-error transfer not present on read client
    expect(c.transfer).toBeUndefined();
  });

  it('returns a write client when account+activeKey provided', async () => {
    const c = createClient({
      account: 'alice',
      activeKey: '5JTestActiveKeyDoNotUseInProductionAtAllPleasePromise12',
      transport: fakeTransport(),
    });
    expect(typeof c.transfer).toBe('function');
    expect(typeof c.tx).toBe('function');
    expect(typeof c.broadcast).toBe('function');
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm test test/unit/client.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/client.ts`**

```ts
import type { ClientOptions } from './config';
import { normalizeOptions } from './config';
import { createHttpTransport, type Transport } from './transport';
import { createReadApi, type ReadApi } from './api';
import { createTxBuilder, sign, type TxBuilder } from './tx';
import { CURATED_METHOD_TO_OP, CURATED_IMPLICIT_FIELD, type CuratedClient } from './ops/curated';
import { VizValidationError } from './errors';
import type { SignedTransaction, TransactionResult } from './types';

export interface VizReadClient {
  api: ReadApi;
  tx(): TxBuilder;
  broadcast(signed: SignedTransaction): Promise<TransactionResult>;
}

export interface VizClient extends VizReadClient, CuratedClient {}

interface InternalOptions extends ClientOptions {
  transport?: Transport;
}

export function createClient(): VizReadClient;
export function createClient(opts: InternalOptions & { account: string; activeKey: string }): VizClient;
export function createClient(opts: InternalOptions): VizReadClient;
export function createClient(opts: InternalOptions = {}): VizReadClient | VizClient {
  const norm = normalizeOptions(opts);
  const transport = opts.transport ?? createHttpTransport(norm.endpoint, { timeoutMs: norm.timeoutMs });
  const api = createReadApi(transport);

  const txFactory = (): TxBuilder => createTxBuilder({ transport, expirationSec: norm.expirationSec });
  const broadcastFn = (signed: SignedTransaction): Promise<TransactionResult> => transport.broadcast(signed);

  const readClient: VizReadClient = {
    api,
    tx: txFactory,
    broadcast: broadcastFn,
  };

  if (!norm.account || !norm.activeKey) {
    return readClient;
  }

  const account = norm.account;
  const activeKey = norm.activeKey;

  const curated = {} as CuratedClient;
  for (const method of Object.keys(CURATED_METHOD_TO_OP) as Array<keyof CuratedClient>) {
    const opName = CURATED_METHOD_TO_OP[method];
    const implicitField = CURATED_IMPLICIT_FIELD[method];
    (curated[method] as unknown) = async (args: Record<string, unknown>) => {
      if (typeof args !== 'object' || args === null) {
        throw new VizValidationError({ field: method, expected: 'object', received: args });
      }
      const params = implicitField ? { ...args, [implicitField]: account } : args;
      const tx = await txFactory().op(opName, params as never).build();
      const signed = await sign(tx, { activeKey });
      return broadcastFn(signed);
    };
  }

  return { ...readClient, ...curated };
}
```

- [ ] **Step 4: Run test**

Run: `pnpm test test/unit/client.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/client.ts test/unit/client.test.ts
git commit -m "feat: add createClient() with read/write discrimination"
```

---

## Task 14: Public exports (`src/index.ts`)

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Implement `src/index.ts`**

```ts
export { createClient } from './client';
export type { VizClient, VizReadClient } from './client';

export { createTxBuilder, sign } from './tx';
export type { TxBuilder, SignedTxBuilder } from './tx';

export { Asset, viz, shares } from './asset';

export { keys } from './auth';
export type { KeySet, Role } from './auth';

export { createReadApi } from './api';
export type {
  ReadApi,
  Account,
  Block,
  AccountHistoryItem,
  DynamicGlobalProperties,
} from './api';

export { createHttpTransport } from './transport';
export type { Transport, HttpTransportOptions } from './transport';

export { account, publicKey, wif } from './types';
export type {
  AccountName,
  PublicKey,
  Wif,
  AssetSymbol,
  AssetInput,
  Authority,
  Beneficiary,
  Operation,
  UnsignedTransaction,
  SignedTransaction,
  TransactionResult,
} from './types';

export type {
  OperationMap,
  OperationName,
  OperationParams,
} from './ops/registry';
export { OP_NAMES } from './ops/registry';

export { VizRpcError, VizValidationError, VizTransportError } from './errors';

export {
  DEFAULT_ENDPOINT,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_EXPIRATION_SEC,
} from './config';
export type { ClientOptions } from './config';
```

- [ ] **Step 2: Build and check**

Run: `pnpm build`
Expected: produces `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, `dist/index.d.cts`.

Run: `pnpm lint:exports`
Expected: PASS — no `attw` problems flagged.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: define public surface in src/index.ts"
```

---

## Task 15: ESLint guard for `viz-js-lib` import location

**Files:**
- Create: `.eslintrc.cjs`
- Create: `eslint-rules/no-direct-viz-js-lib.cjs`

The rule prevents `import 'viz-js-lib'` outside `src/transport.ts`, `src/auth.ts`, and `src/tx.ts` (the three sanctioned adapter seams).

- [ ] **Step 1: Write `eslint-rules/no-direct-viz-js-lib.cjs`**

```js
'use strict';
const path = require('node:path');

const ALLOWED = new Set([
  path.normalize('src/transport.ts'),
  path.normalize('src/auth.ts'),
  path.normalize('src/tx.ts'),
]);

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: "Restrict viz-js-lib imports to adapter seam files" },
    schema: [],
    messages: {
      forbidden: "Importing 'viz-js-lib' is allowed only in transport.ts/auth.ts/tx.ts",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value !== 'viz-js-lib') return;
        const filename = path.relative(process.cwd(), context.getFilename());
        if (!ALLOWED.has(filename)) {
          context.report({ node, messageId: 'forbidden' });
        }
      },
    };
  },
};
```

- [ ] **Step 2: Write `.eslintrc.cjs`**

```js
'use strict';
const localRule = require('./eslint-rules/no-direct-viz-js-lib.cjs');

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'viz-cx'],
  rules: {
    'viz-cx/no-direct-viz-js-lib': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  overrides: [
    { files: ['scripts/**/*.mjs', 'examples/**/*'], rules: { '@typescript-eslint/no-unused-vars': 'off' } },
    { files: ['test/**/*.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
  ],
  settings: {
    'viz-cx': {},
  },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/', '.pack-tmp/'],
};
```

> The local plugin is registered via the `--rulesdir` flag; alternatively use `eslint-plugin-local-rules`. Add to `lint` script: `eslint . --ext .ts --rulesdir ./eslint-rules`.

- [ ] **Step 3: Update `lint` script in `package.json`**

```jsonc
"lint": "eslint . --ext .ts --rulesdir ./eslint-rules"
```

- [ ] **Step 4: Run the lint**

Run: `pnpm lint`
Expected: PASS — only `transport.ts`, `auth.ts`, `tx.ts` import `viz-js-lib`, and they all carry the eslint-disable line for clarity (or are pre-allowed by the rule).

- [ ] **Step 5: Commit**

```bash
git add .eslintrc.cjs eslint-rules/no-direct-viz-js-lib.cjs package.json
git commit -m "chore: add eslint guard for viz-js-lib import seam"
```

---

## Task 16: `tsd` type-level tests

**Files:**
- Create: `test/types/createClient.test-d.ts`
- Create: `test/types/asset.test-d.ts`
- Create: `test/types/operations.test-d.ts`

- [ ] **Step 1: Write `test/types/createClient.test-d.ts`**

```ts
import { expectType, expectError, expectAssignable } from 'tsd';
import {
  createClient,
  type VizClient,
  type VizReadClient,
  type AccountName,
  type Wif,
  type TransactionResult,
} from '../../src/index';
import { viz, shares } from '../../src/index';

const reader = createClient();
expectType<VizReadClient>(reader);
expectError(reader.transfer({ to: 'bob' as AccountName, amount: '1.000 VIZ' }));

const writer = createClient({
  account: 'alice' as AccountName,
  activeKey: 'WIF' as Wif,
});
expectAssignable<VizClient>(writer);

expectType<Promise<TransactionResult>>(
  writer.transfer({ to: 'bob' as AccountName, amount: viz('1.000') }),
);

// Symbol mismatch caught
expectError(writer.transfer({ to: 'bob' as AccountName, amount: shares('1.000000') }));

// Missing required field
expectError(writer.transfer({ amount: '1.000 VIZ' }));

// `from` is implicit, must NOT be supplied to curated method
expectError(writer.transfer({ from: 'alice' as AccountName, to: 'bob' as AccountName, amount: '1.000 VIZ' }));
```

- [ ] **Step 2: Write `test/types/asset.test-d.ts`**

```ts
import { expectType, expectError } from 'tsd';
import { Asset, viz, shares } from '../../src/index';

expectType<Asset<'VIZ'>>(viz('1.000'));
expectType<Asset<'SHARES'>>(shares('1.000000'));

const a = viz('1.000');
const b = shares('1.000000');
expectError(a.add(b)); // symbol mismatch
expectType<Asset<'VIZ'>>(a.add(viz('0.500')));
```

- [ ] **Step 3: Write `test/types/operations.test-d.ts`**

```ts
import { expectType, expectAssignable } from 'tsd';
import type {
  OperationParams,
  OperationName,
  AccountName,
  AssetInput,
} from '../../src/index';

expectAssignable<OperationParams<'transfer'>>({
  from: 'alice' as AccountName,
  to: 'bob' as AccountName,
  amount: '1.000 VIZ' as AssetInput<'VIZ'>,
});

const allNames: OperationName = 'committee_vote_request';
expectType<OperationName>(allNames);
```

- [ ] **Step 4: Run tsd**

Run: `pnpm test:types`
Expected: PASS (no type errors flagged).

- [ ] **Step 5: Commit**

```bash
git add test/types
git commit -m "test: add tsd type-level tests for client, asset, ops"
```

---

## Task 17: Coverage check & integration test stub

**Files:**
- Create: `test/integration/read.test.ts`

- [ ] **Step 1: Write `test/integration/read.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { createClient } from '../../src/index';

const SKIP = process.env.VIZ_SKIP_INTEGRATION === '1';

describe.skipIf(SKIP)('integration: read against https://node.viz.cx', () => {
  it('fetches dynamic global properties', async () => {
    const client = createClient();
    let dgp;
    try {
      dgp = await client.api.getDynamicGlobalProperties();
    } catch (e) {
      console.warn('integration: endpoint unreachable, skipping', e);
      return;
    }
    expect(dgp).toBeTruthy();
    expect(typeof dgp.head_block_number).toBe('number');
    expect(typeof dgp.time).toBe('string');
  });

  it('fetches a known account', async () => {
    const client = createClient();
    let accounts;
    try {
      accounts = await client.api.getAccounts(['committee']);
    } catch (e) {
      console.warn('integration: endpoint unreachable, skipping', e);
      return;
    }
    expect(accounts.length).toBeGreaterThan(0);
    expect(accounts[0]?.name).toBe('committee');
  });
});
```

- [ ] **Step 2: Run unit coverage**

Run: `pnpm test:cov`
Expected: PASS, coverage thresholds met (>= 80 % on `asset.ts`, `errors.ts`, `tx.ts`, `client.ts`). If a threshold misses, add narrow targeted unit tests until it passes — do not lower the threshold.

- [ ] **Step 3: Run integration (best effort)**

Run: `pnpm test:integration`
Expected: PASS or warning-skip if `node.viz.cx` is unreachable.

- [ ] **Step 4: Commit**

```bash
git add test/integration
git commit -m "test: add opt-in integration smoke against node.viz.cx"
```

---

## Task 18: Consumer smoke tests (ESM + CJS)

**Files:**
- Create: `examples/esm-app/package.json`
- Create: `examples/esm-app/index.mjs`
- Create: `examples/cjs-app/package.json`
- Create: `examples/cjs-app/index.cjs`
- Create: `scripts/smoke-test.mjs`

These verify the published artifact works for both module systems.

- [ ] **Step 1: Write `examples/esm-app/package.json`**

```jsonc
{
  "name": "viz-cx-esm-smoke",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": { "start": "node index.mjs" },
  "dependencies": {}
}
```

- [ ] **Step 2: Write `examples/esm-app/index.mjs`**

```js
import { createClient, DEFAULT_ENDPOINT, viz } from '@viz-cx/core';

console.log('endpoint:', DEFAULT_ENDPOINT);
console.log('asset:', viz('1.000').toString());
const client = createClient();
console.log('client has api:', typeof client.api.getAccounts === 'function');
```

- [ ] **Step 3: Write `examples/cjs-app/package.json`**

```jsonc
{
  "name": "viz-cx-cjs-smoke",
  "version": "0.0.0",
  "private": true,
  "scripts": { "start": "node index.cjs" },
  "dependencies": {}
}
```

- [ ] **Step 4: Write `examples/cjs-app/index.cjs`**

```js
const { createClient, DEFAULT_ENDPOINT, viz } = require('@viz-cx/core');

console.log('endpoint:', DEFAULT_ENDPOINT);
console.log('asset:', viz('1.000').toString());
const client = createClient();
console.log('client has api:', typeof client.api.getAccounts === 'function');
```

- [ ] **Step 5: Write `scripts/smoke-test.mjs`**

```js
#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PACK_DIR = '.pack-tmp';
const APPS = ['examples/esm-app', 'examples/cjs-app'];

rmSync(PACK_DIR, { recursive: true, force: true });
mkdirSync(PACK_DIR, { recursive: true });

console.log('==> packing @viz-cx/core');
execFileSync('pnpm', ['pack', '--pack-destination', PACK_DIR], { stdio: 'inherit' });

const tarball = readdirSync(PACK_DIR).find((f) => f.endsWith('.tgz'));
if (!tarball) {
  console.error('No .tgz produced');
  process.exit(1);
}
const tarballPath = join(process.cwd(), PACK_DIR, tarball);
console.log('==> packed:', tarballPath, `${(statSync(tarballPath).size / 1024).toFixed(2)} KB`);

for (const app of APPS) {
  console.log(`\n==> installing into ${app}`);
  // Update the app's package.json to point at the local tarball.
  const pkgPath = join(app, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.dependencies = { ...(pkg.dependencies ?? {}), '@viz-cx/core': `file:${tarballPath}` };
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  execFileSync('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts'], { cwd: app, stdio: 'inherit' });

  console.log(`==> running ${app}`);
  execFileSync('npm', ['run', 'start'], { cwd: app, stdio: 'inherit' });
}

console.log('\nsmoke OK');
```

- [ ] **Step 6: Run the smoke locally**

Run: `pnpm build && pnpm smoke`
Expected: both apps print the endpoint, asset, and `client has api: true`.

- [ ] **Step 7: Commit**

```bash
git add examples scripts/smoke-test.mjs
git commit -m "test: add ESM and CJS consumer smoke tests"
```

---

## Task 19: CI & release pipelines

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm lint:types
      - run: pnpm test
      - run: pnpm test:types
      - run: pnpm build
      - run: pnpm lint:exports
      - run: pnpm size
      - if: matrix.node == 20
        run: pnpm smoke

  integration:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:integration
        continue-on-error: true # tolerate transient endpoint outages
```

- [ ] **Step 2: Write `.github/workflows/release.yml`**

```yaml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          registry-url: https://registry.npmjs.org/
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: changesets/action@v1
        with:
          publish: pnpm release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 3: Commit**

```bash
git add .github
git commit -m "ci: add CI matrix and release workflow"
```

---

## Task 20: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# @viz-cx/core

Type-safe TypeScript wrapper for [`viz-js-lib`](https://github.com/VIZ-Blockchain/viz-js-lib) with named-argument curated methods, an operation registry that types every VIZ operation, and a transaction-builder pipeline. Default RPC endpoint: `https://node.viz.cx`.

## Why this exists

`viz-js-lib` ships as CommonJS with no types. There is no `@types/viz-js-lib`. `@viz-cx/core` closes that gap with:

- A typed, named-argument client API.
- An `OperationMap` that types every VIZ broadcast op (curated or not).
- A `tx().build() / sign() / broadcast()` pipeline for offline signing and multi-sig.
- Dual ESM + CJS publish; under 100 KB tarball; zero own runtime deps; `viz-js-lib` is a peer dep.

## Install

```bash
pnpm add @viz-cx/core viz-js-lib
# or:  npm i @viz-cx/core viz-js-lib
```

## Quickstart

```ts
import { createClient, viz } from '@viz-cx/core';

const client = createClient({
  account: 'alice',
  activeKey: process.env.ALICE_ACTIVE_WIF!,
});

const r = await client.transfer({ to: 'bob', amount: viz('1.000'), memo: 'thanks' });
console.log(r.id, r.blockNum);
```

Read-only client (no key needed):

```ts
import { createClient } from '@viz-cx/core';

const reader = createClient();          // VizReadClient
const dgp = await reader.api.getDynamicGlobalProperties();
console.log(dgp.head_block_number);
```

## Curated methods (v1)

```ts
client.transfer({ to, amount, memo? });
client.transferToVesting({ to, amount });
client.withdrawVesting({ amount });
client.delegateVestingShares({ delegatee, vestingShares });
client.accountWitnessVote({ witness, approve });
client.award({ receiver, energy, customSequence?, memo?, beneficiaries? });
client.custom({ requiredActiveAuths?, requiredRegularAuths?, id, json });
```

`from` / `voter` / `account` / `delegator` / `initiator` defaults to the bound account.

## Tx-builder pipeline (power users)

```ts
import { sign } from '@viz-cx/core';

// Build → sign offline → broadcast (e.g., for hardware wallets, multi-sig):
const tx = await client.tx()
  .transfer({ from: 'alice', to: 'bob', amount: '1.000 VIZ' })
  .build();

const signed = await sign(tx, { activeKey: WIF });
await client.broadcast(signed);

// Local-key chain:
await client.tx()
  .transfer({ from: 'alice', to: 'bob', amount: '1.000 VIZ' })
  .sign(WIF)
  .broadcast();
```

## Long-tail ops

Operations not curated as named methods are still typed and reachable via the registry:

```ts
await client.tx()
  .op('committee_vote_request', { voter: 'alice', requestId: 42, voteId: 3 })
  .op('paid_subscribe', { subscriber: 'alice', author: 'bob', level: 1, amount: '1.000 VIZ', period: 30, autoRenewal: true })
  .sign(WIF)
  .broadcast();
```

`op<T>(name, params)` autocompletes the op name and validates params against `OperationMap`.

## Auth helpers

```ts
import { keys } from '@viz-cx/core';

const ks  = keys.fromPassword('alice', 'p4ssw0rd');     // { owner, active, regular, memo }
const wif = keys.fromPassword('alice', 'p4ssw0rd', 'active');
const pub = keys.toPublic(wif);
const { wif: w, pub: p } = keys.generate();
keys.isWif(wif); keys.isPubkey(pub);
```

## Errors

```ts
import { VizRpcError, VizValidationError, VizTransportError } from '@viz-cx/core';
```

- `VizRpcError` — chain rejected the request (`code`, `method`, `data`, `message`).
- `VizValidationError` — input shape problem (`field`, `expected`, `received`).
- `VizTransportError` — network/parse failure (`cause`).

## Configuration

```ts
createClient({
  endpoint: 'https://node.viz.cx',  // default
  account: 'alice',
  activeKey: '5J…',
  timeoutMs: 15_000,                // default
  expirationSec: 30,                // default tx expiration window
});
```

## Operation registry

Every VIZ broadcast op is typed in `OperationMap`. The full list:

```
transfer, transfer_to_vesting, withdraw_vesting, delegate_vesting_shares,
account_witness_vote, award, custom, vote, content, delete_content,
account_update, account_metadata, account_create, set_withdraw_vesting_route,
account_witness_proxy, witness_update, chain_properties_update,
versioned_chain_properties_update, proposal_create, proposal_update,
proposal_delete, escrow_transfer, escrow_dispute, escrow_release, escrow_approve,
committee_worker_create_request, committee_worker_cancel_request,
committee_vote_request, paid_subscribe, set_paid_subscription, create_invite,
claim_invite_balance, invite_registration, use_invite_balance,
request_account_recovery, recover_account, change_recovery_account,
fixed_award, set_account_price, set_subaccount_price, buy_account, target_account_sale
```

Type the params shape with `OperationParams<'op_name'>`. The wire form is `Operation<'op_name'>` (a tagged 2-tuple).

## License

MIT
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with quickstart, curated ops, builder pipeline"
```

---

## Task 21: Changesets bootstrap & pre-publish dry-run

**Files:**
- Create: `.changeset/config.json`
- Create: `.changeset/initial.md`

- [ ] **Step 1: Write `.changeset/config.json`**

```jsonc
{
  "$schema": "https://unpkg.com/@changesets/config@2.3.1/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

- [ ] **Step 2: Write `.changeset/initial.md`**

```markdown
---
'@viz-cx/core': minor
---

Initial release: type-safe wrapper over `viz-js-lib` with curated client (`transfer`, `transferToVesting`, `withdrawVesting`, `delegateVestingShares`, `accountWitnessVote`, `award`, `custom`), full operation registry typing for long-tail ops via `tx().op(...)`, transaction-builder pipeline with offline signing, dual ESM/CJS publish, default endpoint `https://node.viz.cx`.
```

- [ ] **Step 3: Run the full pre-publish gate**

Run: `pnpm prepublishOnly`
Expected: build, lint, types, tests, type-tests, attw, and tarball-size all pass.

- [ ] **Step 4: Verify what the publish would contain (dry run)**

Run: `pnpm publish --dry-run`
Expected output lists `dist/`, `README.md`, `LICENSE`, `package.json` — and nothing else (no tests, no `src/`, no `examples/`).

- [ ] **Step 5: Commit**

```bash
git add .changeset
git commit -m "chore: add changesets config and initial release entry"
```

- [ ] **Step 6: Set up the GitHub remote**

```bash
gh repo create viz-cx/ts-core --public --source=. --push
```

(or push to an existing repo: `git remote add origin git@github.com:viz-cx/ts-core.git && git push -u origin main`).

- [ ] **Step 7: After CI is green, publish**

The `Release` workflow auto-publishes the `0.1.0` tag when the changesets PR is merged. For the very first manual publish:

```bash
pnpm prepublishOnly
pnpm publish --access public
```

---

## Definition of Done — checklist

- [ ] Seven curated v1 ops typed and wrapped: `transfer`, `transferToVesting`, `withdrawVesting`, `delegateVestingShares`, `accountWitnessVote`, `award`, `custom`.
- [ ] `OperationMap` covers ≥ 40 broadcast ops with parameter types.
- [ ] Read API covers Database / Witness / AccountByKey / AccountHistory / OperationHistory namespaces.
- [ ] Auth: `keys.fromPassword`, `keys.toPublic`, `keys.generate`, `keys.isWif`, `keys.isPubkey`, `keys.sign`, `keys.verify`.
- [ ] `Asset<S>`, `viz()`, `shares()` with phantom-symbol type safety.
- [ ] Errors: `VizRpcError`, `VizValidationError`, `VizTransportError`.
- [ ] Default endpoint `https://node.viz.cx`, overridable via `ClientOptions.endpoint`.
- [ ] Dual ESM + CJS publish; `attw --pack . --profile node16` clean.
- [ ] `tsd` type tests pass; unit coverage ≥ 80 % on `asset.ts`, `errors.ts`, `tx.ts`, `client.ts`.
- [ ] Integration smoke against `https://node.viz.cx` passes locally.
- [ ] README with quickstart, curated-ops examples, builder pipeline, registry pointer.
- [ ] Tarball ≤ 100 KB.
- [ ] ESLint guard prevents new `viz-js-lib` imports outside `transport.ts` / `auth.ts` / `tx.ts`.
- [ ] Both `examples/esm-app` and `examples/cjs-app` smoke pass against the packed tarball.
- [ ] CI matrix passes on Node 18 / 20 / 22.
- [ ] Published to npm as `@viz-cx/core@0.1.0` with `latest` dist-tag.
