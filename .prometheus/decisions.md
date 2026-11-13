# Decisions

## 2026-08-03 — React graph bindings support explicit store scope

The React package retains its established default graph singleton, but all
React hooks now resolve an optional nearest `GraphStoreProvider`. Next.js uses
an application-owned store created from a request-owned dehydrated snapshot.

Rationale: mutating a module singleton during Server Component rendering leaks
entity state across concurrent requests. A provider preserves compatibility for
existing browser consumers while making the server/client ownership boundary
explicit and testable. Store-specific engine registries prevent equal query
keys in different requests from sharing in-flight work or subscriber state.

## 2026-08-03 — Archive Next.js with queued-flush warning retained

The bounded Next.js change may archive after a cross-model PASS even though a
replaced scoped realtime manager can flush an already-queued batch into its
abandoned old graph before the timer expires.

Rationale: adapter cleanup stops new events, the queued batch cannot cross into
the replacement graph, and KBD classifies warnings as non-blocking. An explicit
`RealtimeManager.dispose()` contract would change the public lifecycle surface
and belongs in the later coordinated prerelease, not as unreviewed expansion of
the completed Next change. The warning remains in the review and verification
artifacts until that follow-up is implemented and tested.

## 2026-08-03 — Isolate official GenUI behind the Flutter example

The Flutter showcase exact-pins `genui 0.10.1` and isolates its API behind an
app-local safe surface adapter. It does not promote GenUI types into
`entity_graph_flutter` or copy KnowMe's product/media widget package.

Rationale: official GenUI owns the maintained A2UI parser and renderer, while
its upstream repository explicitly labels the API highly experimental. The
isolation preserves official protocol ownership without turning that unstable
surface into a Prometheus 3.0 library compatibility promise.

## 2026-08-03 — Adapt shared A2UI semantics at one Flutter wire boundary

The Flutter fixture reuses the shared tenant, entity IDs, surface ID, actions,
and policy outcomes but sends the `v0.9` wire identifier required by official
GenUI 0.10.1. The existing TypeScript fixture remains 0.9.1.

Rationale: relabeling the Flutter stream 0.9.1 would be rejected by the current
official parser; claiming the two byte formats are identical would be false.
The explicit adapter keeps semantic coverage shared and makes the remaining
cross-runtime protocol-version difference inspectable.

## 2026-08-03 — Represent Flutter host evidence as partial

The example coverage contract now supports `partial` showcase status. The
Flutter showcase uses it for host analyzer, test, and golden evidence until the
release-floor SDK and both native integration lanes pass.

Rationale: leaving the showcase planned would discard observed evidence, while
marking it implemented would falsely certify Android/iOS and stable-SDK gates.
A constrained intermediate state keeps evidence inspectable and prevents both
forms of misreporting. The validator rejects partial entries that still have
planned evidence and requires fully complete evidence to use implemented.

## 2026-08-06 — Separate registry snapshots from release-scope decisions

The immutable 3.0 release contract continues to describe which registries are
required or deferred for coordinated stable release. Current external state is
recorded separately in npm and pub.dev registry-status manifests consumed by
README and documentation parity checks.

Rationale: publishing Flutter after its original deferred gate does not rewrite
what that gate authorized. Separate live snapshots preserve history while
preventing source, staged, published, and stable states from being conflated.

## 2026-08-29 — Observe DevTools at the store publication boundary

The v1 core DevTools controller subscribes once to each attached `GraphStore`
and projects semantic entity, patch, fetch-state, sync, and list changes from
the completed Zustand publication. Action call sites are not a second event
source.

Rationale: hydration, rollback, restore, adapter writes, and public direct
`store.setState` calls can bypass individual graph action methods. The store
publication boundary observes all of them without changing graph ownership or
duplicating events. Each store owns its reference-counted controller and
bounded history; values remain metadata-only unless the host explicitly opts
into a redaction policy.

## 2026-08-29 — Keep one controller-owned time-travel snapshot policy

Each attached DevTools controller owns one snapshot ring for its `GraphStore`,
separate from event history but governed by one simultaneous count-and-byte
policy. The defaults retain at most 50 whole snapshots and at most 10 MiB,
evicting the oldest complete snapshots until both ceilings hold. Stable cursor
IDs are never reused, and evicted cursors remain visibly expired.

Rationale: event values may be metadata-only, redacted, or independently
evicted, so event retention cannot safely double as rewind storage. A single
controller-owned snapshot policy removes the legacy second owner, preserves
store isolation and deterministic teardown, and gives React and Flutter one
portable meaning for retention, expiry, rewind, and exact return-to-live.

## 2026-08-29 — React DevTools uses explicit optional entries and Shadow DOM isolation

The React package preserves its ordinary root as a side-effect-free production
surface. The new `./devtools` entry is also side-effect-free and owns the
provider, hooks/view models, explicit host component, and lazy inspector
control. `./devtools/auto` is the only import-time mounting surface and is
declared side-effectful so consumer bundlers do not erase the explicit debug
opt-in. It checks development/host mode before loading the heavy inspector or
touching the DOM and emits no server markup.

The embedded inspector mounts into one open Shadow Root. Its CSS is scoped
inside that root, performs no host reset or remote font request, and consumes
inherited `--pem-devtools-*` overrides with self-contained fallbacks. This
keeps the debug UI visually reliable without contaminating the application and
preserves intentional host theming. The existing lightweight
`useGraphDevTools` root export remains compatible but does not import the new
inspector.

## 2026-08-30 — Route Flutter DevTools through one isolate-wide VM-service registry

The Dart package registers one versioned discovery method and one versioned
command method per isolate, then routes every command through an explicit
active `storeId`. Controllers attach and detach from that registry with their
graph bindings; the VM-service methods remain registered with an empty registry
after the final detach because Dart service-extension registration is
isolate-global and cannot be unregistered.

Rationale: registering methods per graph would collide at the Dart VM-service
boundary, while an implicit default graph would break multi-store isolation.
One inspectable registry supports multiple graphs and deterministic controller
teardown without creating a second owner of business state. Commands cannot
alter the host-owned value/redaction policy.

## 2026-08-30 — Certify Flutter DevTools from outside the VM-service boundary

The Flutter controller acceptance gate launches a real debug application and
uses an external Node client to discover its VM-service URI, subscribe to the
Extension stream, and invoke the production service-extension methods. A
test-only exact-parameter control method drives public graph operations inside
the app; all observations and DevTools commands cross the real serialized
boundary.

Rationale: an in-isolate unit or widget test could call the controller directly
and still leave registration, JSON-RPC routing, Extension events, isolate/store
discovery, payload ceilings, redaction, and teardown unproved. One external
assembled flow covers those boundaries while also mounting the real Riverpod
entity/list providers and avoids multiplying partial suites.

## 2026-08-30 — Separate Dart source version from registry inclusion

The optional DevTools ledger keeps the repository pubspec version for source
API drift but derives publication status from
`release/pubdev-registry-status.json` and its explicit included-public-library
list. The published `3.0.1` archive excludes `devtools.dart`, so the ledger is
machine-marked `repository-source-only` until a later registry snapshot proves
otherwise.

Rationale: source can advance after a registry publication without changing the
manifest version immediately. Encoding both facts prevents a source ledger
from becoming a false pub.dev availability claim and makes later publication
status a checked data transition rather than a remembered code edit.

Before the next pub.dev release, the release-certification phase must add and
pass one ordinary-library assembled Flutter/Riverpod acceptance flow. The
controller acceptance proves the optional debugger path and does not substitute
for the normal graph/provider/transport/rendering release boundary.

## 2026-08-30 — Immutable registry mutation is the final release action

For a pub.dev release, freeze and commit the candidate, run its complete
assembled acceptance, finish artifact-only distinct-model review, build and
validate official extension assets, refresh public ledgers, and pass the
zero-warning dry run before publication. After publication, only registry,
archive, clean hosted-consumer, and documentation verification may remain.

Rationale: publishing Flutter 3.0.2, 3.0.3, and 3.0.4 before the final review
exhausted lifecycle/evidence findings created immutable intermediate versions
and forced 3.0.5. Pub registries cannot replace those archives. Treating
publication as the last mutation makes the reviewed frozen SHA and uploaded
archive the same artifact.

History-import cancellation is candidate-ID-bound and non-destructive. A
mismatched client cannot cancel the pending candidate; repeating a completed
cancellation is a safe no-op; cancellation does not clear retained history.
This preserves multi-client availability without letting one debugger destroy
another client's retained evidence.

## 2026-11-12 — A2UI 1.0 / AG-UI upgrade scope (phase-a2ui-1-0-agui-upgrade)

Operator adopted assessment decisions D1–D8 as recommended:
- D1: target `@a2ui/web_core`/`@a2ui/react` 0.15.0; accept bare and `@`-prefixed
  envelope keys (spec #4044) via a small key-translation step; re-pin when a
  release containing #4044 ships.
- D2: route 1.0 messages through the multi-version `MessageProcessor`, delete the
  RC downgrade in `v1-compat.ts`, and split the catalog layer by protocol version
  (a 1.0 catalog with its own id beside the v0.9.1 catalog), because the processor
  only pairs a 1.0 message with a 1.0 catalog.
- D2a: re-express response-aware actions as 1.0 function calls and amend the
  `a2ui-action-envelope` and `a2ui-headless-runtime` specs.
- D3: release as 5.0.0 (all 13 fixed packages move) with a migration guide and an
  opt-in RC-input shim for one minor line; tagging needs operator go-ahead.
- D4: in scope W1–W4, W7 and the A2A move to the official extension; W5/W6 as
  spiked design work; W8–W12 deferred; chat messages into the graph folded into W3.
- D5: AG-UI peer floors `^1.0.0`. D6: pnpm patch for #75, keep `skipLibCheck: false`.
- D7: Flutter out of scope. D8: accept client-only rendering for the basic catalog.

Rationale: 1.0 final and @a2ui 0.15.0 break the RC bridge on wire format, library
API and catalog pairing (assessment G1, G13); see
`.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/assessment.md` §9.

## 2026-11-12 — Plan refinements accepted (phase-a2ui-1-0-agui-upgrade)

Operator accepted ("Accept both") two refinements of adopted decisions:
- D6: keep the pnpm patch for #75 in-repo, and additionally make the published
  a2ui-react declarations independent of the upstream file, because the packed
  `dist/index.d.ts` imports the unpatched registry `@a2ui/web_core`. Goal
  (no `skipLibCheck`) unchanged.
- D4: AG-UI `SUBAGENT_*` events and multimodal message parts are excluded from
  this phase; adding them back needs a contract amendment.

## 2026-11-12 — Contract amendment and method (phase-a2ui-1-0-agui-upgrade)

- Contract amended (identifier format only: ownerTask `<change>#<n>` → `<change>/<n>`), digest
  19abd871… → a33d62a7…, decision contract-adoption-phase-a2ui-1-0-agui-upgrade-a33d62a7.
- Provenance: the amend-contract manifest signature was made by the agent using the operator's
  ~/.ssh/id_ed25519 on the operator's explicit instruction in chat ("sign the contract for me").
  It is operator-authorized, but not hand-signed; audit readers should not assume otherwise.
- Method: implementation-first, selected by the operator (decision
  method-phase-a2ui-1-0-agui-upgrade-implementation-first).

## 2026-11-12 — Contract amendment 2 (phase-a2ui-1-0-agui-upgrade)

- Digest a33d62a7… → 41984670…, decision contract-adoption-phase-a2ui-1-0-agui-upgrade-41984670 (binding
  revision 3): UPG-2 lifecycle `failed` status and middleware 0.0.16; UPG-9 per-turn capability rule and verifier
  task moved to release-sync; UPG-7/UPG-17 callAgentFunction/agentFunctionResponse naming and data-model limit;
  UPG-11 evidence wording; boundary preamble accepts Node 26.
- Provenance: signed by the agent with the operator's ~/.ssh/id_ed25519 on the operator's explicit instruction
  ("Sign and continue"). Method decision rebound to the new digest (supersedes the first).

## 2026-11-12 — Operator: Flutter A2UI 1.0 parity and npm publication (phase-a2ui-1-0-agui-upgrade)

Operator instruction: "when workers are done, we must ensure parity on the flutter side for A2UI 1.0 and publish
to NPM". Reverses D7 (Flutter out of scope); needs a contract amendment adding a Flutter change and scenario and
removing the Flutter exclusion. npm publication of the 5.0.0 fixed group is authorized by the operator, to run only
after the boundary run and isolated review pass (exact version and dist-tag confirmed right before publishing).

## 2026-11-12 — Flutter renderer for A2UI 1.0 parity (phase-a2ui-1-0-agui-upgrade)

Operator chose `a2ui_flutter` 0.3.0 (official A2UI Flutter renderer, on `a2ui_core` 0.7.0, both published 2026-11-11)
over `genui` 0.10.x (still on `a2ui_core ^0.1.0`). Scope: the examples/flutter-riverpod showcase replaces genui and its
RC→v0.9 translation layer with native 1.0 rendering, keeping the Riverpod action policy. entity_graph_flutter is
unchanged (no A2UI code), so no pub.dev release.

## 2026-11-12 — Contract amendment 3 (phase-a2ui-1-0-agui-upgrade)

- Digest 41984670… → c5c06a04…, decision contract-adoption-phase-a2ui-1-0-agui-upgrade-c5c06a04 (binding
  revision 4): adds UPG-18 (Flutter A2UI 1.0 on a2ui_flutter 0.3.0, owner flutter-a2ui-1-0-parity/3, entry
  `pnpm run verify:flutter-a2ui-v1`); UPG-3 now allows a digest-bound divergence list
  (tests/conformance/a2ui/divergences.json, each case failing only on its named assertion); D7 Flutter exclusion
  removed; npm publication allowed after the boundary run and review, with version and dist-tag confirmed by the
  operator immediately before.
- Provenance: signed by the agent with the operator's ~/.ssh/id_ed25519 on the operator's explicit instruction
  ("Sign and continue"). Method decision rebound to the new digest (r3 supersedes r2).

## 2026-11-12 — Contract amendment 4 (phase-a2ui-1-0-agui-upgrade)

- Digest c5c06a04… → a0015a75…, decision contract-adoption-phase-a2ui-1-0-agui-upgrade-a0015a75 (binding
  revision 5). Wording fixes found while authoring acceptance: UPG-3 divergence entries name every allowed
  (step, assertion); UPG-1 RC refusal is error code unsupported-protocol-version; UPG-6 answer is
  rendererFunctionResponse; UPG-12 component is EntityInterruptApproval; UPG-13 Node 22 or later.
- UPG-8 narrowed, operator-accepted: "without a gesture" means programmatic resolveAction with userActivation false.
  The official 0.15.0 binder resolves bound actions with userActivation true, so a script-dispatched element.click()
  is likely not gated; not covered by this phase's acceptance.
- Provenance: signed by the agent with the operator's ~/.ssh/id_ed25519 on the operator's explicit instruction
  ("Sign and continue"). Method decision rebound (r4 supersedes r3).

## 2026-11-12 — Visual accessibility gate exception (phase-a2ui-1-0-agui-upgrade)

- Operator decision ("Record as exception"): `verify-a2ui-visual-evidence.mjs` allows axe `aria-prohibited-attr`
  *incomplete* results only when every target is an official `a2ui-basic-*` host. Reason: @a2ui/web_core 0.15.0 puts
  `aria-label` on role-less Custom Element hosts by design; the upstream accessibility conformance suite reads labels
  from the host and expects Button hosts to resolve to role `button`, so adding a role would break upstream conformance.
  Axe violations are never excepted. Alternative rejected: patching hosts with `role="group"`.
- Same run: the certification page's light card now declares `color-scheme: light` (caption contrast failed because
  the 0.15 components use `light-dark()` under the page's dark scheme).

## 2026-11-13 — Contract amendment 5 (phase-a2ui-1-0-agui-upgrade)

- Digest a0015a75… → bfa43f3b…, decision contract-adoption-phase-a2ui-1-0-agui-upgrade-bfa43f3b: `budgets.repairAttempts`
  10 → 20, nothing else. Nine boundary repairs were spent (corepack fallback in scratch consumers ×2, visual-gate page
  styling and recorded exception, four product defects — isV1Surface, minified error wrapping, A2A h2 variant,
  hyphenated component ids in examples — and three verifier defects); steps 12–14 had not yet run.
- Provenance: signed by the agent with the operator's ~/.ssh/id_ed25519 on the operator's explicit instruction
  ("Raise budget, sign"). Method decision rebound (r5 supersedes r4).

## 2026-11-13 — Conformance divergence widened (phase-a2ui-1-0-agui-upgrade)

- Operator decision ("Allow it, recorded"): `agent_function_action_failure_reports_expression_error` may also fail on
  `steps[2] expectDataModel`. Boundary run 11 showed the bundled @a2ui 0.15.0 renderer, unable to route the
  `lookupAccount` agent function, still runs the button's local `incrementCounter` with the default step (counter 11,
  expected 10). Same upstream-renderer-gap as the entry; the side effect stays visible in the evidence. Alternative
  rejected: patching the renderer to halt an action when an argument fails.

## 2026-11-13 — Contract amendment 6 (phase-a2ui-1-0-agui-upgrade)

- Digest bfa43f3b… → 32b2f2c3…, decision contract-adoption-phase-a2ui-1-0-agui-upgrade-32b2f2c3: functional scope adds
  the pub.dev publication of entity_graph_flutter 5.0.0 with the npm 5.0.0 group (native aligned-major policy), under
  the same operator-confirmation conditions as npm; crates.io stays excluded.
- Provenance: signed by the agent with the operator's ~/.ssh/id_ed25519 on the operator's explicit instruction
  ("Yes, all of it", which listed: sign amendment 6, commit locally, publish npm 5.0.0 on latest+next, publish pub.dev
  5.0.0 after a zero-warning dry run). Method decision rebound (r6 supersedes r5).
