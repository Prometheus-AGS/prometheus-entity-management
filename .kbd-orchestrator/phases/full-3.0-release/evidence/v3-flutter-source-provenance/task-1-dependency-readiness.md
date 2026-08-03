# Task 1 dependency readiness — `v3-flutter-source-provenance`

Date: 2026-08-01  
Task: Confirm dependencies are complete: `v3-release-contract`.  
Verdict: **PASS**

## Three-layer dependency proof

| Authority | Check | Result |
| --- | --- | --- |
| OpenSpec | active change absent; archive `2026-08-01-v3-release-contract` present; promoted spec validates strictly | Pass |
| KBD runtime | `v3-release-contract.status == complete`; current Flutter-provenance change is `in_progress` | Pass |
| KBD projection | release contract is `DONE` / `COMPLETE`; canonical implementation count is 9 of 28 before this change | Pass |
| Release contract | validator reports 0 errors, 16 artifacts, 12 npm packages, 1 Dart package, 3 Rust crates, and 5 showcases | Pass |

The dependency fixes release version `3.0.0`, license `MIT`, and one stable Dart
artifact: `entity_graph_flutter` at `packages/entity_graph_flutter`. Its pub.dev
decision remains `deferred`; importing source does not authorize publication.

## Content-addressed inputs

- `release/v3-release-contract.json` SHA-256:
  `95ef8cf2d7ec6c4aa1b3081d45325cccf240ca20bce19a606834c9b1273523fd`
- `openspec/specs/v3-release-contract/spec.md` SHA-256:
  `58f29a85237b57e2add740cd589e7bd9bbfcd8c1a18e5d4ca5fdfac1bce2e756`
- research manifest SHA-256:
  `43cb83df01b08fbe78244289b759803878cf965c0edd8a5aacd6d5b7d702fe50`
- source-authority record SHA-256:
  `4e0e34a0c3855ada2542ead8243e7c26468fa0d83f6c9c4bcfdf2d6f9c34d7b1`

## Pre-copy authority and boundaries

No source was copied in task 1. Before task 2, the project-owner direction,
destination MIT decision, source revisions, approved paths, exclusions,
history policy, attribution, and publication boundary were persisted in
`release/flutter-source-authority.json`.

This record resolves the engineering authority gate for a private repository
migration without pretending KnowMe contains a tracked license. It authorizes
an allowlisted adaptation into the existing canonical Dart package. It does not
authorize a registry publication, app migration, FFI import, dirty-worktree
copy, or blanket reuse of every source file.

## Research and Feynman readiness

- Deep-research package: `.research/v3-flutter-source-provenance/`
- Report confidence: 0.93; 10 primary/local sources; 4 contradictions resolved
- Feynman grade: 0.96; misconceptions absent: 1.0
- Anti-sycophancy result: no mandatory correction; one low verbosity note
- Firecrawl-backed worker: cancelled after three stage-zero checks; official
  primary-source retrieval fallback is recorded in the manifest

## Task 2 entry constraints

1. Import only committed Git objects from KnowMe SHA `68f7ab83…` through a
   fresh disposable clone; never read the dirty source tree as import content.
2. Do not rewrite either source repository.
3. Retain original-to-filtered commit mappings and never claim hash identity.
4. Treat `hybrid-mobile-architecture-src` SHA `e641c25d…` as MIT reference-only.
5. Adapt approved generic code into `packages/entity_graph_flutter`; do not add
   a second canonical graph package.
6. Keep pub.dev and all external publication unauthorized.

## Canonical runtime reconciliation

The first task transition exposed an orchestration registration defect: the
runtime knew only task 1, so completing it temporarily projected this six-task
change as complete and advanced the local implementation counter. OpenSpec
still had five pending tasks. Tasks 2–6 were registered as `pending`, the change
was returned to `in_progress`, and the projection re-derived to 9 of 28 changes
with 1 of 6 tasks complete. No task 2 work was started.

The runtime's legacy `exactNextWork`/position-reminder text still names the
already archived A2A change even though canonical change/task status and
`progress.json` are correct. That stale display is not used as completion
evidence; the next turn must prefer canonical progress and OpenSpec task state.
