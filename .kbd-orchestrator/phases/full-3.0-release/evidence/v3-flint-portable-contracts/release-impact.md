# Release impact — `v3-flint-portable-contracts`

Date: 2026-08-04

## What this closes

The 3.0 candidate no longer depends on a developer's absolute sibling path or
passes a missing Flint integration silently. Default CI executes a checked
portable watch/mutate round trip, while a separately enabled workflow requires
immutable Realtime Fabric, Gate, and Forge sources and fails on missing or
incompatible inputs.

The change also makes the external security/provisioning boundary auditable:
issuer, tenant equality, asymmetric `kid`, RSA/EC JWKS behavior, role/key
separation, client secret exclusion, Forge plan/apply/RLS/audit/restart
semantics, and the absence of a local Forge adapter are all explicit.

## Package and compatibility impact

- No public TypeScript entry point or runtime dependency changed.
- `createFlintAdapter` and `publishFlintMutation` retain their structural
  client API and existing export-ledger entries.
- No package version, Changesets policy, lockfile, npm dist-tag, or registry
  artifact changes in this bounded change.
- The real SDK lane is pinned evidence. Future Flint revisions must update the
  source hashes and rerun the live contract rather than inheriting this pass.

## React-first delivery

This archive does not delay or rewrite the independently frozen React RC source
on remote `main@1c40eaa08da210cbe3e20a77c5db211712b5c3a1`. It improves the
downstream full-portfolio branch while the React candidate remains separately
available for packaging/rehearsal. Public npm RC publication still requires
the accepted fixed-group staging lane and external trusted-publisher authority;
this change neither grants that authority nor moves `next` or `latest`.

## Remaining full-3.0 work

- Complete and certify the combined skills ecosystem.
- Build the full Prometheus-branded Docusaurus site and protected GitHub Pages
  deployment.
- Assemble aggregate immutable release evidence across packages, examples,
  docs, skills, security, and platforms.
- Verify registry authority and execute separately authorized RC/stable
  publication without promoting `latest` prematurely.
