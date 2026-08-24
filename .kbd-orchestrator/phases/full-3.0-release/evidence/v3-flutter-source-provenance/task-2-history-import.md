# Task 2 filtered-history import receipt

Date: 2026-08-01  
Verdict: **PASS**

## Object lineage

- KnowMe recorded revision: `68f7ab83b72c8bed37d1e7d19a5371a45b4f8f52`
- Filtered history tip: `cb318ddb2beb2948a1b26e5e589cff3145b788cc`
- Filtered tree: `6bd3c232073687b774e444f4196c1a4f4da2c39c`
- Destination merge: `eb3c9802da5ff10ad6db135fed761bd23ea80b3f`
- Merge parents: destination `dd5d70c9954381d3af4519ccedeb5cb565d6027e`, filtered `cb318ddb2beb2948a1b26e5e589cff3145b788cc`
- Commit map: 226 source commits examined, 8 retained, 218 pruned
- Filtered first-parent merge delta: 12 files, all beneath `provenance/imports/knowme-flutter/`

The recorded source HEAD maps to all zeroes because it did not alter an
allowlisted path. The eight earlier relevant commits retain their authors,
author dates, committer identities and dates, subjects, and allowed path
evolution. Rewritten hashes are explicitly not claimed to be identical.

## Safe procedure

1. Cloned `feat/embedded-memory-crud` with `--no-local` into a disposable
   directory and detached at the recorded source revision.
2. Ran `git-filter-repo --force` once with explicit file paths and two scoped
   path renames.
3. Inspected the filtered tip tree, full commit map, and reverse chronological
   metadata before destination mutation.
4. Rehearsed the unrelated-history merge in a second disposable destination
   clone and verified the first-parent delta contained only the 12 approved
   import files.
5. Merged the filtered history and rechecked merge parents, delta, and empty
   index.

The KnowMe source remains at its original revision and retains its pre-existing
dirty files; none were copied. `hybrid-mobile-architecture-src` remains clean at
`e641c25d5c99ac04c3c872626099583c29ac568c` and was not mutated or imported.

## Boundaries

The filter excluded applications, product models and UI, secrets, dirty files,
generated Dart, lockfiles, `.dart_tool`, build output, direct FFI, and the
placeholder `gen_ui_flutter` package. The imported pubspecs are historical
reference files under a non-workspace, non-buildable provenance boundary. The
sole canonical Dart graph remains `packages/entity_graph_flutter`; adaptation
is owned by the later `v3-dart-graph-riverpod` change.
