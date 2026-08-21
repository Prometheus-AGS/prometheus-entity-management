# Release impact — `v3-flint-portable-contracts`

Date: 2026-08-21

## Implementation-ready surface

The Flint adapter seam is now certified as portable and honestly labeled. The
watch/mutate wire contract (`EventKind.ENTITY_CHANGE` decode, malformed-payload
skip, entityType filter, channel-envelope tenant identity, offset checkpoints)
runs in default CI against a checked fixture — no machine-specific paths, no
silent skips. The security-relevant seam contract (tenant/channel propagation,
per-channel+consumer checkpoint key separation, entityType scoping, fail-closed
decode) is pinned by `flint-security.test.ts`. The flint-gate/flint-forge auth
and provisioning contract — issuer/audience validation, strict kid/JWKS rules
with the compatibility caveat, anon/authenticated/service_role key separation,
service-role-only provisioning, BYPASSRLS + FORCE RLS, audit, and restart
semantics — is pinned as a checked claims fixture with docs consistency and
examples secret scans enforced by the release gate.

This makes the Flint integration contract a certifiable part of the 3.0 RC
surface. It does not certify live Flint interop (opt-in lane) and grants no
publication authority.

## Design decisions that bound the blast radius

- No library API changed and no new runtime dependency was introduced. The
  fixture is imported only by tests; the package ships `dist/` built from
  `index.ts`, which never reaches it.
- The old silent-skip live test was replaced, not extended: default lane always
  executes against the fixture; the live lane is env-gated
  (`FLINT_EM_MODULE`/`FLINT_SDK_MODULE`) and verified fail-closed by a verifier
  probe that requires a non-zero exit when the SDK is unavailable.
- Token verification was deliberately NOT reimplemented in this repo — the
  identity plane belongs to flint-gate. The contract is pinned as data
  (claims fixture) plus prose (docs), enforced by tests.
- Docs describe only the fabric surface verified against source
  (`forge migrate` as the apply path — no `plan` subcommand exists — and
  `forge token mint`), with an explicit "not provided by this repository"
  boundary.
- Two `coverage.json` entries owned by this change flipped from `planned` to
  `implemented` with the verifier command and evidence paths.

## Full-release disposition

The full 3.0 release remains in progress. Skills ecosystem, docs, examples,
cross-ecosystem certification, and stable publication retain independent plan
ownership. The human-gated changes `v3-release-certification` and
`v3-stable-publication` are untouched and remain the hand-off boundary. This
evidence grants no npm, GitHub Release, GitHub Pages, Pub, Cargo, or app-store
publication authority.
