---
"@viz-cx/core": patch
---

Track `viz-js-lib` 0.12.7. Bump the peer/dev dependency from `^0.12.6` to `^0.12.7`.

Upstream 0.12.7 removes long-deprecated social/content API methods (`get_content`, `get_blog*`, `get_follow*`, `get_discussions_by_*`, `get_vesting_delegations`, `lookup_accounts`, …) and moves `babel-preset-env`/`cross-env` out of runtime `dependencies` into `devDependencies`. None of the removed methods are referenced by `@viz-cx/core`'s API surface, so this is a clean version track with no behavior change. The build, type, exports, and tarball-size gates all pass against 0.12.7, and the dependency cleanup drops ~80 transitive babel/cross-env packages from installs.
