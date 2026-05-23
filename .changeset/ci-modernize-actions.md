---
'@viz-cx/core': patch
---

CI: switch publish auth to npm Trusted Publisher (OIDC) and bump deprecated Node 20 GitHub Actions (`actions/checkout`, `actions/setup-node`, `pnpm/action-setup`) to v6 so workflows keep running after the June 2026 Node 24 forced-default cutoff. No runtime/library changes — devops only.
