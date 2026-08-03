# Feynman explanation — archive readiness versus publication authority

## Core idea

Archive readiness and publication authority are different switches. The first
says, “this bounded change is implemented and its evidence is complete.” The
second says, “external systems and authorized people permit irreversible public
state to change.” One switch can be on while the other remains off.

Archiving the OpenSpec change is only a repository documentation and process
transition. It grants no permission to upload a package, reserve a version,
create or move a registry tag or dist-tag, publish a GitHub Release, or change
any other public state.

Think of a building inspection. The release-pipeline change is a fire-safety
system: we can install it, exercise every alarm, inspect the logs, and close the
construction ticket. An occupancy permit is separate. A green alarm test does
not manufacture the city's approval, and leaving the construction ticket open
would not create that approval either.

The same distinction appears in every registry. A GitHub workflow can prove it
requests short-lived OIDC credentials and uses `actions/attest@v4`, but it
cannot prove npm has accepted that exact repository/workflow/environment as a
trusted publisher. A clean Pub or Cargo dry run proves the package can be
assembled and checked; both tools explicitly avoid upload in dry-run mode, so
neither proves ownership or registry acceptance.

The release state is therefore a vector, not one Boolean:

1. RC implementation — complete.
2. Change evidence — complete after the final receipt.
3. OpenSpec archive — allowed when all scoped tasks and validation pass.
4. Full 3.0 certification — pending downstream examples, docs, and immutable
   evidence.
5. External authority — unproven until package/repository settings and an
   accepted authorized run are recorded.
6. Stable publication — blocked until certification, external account
   authority, and a separate explicit release approval are all present.

## Teach the skeptic

**Objection: If CI is green, refusing to call the release ready is bureaucracy.**

CI can prove only claims represented by its inputs. npm's own documentation
says trusted-publisher configuration errors may not appear until publication.
Pub.dev configuration requires an uploader or publisher administrator. Cargo
dry-run performs checks without uploading. Calling those account-side facts
green from repository evidence would be a false positive, not efficiency.

**Objection: If publication is blocked, the OpenSpec change should stay open.**

That collapses two scopes. This change owns the recoverable RC mechanism and
non-mutating rehearsal. The later stable-publication change owns the external
authorization and irreversible transition. Keeping a completed mechanism open
does not strengthen authority; it merely makes progress state dishonest.

**Objection: Provenance means the artifact is certified.**

Provenance binds a subject digest to build origin. It does not prove the
package contains the intended files, that its consumers work, or that all
platforms and documentation passed. Packed consumers, tests, security gates,
and the later cross-ecosystem certification bundle own those claims.

**Objection: A failed or timed-out publish can simply rerun because the pipeline
is idempotent.**

The pipeline is recoverable only because it reclassifies every exact
name/version/digest. Matching registry content may be skipped, absence may
continue after dependencies complete, and conflict must block. Blind retry is
not idempotence.

## Transfer answers

1. If the workflow contains `id-token: write` but npm has no trusted-publisher
   relationship, archive the RC mechanism change if its scoped evidence passes,
   but keep npm authority and stable publication blocked.
2. If npm staging succeeds while Pub.dev publisher configuration is absent,
   the npm lane has new live evidence but the cross-ecosystem stable release is
   still incomplete. Do not promote `latest` or claim full 3.0 certification.
