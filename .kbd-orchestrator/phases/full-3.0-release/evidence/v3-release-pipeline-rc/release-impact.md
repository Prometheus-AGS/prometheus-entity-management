# Release impact — `v3-release-pipeline-rc`

Date: 2026-08-02

## Delivered boundary

- One contract-derived candidate manifest covers all 16 declared release
  artifacts and excludes the private workspace root.
- The 12 npm packages are dependency ordered and consumed only from exact
  packed candidates across ESM, CommonJS, NodeNext, Node16, and Bundler.
- Changesets owns version/release-note intent without obtaining publish
  authority in the version-PR job.
- The GitHub workflow declares short-lived OIDC, artifact attestation, a
  protected `npm-rc` staging environment, and no long-lived npm write token.
- Stage authority is verified before any registry snapshot or version lookup,
  including a retry where every immutable version already matches.
- Recovery reclassifies exact package/version/integrity tuples: matching skips,
  absence continues after dependencies complete, conflict blocks.
- Exact-version recovery decodes npm's live multi-field JSON form
  (`"dist.integrity"`) as well as the nested compatibility form.
- Staging accepts only a complete, manifest-consistent rehearsal proof, and an
  absent package reaches completion only when npm returns its exact SRI and a
  registry-issued stage UUID.
- The CLI persists restart evidence through ordinary partial failures and CI
  uploads that evidence even when staging exits nonzero.
- `latest` is protected before and after the rehearsal; stable promotion is
  absent from this change.
- Dart/Flutter and Rust remain explicit dry-run/exclusion dispositions rather
  than being inferred from npm success.

## Downstream impact

After archive, 13 of the phase's 28 changes are complete and 15 remain. This
change unblocks the migration/operations documentation path and is a direct
prerequisite for `v3-release-certification`. It supplies the recovery and
provenance contract consumed by the later immutable evidence bundle and stable
publication operator flow.

## React-first acceleration decision

The next execution priority is the React consumer path: complete
`v3-vite-react19-example`, then `v3-nextjs-app-router-example`, before the
remaining showcase families. This ordering gets the React 19 surface under
packed-package browser and SSR/hydration evidence as early as the accepted
dependency graph permits.

That priority is not publication authority. The current fixed npm policy moves
all 12 packages together, the React binding requires the framework-neutral core,
and the accepted candidate gate still requires all five showcases and
documentation evidence. The local fixed group is now a Changesets-managed
`3.0.0-rc.1` candidate, and the staging lane rejects alpha or unnumbered
prereleases. A separately usable core-plus-React preview still needs an explicit
downstream contract amendment, an immutable committed source SHA, React Vite
and Next.js certification, the protected `next` channel, and verified
npm/GitHub authority.
It must never move `latest` or be described as the fully certified 3.0 release.

## What remains incomplete for full 3.0

- All five requested showcases remain planned: React 19/Vite 8, Next.js,
  agentic A2UI, Flutter/Riverpod, and universal Tauri desktop/mobile.
- Portable Flint contracts and the complete synchronized skills ecosystem
  remain pending.
- The Prometheus Docusaurus product—foundation, API reference, concepts,
  tutorials, migration/operations content, and protected GitHub Pages
  deployment—remains pending.
- No immutable, signed/hashed full-release evidence bundle yet joins packages,
  examples, docs, skills, platforms, security, and registry dry runs.
- npm trusted-publisher configuration, GitHub environment reviewers, an emitted
  workflow attestation, Pub.dev publisher/tag/environment configuration, and
  crates.io ownership/credentials remain unproven external state.
- No live RC staging, stable registry publication, GitHub Release, or
  `latest` promotion has occurred or is authorized.

## Publication authority

The 12 npm package manifests are locally versioned `3.0.0-rc.1` in Changesets
prerelease mode but are not published. The Dart package source is prepared as
`3.0.0` but is also unpublished. Coverage remains `in-progress`, all five
showcases and the documentation site remain `planned`, and `releaseCertified`
remains false.

Archive is a repository process transition only. It cannot mutate npm,
Pub.dev, crates.io, GitHub Releases, Pages, tags, or dist-tags. Stable
publication remains fail-closed behind `v3-release-certification`, external
account authority, and the separate explicit approval in
`v3-stable-publication`.
