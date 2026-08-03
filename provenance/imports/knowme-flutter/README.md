# KnowMe Flutter provenance import

This directory is a **non-buildable provenance boundary**, not a workspace
package and not a second public entity-graph implementation. It retains the
allowlisted committed history used to evaluate and adapt reusable Flutter
ideas from `Know-Me-Tools/know-me-system`.

The only canonical Dart graph package in this monorepo is
`packages/entity_graph_flutter`. Code needed by the 3.0 Flutter surface must be
adapted there under its architecture, tests, dependency policy, and public API.
Do not add this directory to a Dart, Flutter, pnpm, or publication workspace.

## Provenance

- Source repository: `Know-Me-Tools/know-me-system`
- Recorded source revision: `68f7ab83b72c8bed37d1e7d19a5371a45b4f8f52`
- Filtered history tip: `cb318ddb2beb2948a1b26e5e589cff3145b788cc`
- Destination merge: `eb3c9802da5ff10ad6db135fed761bd23ea80b3f`
- Original-to-filtered mappings: `commit-map.tsv`
- Author attribution: Travis James; Prometheus AGS / KnowMe LLC
- Destination license decision: MIT (see `LICENSE`)

The source repository did not track a root or candidate-package license. The
project owner explicitly directed this migration and the destination release
contract fixes MIT. This record documents that engineering authority; it is
not a general legal opinion and does not authorize pub.dev publication.

## Import policy

The import was produced from committed Git objects in a fresh disposable clone.
It includes only generic entity-management source and the A2UI surface view
selected in `release/flutter-source-authority.json`. Dirty files, applications,
product models, secrets, generated Dart output, lockfiles, build output, direct
FFI, and the placeholder `gen_ui_flutter` package were excluded.

`hybrid-mobile-architecture-src` is an MIT-licensed architecture/template
reference only. No runtime package was copied or fabricated from it.
