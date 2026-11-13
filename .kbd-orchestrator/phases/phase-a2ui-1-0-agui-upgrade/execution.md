# EXECUTION: phase-a2ui-1-0-agui-upgrade

- **Dispatched:** 2026-11-12 · **Backend:** `openspec` (CLI 2.0.0, managed runner), driven one task at a time by
  `kbd-apply` (`begin-task` / `end-task`). Bare `/opsx:apply` is never used.
- **Contract:** `adopted-contract.json`, digest `a33d62a7…`, decision
  `contract-adoption-phase-a2ui-1-0-agui-upgrade-a33d62a7` (binding revision 2). Readiness: **READY**.
- **Method:** `implementation-first` (operator-selected, decision
  `method-phase-a2ui-1-0-agui-upgrade-implementation-first`); method context `RESOLVED_REFERENCES`.
- **Scope:** all 11 changes / 52 tasks in `plan.md`, in plan order, sequential in this checkout (A-10).

## Dispatch contract

- **Driver:** the active Claude Code session (`claude-opus-5-5`) owns every `begin-task` / `end-task` and all
  canonical transitions. Workers return results to it as evidence only.
- **Routes:** per the Task model assignments table in `plan.md` (D = this session; I = Agent tool `model: "sonnet"`;
  R = Agent tool `model: "fable"`). Each worker receives: task key, scope, working directory (repo root),
  tools (Read/Edit/Write/Bash/Grep), the applicable lessons below, and returns a summary of files changed.
  Routes are rechecked before each dispatch; any change of route is recorded here first.
- **No intermediate verification.** No tests, typechecks-as-evidence, builds-as-loop, artifact refinement or
  review after individual tasks or changes (A-9, CLAUDE.md). Permitted during implementation: dependency
  install, implementation probes named in the plan (`agui-1-0-floors-and-middleware-interop#2`,
  `agui-1-0-chat-run-stack#2`), and at most one scoped compiler check to resolve a concrete blocking question,
  never cited as evidence.
- **Final gates (once, after all production work):** `a2ui-1-0-release-sync#5` isolated diff review, then the
  boundary packet in `adopted-contract.json` (`a2ui-1-0-release-sync#6`), then `kbd-apply verify` / `archive`
  (`a2ui-1-0-release-sync#7`).
- **Operator-only actions** (asked once, at the end): commit/merge, the 5.0.0 tag, npm publish.

## Lessons the work must respect (from `prior-context.md`)

- Boundary gates launch the packaged artifact; source suites are not evidence.
- Each external integration gets one real-service run (middleware, A2A SDK, AG-UI client).
- Pinned runtime first on PATH; the `modern-python` shim is removed for scripts that call `python3`.
- Evidence goes to a new dated folder with a README; earlier folders are never rewritten.
- Ask once at the phase boundary for merges, tags and machine-level changes.

## Progress log

Appended as each change completes (implementation only; evidence and certification stay pending until the
boundary run).

- **2026-11-12 — `a2ui-0-15-library-baseline` implemented (5/5).** `@a2ui/*` at 0.15.0; patches
  `@a2ui__web_core@0.15.0.patch` (zod/v3 + three #75 imports) and `@a2ui__react@0.15.0.patch` (declarations to
  zod/v3; added during the change, see its design.md); declarations re-bundled with `rollup-plugin-dts@6.5.1` so
  `dist/*.d.ts` no longer import `@a2ui/*`; `@a2ui/web_core` moved to devDependencies;
  `PrometheusA2uiComponentImplementation` widened to `ReactCatalogComponent` (public type change). Scoped checks
  used to resolve implementation questions (not evidence): one `tsc --noEmit` on the package, three package
  builds (size measurement and declaration mechanism), one NodeNext probe for #75. Bundle +48% raw.
  Open for the boundary: headless Node import of the Lit-based catalog (UPG-13); Node 26 vs the 22/24 preamble.

- **2026-11-12 — `a2ui-v1-native-surfaces` implemented (7/7).** `runtime-core.ts` 925 → ~480 lines (AG-UI
  transport moved to `agui-activity.ts`); 1.0 catalog built on upstream `catalogs/basic/v1` with id
  `urn:prometheus-ags:a2ui:catalog:a2ui-1.0`, both runtimes default to v0.9.1 + 1.0 catalogs; 1.0 envelopes go
  to the official processor's 1.0 adapter (`v1-messages.ts`, `@`-key translation); RC downgrade removed from the
  core; capabilities per protocol; processor errors → `protocol-error` + `protocolCode`; theme/catalog split in
  shadow seed, export and activity plan; ARIA wrapper for app React components; release contract baseline 1.0.
  Finding: the official processor handles 1.0 function messages natively (reshapes change 3). No checks run.

- **2026-11-12 — `a2ui-v1-functions-and-actions` implemented (7/7).** 1.0 function messages run in the official
  processor (outbound channel wired); `callAgentFunction` API with `writeTo`; 1.0 `action` messages; policy keeps
  1.0 action fields; opt-in RC shim (`rc-shim.ts`) replaces `v1-compat.ts` (deleted); `dispose()` rejects pending
  RPC; `keysOf` mirrors official `parsePath`; 1.0 `error` messages for refused batches. `onFunctionCall` removed
  (breaking). One scoped `tsc --noEmit` on a2ui-react (not evidence) found 2 errors, fixed; now clean.

**Queued for the operator (contract amendment before the boundary run):** UPG-2's oracle names an
`a2ui_recovery` activity that `@ag-ui/a2ui-middleware@0.0.16` does not emit; the real mechanism is an
`a2ui-surface` lifecycle activity with `status: "failed"` (see agui-1-0-floors-and-middleware-interop design.md).
The middleware version is 0.0.16, not 0.0.15. The boundary preamble also asserts Node 22/24 while this host runs
Node 26 (allowed by `engines`).

- **2026-11-12 — `agui-1-0-floors-and-middleware-interop` implemented (4/4).** AG-UI `^1.0.0` everywhere, root
  devDeps incl. `@ag-ui/a2ui-middleware@0.0.16`; type map recorded; **defect found and fixed**: the runtime threw on
  the middleware's lifecycle activities (`status` without operations). UPG-2 needs an amendment (see queue above).
- **2026-11-12 — `a2a-official-a2ui-extension` implemented (5/5).** SDK 1.3.0; official URI/media type; DataPart
  `data` = message list; per-turn capability gating (spec MUST); framework-free `a2uiInbound` handler for client
  actions, default deny. Verifier rewrite moved to `a2ui-1-0-release-sync#1` (A-9).

- **2026-11-12 — `agui-1-0-chat-run-stack` implemented (5/5).** AG-UI 1.0 events, `streamFactory(messages, {
  signal })`, run tokens (late events dropped), messages as graph entities via `ChatConversationStore`, reasoning
  rendering. Deviation: no executed pre-fix reproduction of the abort defect (HEAD source cited instead).
- **2026-11-12 — `agui-interrupt-approvals` implemented (3/3).** Interrupt outcome → approval → policy decision →
  `resume[]`; fail closed without a policy; new `EntityInterruptApproval`. One scoped `tsc --noEmit` on
  a2ui-react after changes 6–7 (not evidence): clean.

- **2026-11-12 — `a2ui-governed-actions-graph-binding-design` done (2/2).** W5 threat model and attestation shape;
  W6 binding and explicit conflict policy. Spike measurements not run (recorded).
- **2026-11-12 — `examples-a2ui-1-0-migration` implemented (4/4)** by a profile-I worker (`claude-sonnet-5-5`),
  reviewed by the driver (fixture digests re-hashed and matching; SDK 1.3.0 resolved; no stale envelope literals).
  Open: legacy root browser spec still RC-shaped; external-executor metadata forwarding unverified.

**Checkpoint (all production changes implemented, 9/11).** Remaining: `a2ui-v1-conformance-harness` and
`a2ui-1-0-release-sync` (acceptance authoring, docs, skills, changeset, isolated review, boundary run, archive).
Pending operator action before the boundary: sign `amendment-execution-findings-2.json` (digest a33d62a7… →
41984670…). The contract file on disk already holds the amended text; until it is adopted, readiness and method
checks will report the contract as changed since adoption.
