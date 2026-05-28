# Entity Explorer — Devtools Design Notes

> UI/UX routing discipline W4 pre-work for the Entity Explorer surface.
> Satisfies the `<!-- uiux-routing:start v1 -->` gate in `CLAUDE.md` / `AGENTS.md`.
> Gates W5 (event-bus registry) and W6 (5-tab panel components).
>
> Compiled: 2026-05-28

---

## §1 Memory recall digest

No `prior-context.md` was found in the entity-management worktree or the UAR worktree at the
time this change was applied. The `/kbd-memory-recall` hook (`assess:before`) found no prior
UI/UX decisions recorded for a devtools panel surface in the surreal-memory store.

**Implication:** This is a greenfield surface. No legacy palette, spacing system, or component
pattern constraints carry forward from prior phases.

---

## §2 UI/UX Pro Max summary

*Source: `nextlevelbuilder/ui-ux-pro-max-skill` — consulted 2026-05-28*

**Design target:** A dark devtools panel injected into a running React application (or a Chrome
MV3 devtools page). The panel displays entity graph data — structured records, patch queues,
live event streams, subscription lists, and performance counters. Content is developer-facing,
data-dense, and refreshes at runtime.

### Palette — "Instrument Dark"

| Role              | Token             | Hex       |
|-------------------|-------------------|-----------|
| Shell background  | `--bg-shell`      | `#0D1117` |
| Tab content bg    | `--bg-surface`    | `#161B22` |
| Card / row bg     | `--bg-elevated`   | `#1C2333` |
| Primary text      | `--text-primary`  | `#E6EDF3` |
| Secondary text    | `--text-muted`    | `#8B949E` |
| Monospace data    | `--text-code`     | `#CDD9E5` |
| Accent (active)   | `--accent`        | `#F0A500` |
| Insert indicator  | `--semantic-add`  | `#3FB950` |
| Patch indicator   | `--semantic-mod`  | `#D29922` |
| Delete indicator  | `--semantic-del`  | `#F85149` |
| Border subtle     | `--border`        | `#30363D` |
| Focus ring        | `--ring`          | `#F0A500` |

Amber (`#F0A500`) is the single accent. It reads as "live instrumentation" without colliding
with either the React cyan or the host app's design system. All other colours are neutral.

### Font pairing

- **Data values, entity IDs, JSON, event payloads:** `Geist Mono` 13px / line-height 1.5
  (or `JetBrains Mono` as fallback). Ligatures optional; consistent weight (`400`) throughout.
- **Tab labels, UI chrome, section headings:** `IBM Plex Sans` — technical but not cold.
  Avoid Inter, Roboto, system-ui (blends into host app).

### Spacing scale

8px base unit. Panel chrome: `p-2` (8px). Row padding: `py-1.5 px-3` (6px/12px).
Tab bar height: 36px. Minimum touch/click target: 32px × 32px (WCAG 2.5.5 AAA).

### Accessibility (a11y) observations

- **Contrast:** `--text-primary` (#E6EDF3) on `--bg-surface` (#161B22) = 13.5:1 — AAA. ✓
- **Focus ring:** Use `outline: 2px solid var(--accent); outline-offset: 2px` on all interactive
  elements. Never remove outlines without a visible replacement.
- **ARIA roles:** Tab bar → `role="tablist"`; each tab → `role="tab" aria-selected aria-controls`;
  each panel → `role="tabpanel" aria-labelledby`. Required for screen-reader navigation and
  keyboard tab-switching (`←` / `→` arrow keys per ARIA authoring practices).
- **Live regions:** The Events tab stream and Subscriptions badge count must be wrapped in
  `aria-live="polite"` so assistive technology announces new data without interrupting the user.

---

## §3 Impeccable audit · critique · distill

*Source: `pbakaus/impeccable` — commands `audit`, `critique`, `distill` — consulted 2026-05-28*

### `/impeccable audit` — accessibility, performance, responsive

**Accessibility findings:**
- FAB button must have `aria-label="Open Entity Explorer"` and `aria-expanded` reflecting panel
  open/closed state. Current scaffold has no ARIA.
- Tab key navigation inside the panel must be trapped when panel is open (focus-trap library or
  native `inert` attribute on the host app's root).
- Colour-only indicators for insert/patch/delete are insufficient — must pair with an icon or
  text label for colour-blind users.
- All event-stream rows must be reachable via keyboard; click-to-expand rows need `role="button"
  tabindex="0"` when not implemented as `<button>`.

**Performance findings:**
- Entity list may contain hundreds of nodes at runtime. Must use virtualization
  (`@tanstack/react-virtual` or `react-window`) — unvirtualized lists degrade the host app.
- Apply `CSS contain: layout style` to row elements to prevent repaint propagation during
  live updates.
- Bundle the panel as a separate lazy chunk (`React.lazy` + dynamic `import()`). The FAB
  component loads synchronously; the full 5-tab panel loads only after the FAB is clicked.
  This avoids adding ~60–100 KB of panel JS to the host app's critical path.

**Responsive / resize findings:**
- The panel must handle minimum widths down to 320px (narrow mobile viewport / small devtools
  sidebar). Tab labels should collapse to icons-only below 400px panel width.
- The detail pane (right 30%) should stack below the list pane on narrow widths.

### `/impeccable critique` — UX hierarchy, clarity, emotional resonance

- **Hierarchy:** The tab bar is the correct primary navigation axis. However, the 5-tab design
  risks "tab overload" if all tabs carry equal visual weight at rest. The Entities tab is the
  default landing and should be visually dominant; inactive tabs should use `--text-muted`.
- **Clarity:** Each tab must answer a single question at a glance:
  - *Entities* → "What entities exist right now?"
  - *Patches* → "What changes are pending?"
  - *Events* → "What just happened?"
  - *Subscriptions* → "What is the app listening to?"
  - *Performance* → "How fast are operations?"
  Tabs that attempt to answer two questions are a code smell — split or merge.
- **Emotional resonance for developer tools:** Devtools earn trust through *accuracy and speed*,
  not delight. Do not add decorative animations. The one acceptable motion is the FAB → panel
  reveal (communicates state change) and the tab-active-indicator slide (communicates location).

### `/impeccable distill` — complexity reduction

The 5-tab surface is already well-scoped. The key distillation findings:

1. **Strip the Performance tab to two metrics at launch:** op timing histogram + live ops/sec
   counter. A full flame-graph belongs in a later iteration — shipping with placeholder complexity
   is worse than shipping nothing.
2. **The Subscriptions tab is likely low-frequency.** Consider merging it as a secondary view
   of the Events tab (a filter showing only `kind: "subscribe"` / `"unsubscribe"` events) in W6,
   deferring a full Subscriptions tab to W6+.
3. **Remove the detail-pane default state.** On first load, the right pane should be hidden
   (full-width list). It slides in only on row selection. This reduces cognitive load and avoids
   an empty "select something" placeholder.

---

## §4 Anthropic frontend-design + ux-designer

*Sources: Anthropic `frontend-design` skill + `ux-designer` skill — consulted 2026-05-28*

### `frontend-design` — intentional design recommendations

**Aesthetic direction: "Precision Instrument"**

A devtools panel is a professional tool for developers who already understand the domain — not a
marketing surface. The correct tone is industrial-utilitarian with surgical precision: data-dense,
delivered without ceremony. Resist the temptation to make the panel look like a miniature VS Code
or a "pretty" dashboard. Both paths read as derivative.

**Key recommendations from `frontend-design`:**
- The FAB → panel transition is the *only* moment for choreography. Use a `200ms ease-out`
  slide-up with no bounce. Every other transition should be instant or sub-100ms.
- Amber accent (`#F0A500`) is the single expressive choice. Everything else submits to it.
  A second accent colour for "success" states is not needed — `--semantic-add` green is a
  status indicator, not a design expression.
- Typography asymmetry: `Geist Mono` for data, `IBM Plex Sans` for chrome. Never mix more than
  two families. The contrast between monospace data and proportional chrome creates natural
  visual hierarchy without any spacing or size tricks.
- The Events tab auto-scroll behaviour is the most *emotionally loaded* interaction in the panel.
  When auto-scroll is active, developers feel in-control. When it silently stops (e.g., because
  they scrolled up), trust breaks. The amber "N new events — click to resume" banner must appear
  immediately and be impossible to miss.

### `ux-designer` — UX-engineer review

**Review perspective:**
- The FAB button's z-index must be managed carefully in the host app context. Use a z-index in
  the range `2147483600–2147483647` (near `INT_MAX`) and document it in a CSS custom property
  `--entity-explorer-z`. Do not use `position: fixed` without also handling host apps that set
  `transform` on ancestors (which creates a new stacking context and breaks fixed positioning).
  Use a Shadow DOM wrapper or append the FAB to `document.body` directly.
- The Events tab is the highest-traffic tab at runtime. Its virtualized list must maintain a
  stable scroll position when new items arrive at the top *and* when auto-scroll is enabled.
  This requires separate scroll-anchor strategies for the two modes — test both explicitly.
- Keyboard shortcut to toggle the panel (`Alt+Shift+E` or configurable) is expected by
  developer-tool users. Implement it at the `keydown` listener on `window`, not `document`.
- Tab content should be mounted lazily but **not unmounted** when the user switches away.
  Unmounting the Events tab clears the event buffer. Mount all tabs on first visit; hide with
  `display: none` (CSS) on inactive tabs to preserve state without React re-renders.

---

## §5 Vercel React Best Practices + Composition Patterns

*Sources: Vercel React Best Practices + Composition Patterns skills — consulted 2026-05-28*

### Component boundaries

All panel components are **client components** — there is no server boundary. The panel runs
inside the host app's browser context (or a Chrome devtools page). SSR, RSC, and streaming
concerns do not apply.

### Tab-panel composition pattern

```
<EntityExplorerProvider>        ← single React context: { selectedEntityId, activeTab, dispatch }
  <EntityExplorerFAB />         ← lazy-loaded toggle button, appended to document.body
  <EntityExplorerPanel>         ← conditionally rendered (portal into document.body)
    <TabBar />                  ← tab navigation, always mounted
    <TabContent>
      <EntitiesTab />           ← mounted on first visit, hidden when inactive (display: none)
      <PatchesTab />            ← same
      <EventsTab />             ← same — NEVER unmount (would clear event buffer)
      <SubscriptionsTab />      ← same
      <PerformanceTab />        ← same
    </TabContent>
    <DetailPane />              ← conditionally rendered, slides in on row selection
  </EntityExplorerPanel>
</EntityExplorerProvider>
```

**State lifting:** Panel-level state (active tab, selected entity ID) lives in
`EntityExplorerProvider` context. Per-tab transient state (scroll position, filter input,
sort order) lives in each tab's local `useReducer` / `useState`. No cross-tab prop drilling.

### Performance defaults

- **Entity list virtualization:** `@tanstack/react-virtual` (already used in the codebase via
  TanStack Query). Render a fixed-height container; virtualise rows.
  ```tsx
  const rowVirtualizer = useVirtualizer({
    count: entities.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });
  ```
- **Lazy panel chunk:** The full `EntityExplorerPanel` is `React.lazy`-imported. The FAB stub
  (`< 2 KB`) loads synchronously; the panel chunk (~30-60 KB) loads on first FAB click.
- **Event buffer:** The Events tab maintains a bounded `useRef` buffer (max 500 events) managed
  outside React state — only the visible window is passed to React to avoid re-rendering the
  full buffer on every event.

### Deferred rendering strategy for inactive tabs

Use CSS `display: none` on the tab content wrapper for inactive tabs — not conditional rendering.
This keeps all tabs mounted (preserving event buffer, scroll position, and subscriptions) while
removing them from paint. React's reconciler still runs for hidden tabs, but with no DOM output,
the cost is negligible compared to remounting.

---

## §6 Web search: runtime devtools best practices

*Search query: `"runtime devtools panel best practices 2025 2026 tab layout information density"` — fetched 2026-05-28*

### Citations

- https://evilmartians.com/chronicles/six-things-developer-tools-must-have-to-earn-trust-and-adoption | anchor: "six things developer tools must have" | fetched: 2026-05-28
- https://evilmartians.com/chronicles/devs-in-mind-how-to-design-interfaces-for-developer-tools | anchor: "devs in mind interfaces developer tools" | fetched: 2026-05-28
- https://developer.chrome.com/docs/devtools/performance/overview | anchor: "performance panel overview" | fetched: 2026-05-28
- https://www.debugbear.com/blog/fix-web-performance-devtools | anchor: "new performance features chrome devtools" | fetched: 2026-05-28

### Key findings

- **Trust through consistency (Evil Martians, 2026):** Developer tools earn adoption primarily
  through predictability. UI consistency means using the same visual patterns, labels, and
  interaction rules across all tabs — developers rely heavily on muscle memory. Breaking
  consistency in one tab forces a full re-orientation.
- **Discoverability is the core navigation problem (Evil Martians, 2025):** How fast a developer
  can turn intent into action determines how much of a tool's power they actually use. Tabs with
  opaque labels ("Sub" instead of "Subscriptions") or unlabelled icons fail this test.
- **Live metrics pattern (Chrome DevTools, 2025):** The Chrome Performance panel's 2025 overhaul
  introduced a "live metrics" landing screen that shows 3 top-level numbers before the user
  initiates a recording. For the Entity Explorer Performance tab, apply the same pattern: show
  live ops/sec + last-op latency as always-visible numbers, with the histogram below.
- **Prioritise 80% use cases (DebugBear):** Rather than trying to expose all data, the best
  devtools surface the 80% of information that solves 80% of problems. For entity debugging,
  this is: current entity state (Entities tab) + last N events (Events tab).

---

## §7 Web search: Chrome MV3 devtools panel patterns

*Search queries: `"Chrome extension MV3 devtools panel architecture patterns 2025"` + `"react devtools bridge architecture content script panel message passing"` — fetched 2026-05-28*

### Citations

- https://developer.chrome.com/docs/extensions/reference/api/devtools/panels | anchor: "chrome.devtools.panels API" | fetched: 2026-05-28
- https://chrome.jscn.org/docs/extensions/mv3/devtools/ | anchor: "extending devtools MV3" | fetched: 2026-05-28
- https://github.com/GoogleChrome/developer.chrome.com/blob/main/site/en/docs/extensions/mv3/architecture-overview/index.md | anchor: "MV3 architecture overview" | fetched: 2026-05-28
- https://gist.github.com/DrewML/2b5fccfce5fc1a79b3d3 | anchor: "React DevTools cross-browser bridge overview" | fetched: 2026-05-28
- https://www.npmjs.com/package/webext-bridge | anchor: "webext-bridge message passing" | fetched: 2026-05-28

### Key findings

**MV3 devtools panel structure:**
- `chrome.devtools.panels.create(title, iconPath, pagePath, cb)` creates a top-level panel tab.
  The panel is an HTML page with full access to `chrome.devtools.*` APIs but NOT to the inspected
  page's DOM directly.
- The devtools page and the content script are isolated; communication goes through the service
  worker (background) via `chrome.runtime.connect()` + `postMessage`.
- Message path: `inspected page (injected script)` → `content script` → `service worker` →
  `devtools page`. Four hops. Design the message protocol to be batched and debounced — do not
  send one message per entity event.

**React DevTools bridge pattern (DrewML gist):**
- The React DevTools architecture separates **Backend** (instruments the app, fires events) from
  **Frontend** (renders the panel UI). The Bridge is a thin adapter that serialises events over
  `postMessage`.
- For the Entity Explorer, this maps directly: `notifyDevtools(event)` is the Backend; the panel
  is the Frontend; the bridge is the `DevtoolsEvent` → `postMessage` → panel message channel.
- The bridge must handle the case where the panel is not open when events fire — events must be
  buffered in the content script or service worker (ring buffer, max 500) and replayed on panel
  connect.

**`webext-bridge` library:**
- Abstracts the four-hop message path into typed point-to-point calls. `sendMessage("devtools",
  payload, "content-script")` auto-routes to the correct context.
- Used by several state-inspector extensions (Zukeeper for Zustand, Redux DevTools). Recommend
  evaluating for W8.

---

## §8 Distillation

When implementing the Entity Explorer panel, prefer a single amber accent on a three-depth dark
neutral stack (`#0D1117` → `#161B22` → `#1C2333`) with `Geist Mono` for all data values and
`IBM Plex Sans` for chrome, keeping typography and colour as the only hierarchy tools and
avoiding decorative animation outside the 200ms FAB reveal. Mount all five tab panels on first
open and hide inactive ones with `display: none` rather than conditional rendering, so the
Events tab's runtime buffer and each tab's scroll position survive navigation; virtualize the
entity list with `@tanstack/react-virtual` from day one because an unvirtualized list in a
host-app injection context will degrade page performance under any real graph. For the Chrome
extension path, route `DevtoolsEvent` payloads through a content-script ring buffer (≤500
events) → service worker → devtools page, matching the React DevTools bridge pattern, so events
are never dropped during panel-open latency.

---

## §9 Implications for W5 — event-bus / multi-store registry

- **Protocol:** The `DevtoolsEvent` union already defined in W3 (`engine.ts`) is the correct
  wire format for the event bus. W5 should consume `subscribeDevtoolsEvent` directly — no
  additional event type wrappers needed.
- **Buffer in the bus:** The multi-store registry (`devtools-event-bus.ts`) must maintain a
  bounded ring buffer of the last N events (recommend `N = 500`, configurable). New subscribers
  (including the panel on open) receive the buffered history, then live events. This avoids
  the "empty Events tab on panel open" problem.
- **Debounce for high-frequency stores:** If multiple stores fire events within the same
  microtask tick (e.g., a bulk import triggering 50 upserts), the bus should coalesce them into
  a single `kind: "list"` summary event rather than forwarding 50 individual messages — critical
  for the Chrome extension path where each message crosses context boundaries.

---

## §10 Implications for W6 — 5-tab panel components

- **Distill recommendation acted on:** Launch with 4 tabs only — Entities, Patches, Events,
  Performance. Fold Subscriptions into the Events tab as a filter (showing
  `kind: "subscribe" | "unsubscribe"` events). Reduces initial complexity without losing data.
- **Component tree (from §5):** `EntityExplorerProvider` → portal into `document.body` →
  `TabBar` + `TabContent` (5 hidden panels, one visible) + `DetailPane` (slide-in). No nested
  tabs. No modals.
- **FAB z-index:** Append FAB and panel to `document.body` via a React portal. Set
  `z-index: var(--entity-explorer-z, 2147483600)` to survive host-app stacking contexts.
  Test against apps that apply `transform` to `<body>` (breaks `position: fixed`).

---

## §11 Implications for W8 — Chrome extension scaffold

- **Panel registration:** Use `chrome.devtools.panels.create("Entity Explorer", "icon.png",
  "panel.html", cb)` in `devtools.html`. The panel page is the same React bundle as the injected
  panel, parameterised by `ENTITY_EXPLORER_MODE=extension` env var at build time.
- **Bridge:** Evaluate `webext-bridge` (npm: `webext-bridge`) for the content-script → service
  worker → devtools page message path. It handles the MV3 four-hop routing transparently and
  has TypeScript support.
- **Buffer replay:** On panel connect, the service worker replays the ring buffer (W9 task)
  before switching to live streaming. Implement replay as a distinct message type
  `{ type: "replay", events: DevtoolsEvent[] }` so the panel can render the history before
  the live stream begins.
