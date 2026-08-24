# Decision Log — full-3.0-release

## 2026-08-01T10:43:46Z — Analyze mode

**Decision:** Use stack-specified mode.  
**Reason:** React 19/Vite 8, Next.js, agentic A2UI, Flutter/Riverpod, and Tauri desktop/mobile were explicitly requested. No stack-discovery scoring or contested-stack elicitation is required.  
**Provenance:** user request + `.kbd-orchestrator/project.json`

## 2026-08-01T10:43:46Z — Shared example contract

**Decision:** Build one shared Project/User/Task/Comment/Activity domain with deterministic scenario IDs and a machine-readable feature coverage manifest. Each example owns framework-specific evidence rather than reproducing every route.  
**Reason:** Five independent showcase applications would drift and would not prove that all public capabilities are exercised.  
**Provenance:** repository inspection + engineering analysis

## 2026-08-01T10:43:46Z — A2UI protocol ownership

**Decision:** Adopt official `@a2ui/react`/`@a2ui/web_core` and Flutter `genui`. Reclassify the current `@prometheus-ags/a2ui-react` implementation as AG-UI/chat projection behavior and move or rename that behavior before rebuilding the package as an official-A2UI integration.  
**Reason:** The current package processes `MESSAGE_*`, `TOOL_CALL_*`, and `STATE_*` events but does not implement A2UI surfaces, catalogs, data models, JSONL parsing, schema validation, or action messages. Official maintained engines now cover those concerns.  
**Provenance:** local source inspection + official A2UI renderer guidance + npm/pub registries

## 2026-08-01T10:43:46Z — Flutter consolidation

**Decision:** Do not ship `entity_graph_flutter` and KnowMe `prometheus_entity_management` as competing canonical architectures. Preserve the current tested Dart graph/SDL behavior as a lower layer or transport, combine it with generic Riverpod 3 provider/view/CRUD APIs, and keep Rust/FRB behind a pluggable host adapter.  
**Reason:** One implementation owns a Dart graph; the other assumes Rust is canonical. A transport seam supports both hosts without embedding KnowMe's runtime in the general package.  
**Provenance:** local package comparison

## 2026-08-01T10:43:46Z — External source migration boundary

**Decision:** Move only reusable KnowMe Flutter package slices, using a clean commit and provenance-preserving filtered history after license authorization. Do not copy the dirty product working tree. Keep KnowMe Builder templates in their generator repository and update them downstream.  
**Reason:** KnowMe has unrelated product/runtime dependencies and no root LICENSE in the assessed checkout; Builder explicitly owns templates and non-destructive upgrades.  
**Provenance:** external repository manifests, AGENTS.md files, working-tree inspection

## 2026-08-01T10:43:46Z — gen_ui_flutter placeholder

**Decision:** Reject moving `flutter_packages/gen_ui_flutter` as-is.  
**Reason:** It is an approximately 30-line unused placeholder; the actual generated bindings and native linking live in KnowMe mobile and depend on `gen_ui_core`. Moving it would create a dead public-looking package.  
**Provenance:** source and pubspec inspection

## 2026-08-01T10:43:46Z — Tauri example scope

**Decision:** Build one clean Tauri 2 React/Vite example for desktop, iOS, and Android from the official template; use KnowMe desktop only as a pattern reference. Require plugin-level mobile evidence, not only shell compilation.  
**Reason:** KnowMe's Tauri application is desktop/product-specific, while the current graph plugin lacks a runnable consumer, real generated bindings, and mobile certification.  
**Provenance:** local source inspection + official Tauri mobile/plugin documentation

## 2026-08-01T10:43:46Z — Cross-ecosystem orchestration

**Decision:** Keep pnpm/Turbo authoritative for JavaScript, use a Dart workspace plus Melos for Dart/Flutter, and use Cargo for Rust/Tauri. Invoke all three through one root release-certification command. Use Changesets only for npm version/publish state.  
**Reason:** Each ecosystem needs native package semantics; a stable release still needs one auditable aggregate verdict.  
**Provenance:** candidate research + existing monorepo layout

## 2026-08-01T10:43:46Z — Deferred specification choices

**Open:** KnowMe source license, canonical Flutter pub package name, Flutter store guarantee, A2UI v0.9.1 versus v1.0 timing, alpha A2UI package repurposing, mobile device evidence, registry launch scope, and whether broader ContentBlock widgets belong in this repository.  
**Default recommendations:** recorded in `analysis.md` under “Open questions for Spec.”  
**Provenance:** analysis risks requiring a public product contract

## 2026-08-01T10:51:00Z — Adversarial review revisions

**Decision:** Expand the phase goal to carry the user's five explicit example stacks and cross-repository Flutter consolidation request into review packets.  
**Reason:** The first isolated review only saw the original npm-release goal and correctly could not verify why stack discovery was skipped.  
**Provenance:** adversarial review round 1 + user request

**Decision:** Distinguish A2UI npm distribution versions from protocol versions. Adopt the maintained 0.10.x official packages, target their v0.9.1 current-production protocol entry point, and isolate candidate v1.0 behind an adapter.  
**Reason:** Package `0.10.x` and protocol `v0.9.1` are not competing version numbers.  
**Provenance:** official A2UI version-aware renderer documentation + adversarial review round 1

**Decision:** Adapt the existing `entity-graph-a2a` package as the deterministic reference-agent base, conditional on an upstream A2A conformance/version matrix and A2UI artifact/metadata adapter.  
**Reason:** The second review found that A2A was marked primary without candidate evaluation.  
**Provenance:** local A2A source inspection + adversarial review round 2

**Decision:** Use PGlite persistence plus Loro deterministic two-client convergence as the mandatory local-first example path. Keep Yjs as a secondary fixture and sibling `prometheus-entity-sync` as an opt-in external contract lane.  
**Reason:** The second review found that persistence/sync was required without a selected provider path.  
**Provenance:** local `entity-graph-sync` and core adapter inspection + adversarial review round 2

**Decision:** Make assistant-ui and Publint/Are The Types Wrong conditional on current maintenance checks in Spec/Plan; retain accessible shell and direct packed-consumer smoke fallbacks.  
**Reason:** Analyze reached the registry query cap before current maintenance metadata was collected.  
**Provenance:** research budget + adversarial review rounds 1–2
