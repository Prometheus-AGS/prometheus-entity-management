# PLAN: v3-devtools-parity

**Plan revision:** 7
**Canonical authority:** signed KBD runtime revision 290
**Changes:** 9
**Execution policy:** implementation first; full integration/acceptance evidence only
**Model class:** frontier fallback because `project.json` has no model-policy registry

## Outcome

Deliver equivalent, store-isolated DevTools capabilities for the TypeScript/React and Dart/Flutter entity graphs, with embedded and official extension surfaces, truthful documentation, and one immutable release-certification boundary. DevTools must remain optional, bounded, inspectable, and unable to become a second source of business truth.

## Ordered changes

### 1. `v3-devtools-core-observability`

- **Depends on:** none
- **Outcome:** versioned `./devtools` protocol; per-store controller and lifecycle; one semantic instrumentation boundary; bounded history; transport-independent client; default-store compatibility delegates.
- **Execution:** re-audit and implement the entire production path, then run one assembled core/React/packed-consumer integration gate, update ledgers/docs/evidence, refine, review, and archive.

### 2. `v3-devtools-entity-inspection`

- **Depends on:** core observability
- **Outcome:** entity, list/view, relationship, error/dirty, and conflict-safe preview/restore projections shared by downstream surfaces.
- **Execution:** implement production tasks 1–5 without partial tests; run one assembled multi-store packed-consumer integration gate; then synchronize docs/fixtures/evidence, refine, review, and archive.

### 3. `v3-devtools-time-travel`

- **Depends on:** core observability
- **Outcome:** controller-owned bounded snapshots, rewind, mutation ordering while rewound, expired-history reporting, and exact return-to-live.

### 4. `v3-devtools-react-inspector`

- **Depends on:** entity inspection and time travel
- **Outcome:** React `./devtools` provider/hooks/view models; automatic development-mode lazy bootstrap and visible FAB; explicit host plus keyboard/persisted hide/restore controls; an accessible responsive dock/floating inspector; Overview, Entities, Views, and Activity workspaces; Graph Pulse causality; original/patch/live dirty diffs; truthful rendered-view membership; entity history; and Vite/Next public-entry scenarios.
- **Design contract:** `.kbd-orchestrator/phases/v3-devtools-parity/ui-spec.md`.
- **Acceptance:** one complete packed Vite/Next/browser flow proves production exclusion, automatic development activation, hide/restore, dirty/original/view/history workflows, responsive layouts, keyboard and screen-reader access, and responsive interaction under a 500-event stream. Unit, isolated, mock-backed, snapshot, and partial evidence is excluded.

### 5. `v3-devtools-flutter-controller`

- **Depends on:** core observability, entity inspection, and time travel
- **Outcome:** Dart protocol parity, per-graph controller, Riverpod/list lifecycles, bounded VM-service bridge, projections, preview, and history.

### 6. `v3-devtools-chrome-extension`

- **Depends on:** React inspector
- **Outcome:** deterministic private MV3 workspace and secure tab-isolated multi-panel bridge using the shared inspector and metadata-first policy.

### 7. `v3-devtools-flutter-extension`

- **Depends on:** Flutter controller
- **Outcome:** official Flutter DevTools extension package with complete workflows, connection states, responsive accessibility, and sanitized package contents.

### 8. `v3-devtools-docs-examples`

- **Depends on:** React inspector, Flutter controller, Chrome extension, and Flutter extension
- **Outcome:** canonical operations/setup/security/troubleshooting guidance, Vite/Next/Flutter scenarios, README/API/skills/version parity, and sanitized evidence.

### 9. `v3-devtools-release-certification`

- **Depends on:** all preceding changes
- **Outcome:** immutable-SHA packed consumer, browser, Flutter, extension, security, performance, docs, and evidence certification. Publication remains a separately authorized action.

## Verification strategy

- During implementation, use source inspection and only narrowly scoped compiler/parser/type feedback when a concrete uncertainty requires it.
- Do not create or run unit, component, isolated, snapshot, mock-backed, or partial suites.
- At each change's implementation boundary, run its complete assembled integration/acceptance gate once. Fix observed production defects and rerun the same complete gate.
- At archive boundaries, run artifact-refiner first and an artifact-only isolated adversarial review second.
- At release certification, run packed consumers and the full cross-surface acceptance matrix from one immutable source SHA.

## Progress rule

`.kbd-orchestrator/phases/v3-devtools-parity/progress.json` is the phase-local counter. The project-wide counter in `position-reminder.txt` must never be reported as this phase's progress.
