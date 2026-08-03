# Feynman explanation — provenance-preserving Flutter import

## Core idea

A provenance-preserving source migration moves four things together: useful
code, permission to redistribute it, the history that explains it, and a clear
decision about which implementation becomes canonical. Copying files moves
only the first—and may not even move the correct committed version.

## Explain it plainly

Think of the migration as an organ transplant with a medical chart. The Dart
files are the organ. The license and owner authorization say the transplant is
permitted. Git authors, dates, messages, and the old-to-new commit map are the
medical chart. The destination manifest says where the organ went and which
old tissue was rejected. A transplant without the chart may work today but is
unsafe to operate, publish, or audit later.

It is also a chain-of-custody problem. We freeze a committed KnowMe revision,
not the dirty working directory. We make a disposable clone, filter only
approved historical paths, move those paths under a staging prefix, and retain
the filter tool's commit map. The source checkout is never rewritten. Because
Git commit IDs include their trees and parents, changing paths changes hashes;
preserving history honestly means retaining authors, dates, messages, file
evolution, and a mapping—not claiming identical SHAs.

Finally, this is a renovation, not construction of a second house. The release
contract already names `entity_graph_flutter` as the one Dart graph package.
KnowMe's generic provider, view, CRUD, sync, transport, and A2UI ideas can improve
that house. KnowMe product models, application code, direct FFI coupling,
generated files, locks, secrets, and build output do not become a second
canonical package. `hybrid-mobile-architecture-src` supplies MIT templates and
architecture references, but its own manifest says it contains no runtime app
or library to transplant.

Dependencies follow the same rule. “Latest” is a search result, not a release
decision. Riverpod 3 changes automatic retry and notifier APIs; Freezed,
analyzer, annotations, and generators must resolve as one matrix. The newest
mutually compatible stable set wins only after generation, format, analysis,
and behavior tests pass. Terminal failures need an explicit no-retry policy.

## Teach the skeptic

**“The owner asked to move it, so why write a license record?”** The request
establishes project intent, but a future package consumer cannot inspect this
conversation. The repository needs a durable authority/attribution record and
package license before copying or publishing. That makes the permission
auditable instead of implicit.

**“If hashes change, this is not history-preserving.”** Hash identity is
impossible after path rewriting. Audit continuity is preserved by the original
revision, filtered history, retained metadata, and commit map. Claiming the old
hash survived would be the actual provenance error.

**“Why not copy both source packages exactly and clean them later?”** That
creates duplicate graph ownership, imports product and FFI coupling, and makes
later deletion obscure the decision. An allowlisted historical import followed
by an explicit adapt/reference/reject disposition preserves evidence while
keeping one canonical package.

## Transfer problems and answers

1. A candidate package was renamed once, contains committed `.g.dart` files,
   and the active worktree has an uncommitted security fix. The safe import
   filters every historical source path from a fresh clone at the recorded
   committed SHA, excludes generated files from the canonical destination,
   records them as regeneration/reference inputs, and does not silently take
   the uncommitted fix. That fix must first become an authorized source commit
   or be independently reimplemented and attributed.
2. The newest Riverpod generator requires an analyzer that conflicts with the
   newest stable Freezed generator. Do not force both latest versions or hide
   the resolver conflict. Select the newest mutually resolvable stable matrix,
   record the constraint and upstream evidence, then require deterministic
   codegen, format, analyze, and tests. Revisit the pin when the conflict clears.
