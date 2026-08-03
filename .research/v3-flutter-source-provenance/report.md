---
type: research-report
title: "Flutter source provenance and consolidation readiness"
query: "How can reusable KnowMe Flutter packages move into the Prometheus entity-management monorepo with authority, history, and current dependencies?"
date: "2026-08-01"
confidence: 0.93
verification_status: verified
feynman_grade: 0.96
sources_count: 10
contradictions_resolved: 4
job_id: v3-flutter-source-provenance-20260801
tags: [deep-research, flutter, dart, provenance, licensing, riverpod]
links: []
---

# Flutter source provenance and consolidation readiness

## Executive summary

The safe migration is an adaptation into the existing
`packages/entity_graph_flutter`, not a bulk directory copy. KnowMe contains the
generic provider, view, sync, transport, and A2UI wrapper ideas requested by the
user, but the current checkout is dirty, the packages are coupled to product
and FFI concerns, generated files are committed, and no root or package-local
license is tracked. The owner-directed move request supplies project scope, but
the destination must record the MIT relicensing/attribution decision before
copying committed objects.

`hybrid-mobile-architecture-src` is clean and MIT licensed, but its own rules
say it is a scaffolding/template skill without a runnable application. It should
remain a reference and testing source rather than be misrepresented as a
runtime library migration.

History should be extracted from a fresh disposable clone of KnowMe at the
recorded source SHA, filtered to approved paths, renamed under an import staging
prefix, and merged as unrelated history. Authors, dates, messages, and file
evolution remain inspectable; hashes necessarily change, so the generated
commit map and original SHA must be preserved in a provenance manifest. The
dirty source worktree is never read as import content and neither source
repository is rewritten.

## Findings

### 1. Authority precedes copying

The destination release contract declares MIT and explicitly blocks unlicensed
Flutter source. KnowMe has no tracked license covering the candidate packages.
Therefore the repository needs a pre-copy authority record that identifies the
user's requested move, retained copyright holder, destination MIT license,
approved source revision/paths, and exclusions. A package-local `LICENSE` is
also required before eventual pub.dev publication.

### 2. One canonical Dart graph package

The release contract already names `entity_graph_flutter` as the stable Dart
artifact. Importing KnowMe's package as a second canonical graph would create
the duplicate ownership the phase is meant to eliminate. Generic providers,
CRUD, view, sync, and transport concepts should be integrated into that package;
KnowMe FFI bindings, product models, applications, locks, and generated output
are reference or regeneration inputs, not canonical source.

### 3. History preservation is auditable rewriting

Official filter-repo guidance supports extracting a directory and moving it
under a new prefix. It also makes clear that rewriting a historical path changes
commit hashes. The honest receipt therefore records the original revision,
filtered revision, old-to-new commit map, retained authors/dates/messages, path
mapping, import merge, and destination disposition. “Same SHA” is not an
acceptance criterion.

### 4. Dependencies require a matrix, not a slogan

The destination currently resolves `flutter_riverpod` 2.6.1. KnowMe pins 3.3.1;
the current resolver sees 3.4.2. Riverpod 3 changes automatic retry, notifier
families, and auto-dispose APIs. The next Dart implementation change should use
the newest mutually resolvable stable Riverpod/annotation/generator/Freezed/
analyzer set, then prove code generation, formatting, analysis, and behavior.
Blind upgrades without that proof are not dependency hygiene.

## Evidence table

| Claim | Strongest evidence | Confidence |
| --- | --- | ---: |
| KnowMe reusable history exists but the checkout is unsafe to copy | local Git objects and status at `68f7ab8…` | 0.98 |
| KnowMe candidate paths have no tracked license | `git ls-files` license audit | 0.98 |
| hybrid-mobile is reference-only | its MIT license, AGENTS.md, and builder manifest | 0.98 |
| filtered import rewrites hashes | git-filter-repo and GitHub documentation | 0.96 |
| a Dart publication needs license metadata | Dart package/publishing documentation | 0.95 |
| Riverpod 3 changes retry/API behavior | official Riverpod migration guide | 0.95 |
| current destination dependencies are stale | `flutter pub outdated --json` under Flutter 3.47 beta | 0.94 |

## Contradictions and sycophancy corrections

Four attractive but false shortcuts were rejected: copying templates as a
runtime library, treating a move request as an implicit license for every file,
claiming rewritten commits retain hashes, and equating numeric latest with a
compatible dependency set. Detailed resolutions are in `contradictions.json`.

## Import blueprint

1. Record authority and the exact committed source revision before copying.
2. Define an allowlist for generic handwritten source and an exclusion list for
   apps, product models, FFI implementations, secrets, locks, generated output,
   `.dart_tool`, and build directories.
3. Clone KnowMe into a disposable directory from committed Git objects.
4. Run `git filter-repo` only in that clone, with explicit path filters and a
   staging prefix; retain commit/ref maps and rewrite diagnostics.
5. Merge the filtered branch into the destination without squashing.
6. Adapt approved concepts into `entity_graph_flutter`; remove or deprecate the
   staging duplicate deliberately and keep history reachable.
7. Add package-local license/attribution/provenance manifests and deterministic
   BDD checks that reject unapproved paths, missing mappings, or duplicate
   canonical implementations.

## Limitations

- This is a project provenance and engineering assessment, not legal advice.
- It does not copy source or authorize public registry publication.
- A package's newest registry version is evidence for investigation, not proof
  that the full generator/analyzer matrix compiles.
- Mobile, golden, accessibility, and visual certification belong to the later
  Flutter example change; this change's evidence is headless Git/license data.

## Conclusion

The migration is feasible and autonomously actionable because the user directly
requested the move and all relevant repositories are locally inspectable. It is
only release-safe if the implementation records the MIT authority decision
before copying, imports committed history through a disposable filter, adapts
generic concepts into one canonical package, and proves the provenance manifest
and exclusions with BDD tests.

## References

See `citations.json` for the primary-source bibliography and confidence scores.
