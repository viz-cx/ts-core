---
"@viz-cx/core": patch
---

Bump `vitest` and `@vitest/coverage-v8` from `^1.6.0` to `^3.2.6`, resolving the critical Dependabot advisory (Vitest UI server arbitrary file read/exec, GHSA fixed in 3.2.6). Dev-dependency only — no change to the published surface.

All gates pass under vitest 3: lint, typecheck, 106/106 unit tests, tsd, attw exports, tarball size. Coverage config: excluded ambient `.d.ts` files and recalibrated the `functions` threshold (vitest 3's v8 provider counts inner closures/arrows as uncovered even when their lines run, so lines/statements/branches remain the meaningful gates at 98%/98%/92%).

The low-severity esbuild advisory (dev-server file read on Windows, transitively via `tsup`) is intentionally not addressed here: the patched esbuild `0.28.1` is outside tsup 8.5.1's declared `^0.27.0` range, and the vector (dev server on Windows) does not apply to this repo's Linux CI / `vitest run` usage. Revisit once tsup widens its esbuild range.
