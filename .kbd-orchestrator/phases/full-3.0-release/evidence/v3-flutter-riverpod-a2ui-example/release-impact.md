# Release impact — `v3-flutter-riverpod-a2ui-example`

Date: 2026-08-04
Implementation source through stable platform gates: `99d97c2`
Change status: verified and archived; aggregate 3.0 certification remains
separate

## Package impact

The Flutter showcase is private (`publish_to: none`) and adds no declaration to
`packages/entity_graph_flutter/lib`; the Dart public ledger remains 81/81. It
does not create a second graph package, bundle a Rust runtime, or authorize
pub.dev or app-store publication.

The task-5 aggregate gate corrected one observed defect in the publishable
`@prometheus-ags/a2ui-react` runtime: the official processor could retain and
later mutate caller-owned message objects. The runtime now clones parsed
messages separately for validation and commit. The focused regression keeps
the caller fixture unchanged, and
`.changeset/preserve-a2ui-message-ownership.md` requests a patch prerelease for
that package. The fixed Changesets group will coordinate the later candidate.

## React-first release lane

This continuation is not part of the frozen React `3.0.0-rc.1` candidate on
remote `main` at `1c40eaa08da210cbe3e20a77c5db211712b5c3a1`. Therefore:

- the rehearsed React `rc.1` artifacts can be staged to npm `next` after trusted
  publisher authority and protected-environment approval are available;
- merging this continuation later consumes its Changesets and produces a
  subsequent coordinated prerelease rather than changing the frozen `rc.1`;
- no npm tag, registry object, or candidate SHA is mutated by this change.

## Stable-release impact

The Flutter/Riverpod/A2UI showcase now satisfies its bounded plan acceptance
criteria and can be used as implemented evidence for the Flutter platform and
showcase portfolio. It does not complete stable 3.0.0. Universal Tauri, the
skills expansion, complete Prometheus Docusaurus site, protected GitHub Pages,
aggregate release certification, registry authority, and stable promotion
remain separate changes.

## Quality corrections before archive

Artifact-refiner passed 8/8 blocking constraints. The isolated adversarial
review did not pass on its first attempt: it first exposed a stale KBD
projection and incomplete review packet, then found that the tracked Android
and iOS workflow invoked the integration test from the repository root instead
of the Flutter package. The workflow and its focused regression now require
`examples/flutter-riverpod` as the working directory. The third review passed
with no findings, and the sycophancy screen passed at 0.0.

Final root CI passed 90/90 BDD scenarios and 428/428 steps. Strict validation
passes for all 17 promoted OpenSpec specifications, and the bounded change is
archived at
`openspec/changes/archive/2026-08-04-v3-flutter-riverpod-a2ui-example/`.

## Security boundaries

The application receives untrusted agent JSONL and optionally crosses a native
transport interface. Atomic preflight validates the complete batch before
GenUI mutation; the catalog and action names are allowlisted; tenant/task
policy and trusted approval run after protocol validation; allowed actions
flow through generated controllers into the one application-owned graph. The
FFI adapter owns transport I/O only. No secrets or hosted credentials are
required by deterministic CI or platform smoke.

## Explicit limits

- iOS and Android evidence is simulator/emulator smoke, not physical-device or
  native assistive-technology certification.
- Offline/reconnect behavior uses an in-memory queue and does not claim durable
  persistence.
- Hosted service integrations and external agents are not exercised.
- GenUI remains exact-pinned and experimental.
- The example owns no public Flutter API and no bundled Rust runtime.
- Registry publication and movement of npm `latest` remain unauthorized.
