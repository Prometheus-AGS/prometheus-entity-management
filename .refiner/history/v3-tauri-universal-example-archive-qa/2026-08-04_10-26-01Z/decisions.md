# Decisions — `v3-tauri-universal-example-archive-qa`

## 2026-08-04 — Certify the bounded showcase for isolated review

Decision: terminate refiner cycle 1 with all eight blocking constraints
satisfied and send the complete change to fresh-context adversarial review.

Rationale: current focused source, unit, coverage, release-contract, skills,
OpenSpec, Changesets, artifact-integrity, signed KBD, remote-main, npm-tag, and
diff checks pass. Original-resolution inspection confirms that representative
browser, macOS, Android, and iOS visuals are legible and correctly labeled.

The result is deliberately narrower than stable release certification. macOS
is the only executed desktop bundle; Android is emulator evidence; iOS is an
unsigned simulator receipt; native assistive technology, physical devices,
distribution signing, app stores, registries, GitHub Release, Pages, and stable
3.0 remain outside this change. The external owner must still rotate the Cargo
registry credential disclosed by the redacted diagnostic incident.

The frozen React `3.0.0-rc.1` lane remains independent at remote-main SHA
`1c40eaa08da210cbe3e20a77c5db211712b5c3a1`. This continuation's Tauri patch
Changeset belongs to a later coordinated prerelease.

## 2026-08-04 — Reopen and terminate cycle 2 after review remediation

Decision: reopen the finalized artifact because the isolated review found two
native credential-inheritance defects and stale iOS generator metadata. After
correcting those findings, terminate cycle 2 with all eight constraints
satisfied and require a new isolated review.

Rationale: Gradle compiles the Android credential removals, XcodeGen emits the
sanitized iOS build phase, both iOS version fields remain `0.0.1`, and the
registered deep-link scheme survives plist regeneration. Ten source-contract
tests fail closed on credential, toolchain, version, deep-link, permission,
layering, and generated-shell drift. The signed KBD discrepancy is reconciled
with a revision-122 receipt because the revision-98 compatibility projection
is generated and read-only. The task-5 runtime artifacts were not rebuilt and
remain explicitly classified as prior platform evidence.

## 2026-08-04 — Require canonical generated-project evidence

Decision: accept the second isolated review's critical finding, regenerate the
checked-in Xcode project, and terminate cycle 3 only after the verifier inspects
that canonical artifact directly.

Rationale: a temporary XcodeGen output cannot prove the repository's checked-in
build phase. Regeneration now writes the credential unset into
`project.pbxproj`. The `Externals` source entry was removed because real task-5
archives made XcodeGen enumerate `libapp.a` as a resource; framework linkage,
library search paths, and build-script output paths remain explicit. The
verifier rejects both credential drift and native archive resource capture.

## 2026-08-04 — Narrow denial proof without duplicating graph state

Decision: accept the third review's capability-proof finding and reject its
recommendation to move canonical graph reads into the platform store.

Rationale: the retained macOS/Android receipts show the exact Tauri denial
message and permission identifier. The current classifier accepts only that
pair and rejects transport or other-command failures. A current macOS app/DMG
build compiles the correction. Conversely, `useGraphStore` is the canonical
store named by the repository architecture; hooks are its permitted readers.
The platform store owns platform intents and service calls, not duplicate
entity projections. Documentation, constraints, and the verifier now state and
enforce that distinction.

## 2026-08-04 — Require current mobile evidence and pre-hydration queue validation

Decision: accept the fourth isolated review's queue-order and stale-mobile
evidence findings, rebuild all current platform artifacts, and terminate at the
maximum fifth refiner iteration only after current Android/iOS execution.

Rationale: persisted queue bytes are untrusted durable input and must be parsed
before the graph runtime hydrates entities or lists. Task-5 mobile artifacts
remain valid historical evidence but cannot prove source changed afterward.
The new task-6 receipt binds current macOS build output, Android APK/runtime and
exact capability denial, iOS simulator app/runtime, and five retained artifacts.
The generated progress projection is not edited: signed revision 122 proves
6/6 completion at 31/53, while aggregate publication remains unauthorized.

## 2026-08-04 — Continue after the manual-restore review finding

Decision: preserve the finalized five-iteration artifact in history, start a
linked continuation cycle, and terminate its first iteration only after both
restore paths validate durable queue input before hydration and current native
evidence is rebuilt from source bound by hash.

Rationale: the fifth review identified a real path-specific boundary missed by
the initialization regression. A source-presence receipt alone had also allowed
runtime drift to pass. The continuation adds a behavioral restore regression, a
source-order rejection, a reviewed-source bundle hash, current macOS/Android/iOS
builds, fresh Android/iOS launches, and refreshed retained hashes. This remains
archive evidence only; it does not move the frozen React RC or authorize npm.

## 2026-08-04 — Distinguish tracked mobile resources from generated web assets

Decision: treat the sixth review as a packet-inventory failure plus a useful
clean-checkout question, not as proof that tracked resources are absent. Start
a second linked continuation, require the tracked wrapper/storyboard/catalog in
the verifier, bind all 27 current source/resource files, and terminate only
after an iOS build succeeds with the generated `assets/` directory absent at
invocation.

Rationale: Git confirms the Gradle wrapper JAR, storyboard, and complete asset
catalog are tracked. Tauri recreated the source-empty web-assets directory
before Xcode copied resources and produced the simulator bundle. This closes
the critic's actual evidence gap without adding a placeholder file to a
tool-owned generated directory or weakening platform/release classifications.

## 2026-08-04 — Require exact proof for every withheld destructive command

Decision: accept the seventh isolated review's critical finding and start a
third linked continuation. Terminate only after the current application invokes
both destructive commands, exact native denial shapes are recorded and
machine-checked, and current target artifacts are rebuilt from the expanded
reviewed source bundle.

Rationale: omission of both permissions from the capability manifest is a real
native authorization boundary. A successful denial for `graph_clear` cannot
prove `graph_remove_entity` is also withheld at runtime. The corrected service
sequentially invokes both commands, rejects unexpected success or any inexact
error, and retains both Android native messages. This closes the observed gap
without granting a permission, fabricating a browser result, or changing the
frozen React RC.

## 2026-08-04 — Require exact denial equality and known queue identities

Decision: accept both critical findings from the latest isolated review and
start a fourth linked continuation. Terminate only after decorated denial
messages are rejected, unknown persisted task IDs fail before graph hydration,
all current targets rebuild, and refreshed runtime receipts match the corrected
source bundle.

Rationale: capability-error text and durable queue bytes cross actual trust
boundaries. Substring matching can relabel a transport or decorated error as a
real authorization denial, while shape-only queue validation can introduce an
unknown entity reference before the canonical graph is ready. Exact equality
with the two observed native messages and membership in the deterministic
seed-task set are the minimum corrections. They add no new public API, grant no
permission, and do not move the frozen React RC.

## 2026-08-04 — Require canonical and unique persisted mutations

Decision: accept the latest isolated review's queue-integrity finding and start
a fifth linked continuation. Terminate only after every restored mutation uses
the canonical `task-status:<known-task-id>` identifier, a timestamp that round
trips exactly through ISO serialization, and a task ID that appears once in the
queue; rebuild all current platform artifacts and rebind the receipts.

Rationale: durable queue bytes are an actual untrusted persistence boundary.
Known entity membership alone did not prove mutation identity, timestamp
canonicalization, or the one-pending-mutation-per-task invariant enforced by
the writer. Eleven behavioral units, twenty-two rejection-aware source
contracts, current macOS/Android/iOS builds, exact Android dual denial, and the
refreshed 30-file SHA-256 binding now provide direct evidence. No public API or
frozen React RC source changed.
