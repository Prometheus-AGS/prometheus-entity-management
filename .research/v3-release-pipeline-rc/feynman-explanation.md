# Feynman explanation — release pipeline recovery, skeptic audience

## Core idea

A safe monorepo release is a shipping manifest plus a restartable checklist, not one large publish command.

Think of Changesets as the clerk who updates labels and writes release notes. It decides which package versions should exist, but it does not turn multiple registry uploads into one atomic transaction. If package six fails after five uploads, the registry cannot roll those five back. The release system therefore needs a journal that records which exact name/version/digest pairs are already complete and checks the registry before retrying.

The second analogy is airport security. OIDC trusted publishing proves which approved workflow presented the package, and provenance records where it was built. Neither inspects whether the suitcase contains the intended files or whether the software works. Tarball allowlists, package-contract tests, and the full certification gate still have to inspect the contents.

The third analogy is a loading dock. `npm stage publish` moves an existing package version into a private inspection area, while a human later approves it with 2FA. That is a stronger release boundary than a long-lived token, but it is not a universal rehearsal: new packages cannot use it, the command is workspace-unaware, and staging consumes the version identity. The default autonomous rehearsal must therefore use packed artifacts and a disposable registry while proving the real npm `latest` tags did not change.

## Teach the skeptic

**Objection: Changesets already handles monorepos, so a custom manifest is redundant.**

Changesets handles semver intent and internal dependency bumps. Its own action documentation warns custom publishing must tolerate already-published versions. The manifest adds the project-specific artifact allowlist, registry decision, dependency order, digests, non-npm artifacts, and recovery state that Changesets does not own.

**Objection: An RC tag makes latest safe.**

Not universally. Changesets documents that a first publish of a new package can receive `latest` despite prerelease mode. The release verifier must detect never-published packages and block real RC publication until an explicitly approved bootstrap procedure exists.

**Objection: If provenance is present, the release is certified.**

No. Provenance attests origin and digest. Certification additionally proves builds, tests, package contents, platform behavior, documentation, licenses, and security gates. Publication remains a separate completion dimension.

**Objection: A partial failure can just rerun the workflow.**

Only if the rerun first classifies every name/version. An existing version with the expected digest can be skipped; an absent version can continue; an existing version with a different digest must stop. Treating every registry error as skippable would hide tampering or a bad prior release.

## Restartable state machine

The workflow advances each artifact through explicit, persisted states:

1. `declared` — the release contract authorizes the artifact and registry.
2. `packed` — a deterministic candidate exists and its digest is recorded.
3. `verified` — package, consumer, security, and cross-ecosystem certification gates pass for that digest.
4. `classified` — registry inspection says `absent`, `matching`, or `conflicting` for the exact name and version.
5. `submitted` — only `absent` artifacts may be uploaded or staged; `matching` artifacts are recovery skips; `conflicting` artifacts stop the release.
6. `registry-verified` — the registry exposes the expected version, digest/integrity, and RC tag without changing the protected `latest` snapshot.
7. `complete` — the journal entry is durable and downstream dependants may proceed.

On resume, the pipeline does not trust its last process exit. It reloads the signed or hashed release manifest and journal, repeats registry classification, validates that local candidate digests still match the manifest, and continues at the first `absent` artifact whose dependencies are `complete`. Any manifest drift, digest mismatch, unexpected `latest` movement, or registry conflict moves the run to `blocked` and requires a new version or explicit recovery decision. Stable promotion is outside this state machine and remains a separate human-authorized change.

The protected-tag invariant is operational, not rhetorical: before the first submission, capture the complete dist-tag map for every declared npm package and hash the snapshot. After every upload, recovery skip, retry, and final registry verification, fetch the maps again and require each package's `latest` value to equal its preflight value. A missing preflight snapshot or an unreadable registry is a blocker, never a reason to assume safety.

Stable promotion begins only after the RC change is archived and the separate release-certification change proves the exact candidate digests. The stable-publication change then requires explicit human authority, revalidates registry state and candidate identity, records the approval, publishes or promotes in dependency order, verifies final tags and provenance, and records rollback guidance. The RC pipeline cannot infer or inherit this authority from a green build.

## Transfer answers

1. If eight of twelve npm packages publish and the ninth times out, rerun only after registry checks prove the first eight versions have the expected integrity and packages nine through twelve are absent. Record the classification in the recovery journal.
2. If an RC includes a never-published package, do not rely on the `rc` tag. Keep the rehearsal local or obtain explicit bootstrap authority with a separately verified dist-tag procedure; otherwise `latest` can move.
