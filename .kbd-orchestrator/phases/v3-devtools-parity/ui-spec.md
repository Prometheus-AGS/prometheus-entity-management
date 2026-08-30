# UI SPEC: Prometheus Entity Graph DevTools

**Status:** design contract for phase `v3-devtools-parity`
**Audience:** application developers debugging normalized graph behavior in Vite, Next.js, Chrome DevTools, and Flutter
**Single job:** answer “what changed, what is dirty, and which rendered views are affected?” in seconds without obscuring the application under inspection

## Decision

Build the React DevTools as a debug-only, lazily loaded instrument dock with an automatically visible launcher in development after one explicit DevTools bootstrap import or mount. The experience centers on an entity-aware causal trace: selecting an event, entity, dirty field, or view highlights the same affected path everywhere—`event -> entity -> patch/original -> views`—without creating a mutable UI-owned duplicate of the live graph. Bounded read-only event/history projections are permitted; the graph remains the only live business-state owner.

This document decides the React embedded and Chrome-panel experience plus the cross-surface vocabulary/protocol. The embedded surface uses the same inspector view models and components as the Chrome panel. Flutter consumes those shared contracts, but its native widget/layout decision is owned and separately reviewed by `v3-devtools-flutter-extension`.

## Activation & escape hatch

- `mode="auto"` is the default. The launcher renders only when the consumer build reports development mode; production renders nothing and does not load the inspector bundle. Consumers opt in once with the explicit `./devtools/auto` import or `<EntityGraphDevtools />`; no normal root import mutates the host DOM.
- “Automatic” therefore means automatic detection and visibility after this one explicit debug-entry opt-in. Zero-import DOM injection is rejected because it would make normal root imports side-effectful and pull DevTools into production graphs.
- `mode="on"` explicitly enables the surface for staging or a controlled debug build. `mode="off"` is a hard host override.
- The launcher is visible by default in enabled mode. A configurable `Mod+Shift+G` chord toggles the panel and restores a hidden launcher; hiding the whole surface is also available from the launcher/panel menu. Browsers cannot enumerate host key handlers, so the shortcut makes no automatic conflict-detection claim: the host can disable/remap it and the documentation lists known browser/OS conflicts. It does not use `Alt+Shift`, which collides with Windows input-language switching.
- A launcher menu provides “Hide until reload” and “Hide for this browser.” The latter is a small versioned local preference.
- Precedence is explicit: `mode="off"` makes the code path unavailable; `mode="auto"` is available only in detected development and respects both hide preferences; `mode="on"` makes the code path available in any environment but still respects user hide preferences. The configured shortcut/menu restores an available hidden surface. There is no implicit host “force visible” mode.
- The launcher supports four corner positions and a compact edge-tab form. Repositioning is a menu action with keyboard parity, not drag-only interaction.
- The panel can float, dock right, or dock bottom. Its last non-destructive layout preference may persist locally. It never changes application graph state merely to remember UI preferences.
- A one-line React bootstrap is required. The heavy inspector is dynamically imported only after enablement and is preloaded on launcher hover/focus.
- The auto entry is client-only. On Next.js it emits no server markup, waits until hydration completes before portal mounting, and does not flash or change the application’s SSR tree.

## Information architecture

Replace the current six equal-weight tabs with four task-oriented workspaces:

1. **Overview** — store selector, live health, dirty/error/fetching counts, active views, event rate, history retention, and recent causal traces.
2. **Entities** — type/entity navigator, status filters, canonical/original value, local patch, merged live value, field diff, relationships, and the views currently containing the entity.
3. **Views** — registered view/list query, completeness and freshness, ordered membership, currently rendered subscribers, reverse entity membership, and the event that last changed it.
4. **Activity** — virtualized event/history stream, correlation grouping, pause/resume, filtering, before/after counts, entity-specific history, rewind state, and return-to-live controls.

Performance metrics are contextual in Overview and Activity rather than a separate low-context tab. Relationship inspection is contextual to an entity and can expand into a graph canvas.

Event history defaults to the lower of 500 events or 5 MB of serialized retained payload. Whole oldest events are evicted; sequence ids are never reused, and a selected evicted event becomes an explicit “expired from history” state. Time-travel snapshots have their own bounded policy and are not implied by event retention.

## Desktop layout

```text
┌ Prometheus Graph · Store A ─────── Live ─ 3 dirty ─ 2 errors ─── [Dock] [×] ┐
│ Overview   Entities   Views   Activity                         ⌘K commands │
├──────────────────────┬───────────────────────────────────┬────────────────┤
│ FIND                 │ ENTITY                            │ CAUSAL TRACE   │
│ [Search entities…]   │ Order / o-1042        DIRTY       │ 14:03 patch    │
│ [Dirty] [Errors]     │                                   │  ↳ Order       │
│                      │ Original | Patch | Live | Diff    │  ↳ 2 fields    │
│ Order            82  │ status  pending → approved       │  ↳ 3 views     │
│  ● o-1042         3  │ total   42.00   → 42.00          │                │
│  ○ o-1043            │                                   │ VISIBLE IN     │
│ Customer         21  │ Relationships                     │ Orders:active  │
│                      │ customer → Customer/c-22          │ Customer:detail│
├──────────────────────┴───────────────────────────────────┴────────────────┤
│ Graph pulse:  fetch ─ ingest[12] ─ patch[o-1042] ─ 3 views updated       │
└───────────────────────────────────────────────────────────────────────────┘
```

The navigator and causal-trace rail can collapse independently. The center entity workspace owns the available width. Dense identifiers truncate with a copy action and full accessible name.

## Narrow & mobile layout

```text
┌ Graph · Store A ─ Live ─ [×] ┐
│ Overview Entities Views Activity │
├──────────────────────────────┤
│ [Search entities…]  [Filter] │
│ Order / o-1042       DIRTY   │
│ Original · Patch · Live      │
│ status pending → approved    │
│                              │
│ [Details] [Views 3] [History]│
└──────────────────────────────┘
```

- Under 720px, the 3-column workspace becomes one pane with a persistent context header and drill-in back navigation.
- The dock respects safe areas and uses contained overscroll. Focused controls cannot sit behind sticky headers or footers.
- Every gesture has a button and keyboard equivalent. The UI never disables browser zoom.

## Signature interaction: Graph Pulse

The memorable element is the **Graph Pulse**, a compact causal ribbon at the bottom of the inspector. It is not decorative telemetry. Each segment represents a real correlated graph publication or lifecycle event; selecting a segment highlights its affected entities, dirty fields, and view memberships across the workspace. Batch ingestion appears as one segment with a count, preserving the graph’s atomic publication semantics.

This depends on a protocol guarantee, not UI inference: the controller emits exactly one ordered semantic event per Zustand publication with stable `storeId`, `sequence`, `eventId`, and `correlationId`, plus all changed entity/list/status projections and before/after counts. Entity inspection snapshots reverse registered-view membership at that event boundary, so the retained event can identify affected view ids. A patch-only publication joins its changed entity ids against that snapshot; an atomic fetched-list ingestion retains entity and list changes under one event id.

Motion is spent here and nowhere else: a newly observed segment enters with a short transform/opacity transition; reduced-motion mode shows an immediate state change. The launcher does not pulse for ordinary traffic. It gains a quiet count badge only for dirty entities or errors that merit attention.

## Entity & dirty-state contract

- **Original** is the canonical server-confirmed record in `entities[type][id]`.
- **Patch** is the local overlay in `patches[type][id]`.
- **Live** is the read-time merge of original and patch.
- **Diff** compares original to live at field-path granularity and identifies added, changed, and removed values without relying on color alone.
- Dirty status is explicit whenever a non-empty local patch exists. The entity list, detail header, view membership, and activity trace use the same dirty predicate.
- Selecting an entity filters history without destroying the broader activity cursor. The inspector shows when the original was last confirmed and each retained update that affected it.
- Preview/restore and time travel are clearly separated. Preview is a local patch workflow; rewind changes the inspected graph cursor and always exposes “Return to live.”
- The embedded inspector reads these values locally from its selected same-origin graph store; they do not cross a serialized transport boundary. Chrome/Flutter/other remote transports remain metadata-only until the host explicitly enables a value/redaction policy. This preserves a safe protocol default without making local dirty-state inspection impossible.

### Remote value policy

- The controller accepts a host-owned policy with `mode: "metadata-only" | "include"` and an optional synchronous `redact(value, context)` function. Context identifies store, entity type/id, field path, event side (`before`/`after`), and destination transport.
- `metadata-only` omits values and reports their availability state. `include` applies redaction before data enters retained history or any serialized envelope; transports cannot escalate the policy.
- Redaction may replace, omit, or summarize a field. The UI distinguishes “hidden by policy,” “redacted,” “not retained,” and an actual `null` value.
- Serialized value payloads have a configured per-event byte ceiling. Oversize values are omitted with typed truncation metadata rather than partially serialized.
- Chrome and Flutter fixtures include allowed ordinary values plus sentinel secret fields; acceptance proves ordinary original/patch/live diffs render while sentinels never enter the transport, history, logs, screenshots, or evidence.

## View membership contract

- A view record has a stable id, human label when supplied, query/list key, completeness mode, freshness/fetch state, subscriber/render count, ordered entity ids, and last-changing event.
- Prometheus React list/view hooks register and clean up rendered-view membership automatically. Custom renderers and external adapters use an explicit registration API. “Every rendered view” always means every registered view; the UI exposes unregistered/unknown coverage rather than implying omniscience.
- Entity detail shows reverse membership: every view containing the entity, its position, visibility/subscriber state, and why it currently matches when that reason is available.
- The inspector distinguishes “in the normalized list” from “currently rendered by a subscriber.” It never claims rendered visibility from list membership alone.

## Visual system

The direction is **forensic instrument, not dashboard**: quiet surfaces, highly legible data, and one live causal signature.

### Palette

- **Kiln Black** `#111416` — shell
- **Instrument Steel** `#1B2227` — working surfaces
- **Trace Line** `#344047` — borders and inactive structure
- **Bone Readout** `#E8E6DF` — primary text
- **Prometheus Ember** `#E85D32` — dirty/error/action attention
- **Signal Mint** `#63C7A8` — live/current/selection trace

Status is always encoded by icon/text/shape as well as color. Host theme tokens can override the scoped `--pem-devtools-*` variables; the default remains fully self-contained.

### Type

- **Display/navigation:** IBM Plex Sans Condensed, with a packaged or system fallback; restrained use in workspace labels.
- **Body/control:** IBM Plex Sans, then system UI.
- **Data/identifiers:** IBM Plex Mono, then `SFMono-Regular`/`ui-monospace`; tabular numerals for counts and timing.

No remote font request is required to inspect an application. If fonts are not packaged, the system fallbacks preserve metrics and legibility.

### Shape & density

- 6px panel radius; 4px control radius; no pill-shaped containers except status filters where the shape encodes toggle state.
- 4/8/12/16/24 spacing rhythm.
- 28–32px data rows on desktop; 40–44px touch targets on narrow layouts.
- Hairline structure is functional: it separates resizable regions and timeline lanes.

## Interaction, accessibility & content rules

- Semantic buttons, links, tabs, tables, lists, headings, labels, and dialogs precede ARIA workarounds.
- Full roving-keyboard tab behavior, visible `:focus-visible`, a focus return target when the panel closes, and `Esc` for the current dismissible layer.
- Icon-only actions have accessible names; decorative icons are hidden from assistive technology.
- Live event counts and connection changes use polite announcements, not per-event screen-reader spam.
- Search remains responsive with deferred filtering. Lists over 50 rows are virtualized; off-screen detail sections may use `content-visibility`.
- Times and counts use `Intl.DateTimeFormat` and `Intl.NumberFormat`. Identifiers are marked `translate="no"`.
- Empty states say what will populate the surface. Errors name the failed operation and the next available action.
- Only `transform` and `opacity` animate; no `transition: all`; reduced motion is first-class.
- Panel state suitable for deep links (workspace, selected store/entity/view/event, filters) has a serializable URL/state adapter for full-page and extension surfaces. Embedded mode may keep it session-local unless the host supplies synchronization.

## React implementation constraints

- The public root does not import the inspector. `./devtools` owns the debug bootstrap, provider, hooks, and lazy entry.
- Development-mode and host-mode checks happen before the dynamic import. Hover/focus preloads the inspector so opening feels immediate.
- Controller subscriptions are stable and store-scoped. High-frequency event buffers live outside React render state; visible projections publish on a bounded frame cadence.
- Split subscriptions by workspace and subscribe to derived counts/booleans instead of the entire graph.
- Entity search uses `useDeferredValue`; expensive relation and diff projections are independently memoized.
- Hidden workspaces use the public `Activity` API from the pinned React 19.2.x line to preserve useful UI state while deferring hidden layout effects. Consumers on an older compatible peer range fall back to unmount/remount semantics rather than a private API.
- The activity stream and entity navigator are virtualized and use stable event/entity keys, never array indexes.

## Alternatives considered

- **Keep the existing six tabs:** rejected because it fragments one debugging question across Entities, Patches, Events, Timeline, Graph, and Performance and hides causality between them.
- **Chrome extension only:** rejected because Vite/Next developers need immediate in-app access without extension installation, and mobile/embedded browser environments may not expose Chrome DevTools extensions.
- **Embedded inspector only:** rejected because an embedded overlay necessarily competes with the application viewport and cannot provide the durable full-height workspace of browser DevTools.
- **Separate embedded and Chrome UIs:** rejected because duplicated components and vocabulary would drift. Both use one React inspector/view-model surface over different transports; Flutter shares the information and protocol contracts, not React components.

## Guidance trace

- Anthropic-origin `frontend-design`: subject-grounded visual thesis, compact token system, two-pass uniqueness critique, one justified signature interaction, deliberate copy, responsive/focus/reduced-motion quality floor.
- Vercel `vercel-react-best-practices`: conditional/dynamic inspector loading, hover/focus preload, split subscriptions and memoization, deferred search, stable event callbacks, activity-based hidden state, and long-list rendering discipline.
- Vercel `web-design-guidelines` (fetched 2026-08-29): semantic controls, visible focus, safe-area/overscroll behavior, reduced motion, transform/opacity-only animation, virtualization, `Intl` formatting, assistive names/live regions, content overflow, and non-gesture alternatives.

## Uniqueness critique & revision

The first direction risked becoming the familiar “dark developer tool with orange accent and six tabs.” That would be interchangeable with the current prototype. The revision removes equal-weight feature tabs, makes causality the organizing principle, and spends the visual risk on Graph Pulse—a domain-specific representation of normalized graph publications and their view consequences. Ember is reserved for dirty/error attention instead of generic brand decoration; ordinary live selection uses Signal Mint. The result is recognizable as an entity-graph instrument rather than a reskinned admin panel.

## Assumptions

- React consumers opt in once by mounting the debug bootstrap or importing the explicit auto-bootstrap subpath. After that opt-in, development detection and launcher visibility are automatic; the normal production entry never silently mutates application roots.
- Canonical entities plus local patches are sufficient to show original, patch, and merged live values; server-version history beyond retained DevTools events requires explicit snapshots in the time-travel change.
- “Currently displayed” requires view/subscriber registration, not inference from list membership.
- Host applications may contain sensitive values. Serialized transports remain metadata-only until explicit host policy; the same-origin embedded inspector may read the selected local store directly without serializing values out of the application.
- `v3-devtools-core-observability` (change 1, in progress) owns ordered per-publication events; `v3-devtools-entity-inspection` (change 2, pending) owns event-to-registered-view attribution; `v3-devtools-time-travel` (change 3, pending) owns bounded rewind/live snapshots. The React inspector is dependency-gated until all three contracts are frozen and archived. If any contract is unavailable or materially different, this UI decision returns for design review; Graph Pulse, the causal rail, and event/view attribution are not selectively simulated or silently removed.

## Falsifier

Reject or materially revise this design if any required surface fails its boundary:

- **Packed Vite/Next embedded:** the normal production root excludes the inspector; one explicit auto-bootstrap import causes development mode to show the launcher with no manual state wiring; the launcher can be hidden/restored from menu, keyboard, and versioned preference; local original/patch/live inspection works without serializing values.
- **Usability research:** the 12-developer formative study remains a defined, optional post-release research protocol. Its 10-second/10-of-12 thresholds are product-learning targets, not archive or release gates and not statistical proof of the qualitative phrase “world class.” Until authentic sessions exist, the project makes no human-study or “world class” certification claim; automated acceptance establishes functional and accessibility behavior only.
- **Correlation:** a seeded atomic batch that adds 12 entities and changes 3 registered views produces one ordered Graph Pulse segment whose event id resolves to all 12 entities and exactly those 3 views; a later patch resolves to its entity and every registered containing view without inventing an unrelated list mutation.
- **Load:** on the certification Chromium runner baseline (at least 4 vCPU and 8 GB RAM), a sustained 500 semantic events/second for 10 seconds keeps search keystroke-to-visible-result p95 under 100 ms, preloaded panel-open p95 under 150 ms, and introduces no inspector-attributable task over 50 ms. The 100/50 ms budgets derive from RAIL and remain stricter than the 200 ms “good” INP boundary. The 500 events/second rate is a declared stress target, not an observed production baseline; task 2 of release certification must replace or retain it against recorded Vite/Next/Flutter scenario traffic. Retained history stays at or below both the 500-event and 5 MB caps while sequence/eviction reporting remains correct.
- **Chrome panel:** the packaged MV3 panel renders the same React workspaces over serialized transport, starts metadata-only, and passes activation/connection, dirty metadata, view/history, keyboard, responsive, and policy flows. With an explicit include/redact host policy, ordinary original/patch/live field diffs render and sentinel secrets are absent from every serialized artifact.
- **Flutter:** the controller and official extension consume the shared protocol/projection fixtures and expose the same Overview, Entities, Views, and Activity workflows, original/patch/live policy states, registered-view membership, history, disconnection, narrow-layout, keyboard, and screen-reader semantics. With the same include/redact fixture, ordinary field diffs render and sentinel secrets remain absent.
- **Next.js hydration:** an SSR page retains identical application markup through hydration, reports no hydration warning, mounts no launcher server-side, and shows the dev launcher only after the client debug entry activates.
- **Time travel:** change 3 defines a default lower bound of 50 snapshots or 10 MB, whole-snapshot eviction, visible expired cursors, exact return-to-live, and mutation ordering while rewound. Activity exposes rewind only when the controller advertises that capability and the packed acceptance flow proves the full rewind/live sequence.
- **Accessibility:** keyboard and screen-reader use reaches every inspection workflow without a pointer; reduced-motion, focus return, safe areas, zoom, and live announcements pass on the retained responsive surfaces.

## Review disposition

- Review round 1 rejected ambiguity between metadata-only transport and local dirty-value inspection, incomplete Chrome/Flutter falsification, shortcut conflict, unmeasurable load criteria, unclear rendered-view coverage, absent alternatives, and naming/guidance drift. Those points were corrected in revision 2.
- Review round 2 rejected implicit correlation/view-attribution assumptions and an undefined remote value policy, and warned about Next hydration, threshold rationale, automatic-after-opt-in wording, preference precedence, and retention bounds. Those points are corrected here.
- Review round 3 repeated the correlation dependency as critical because the owning code was not yet landed and rejected a waivable usability study. That verdict remains preserved for the prior revision. On 2026-08-30 the operator signed a product-decision revision making the study deferred, non-blocking research while prohibiting any inferred study pass or “world class” claim. Three decision attempts and three revised-packet attempts remained BLOCK; repository rule E-4 accepts the third attempt with a warning. Every finding and the warning disposition remain retained. The implemented correlation contracts remain mandatory.
- The producer model identity is unavailable from the harness, so all isolated receipts truthfully record `cross_model_check: unverified-producer-unknown`. The 3-pass soft cap is exhausted with the final judge verdict still `BLOCK`; the corrected design may guide implementation, but a final artifact-only review remains mandatory and no code/certification claim inherits a pass from this planning exercise.

## Dev-mode decision amendment

The operator requirement is interpreted as **automatic visibility after one explicit DevTools entry opt-in**, not a side effect of ordinary production imports. Vite and Next replace `process.env.NODE_ENV` at the consumer boundary; `mode="auto"` uses that build signal, `mode="on"` is the explicit fallback for nonstandard bundlers/debug builds, and Chrome/Flutter extension surfaces use their own explicit development connection mode. This tradeoff preserves the normal root and still removes manual `enabled` state wiring. If zero-import injection is required instead, it is a different packaging decision and must be explicitly approved because it changes normal-root side effects.
