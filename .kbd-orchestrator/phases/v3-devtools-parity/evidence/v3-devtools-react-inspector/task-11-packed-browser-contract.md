# Task 11 — packed React inspector acceptance

Date: 2026-08-29

## Full integration gate

The completed React DevTools path was assembled from packed core and React
tarballs and exercised through real Vite 8.2.0, Next.js 16.2.12, React 19.2.8,
and Chromium consumers:

```text
pnpm run verify:devtools-react-inspector
```

Final result: PASS — 5/5 browser scenarios, zero skipped, unexpected, or flaky
results. No unit, component, snapshot, mock-backed, isolated, or partial test
was created or run.

The gate proved:

- packed manifests and tarball file lists, with SHA-256 receipts;
- strict packed-consumer installation and Vite/Next TypeScript contracts;
- Vite and Next production builds exclude DevTools server markup, hydrated
  roots, and inspector markers;
- automatic Vite development activation and clean post-hydration Next
  activation;
- temporary and persisted launcher hiding with keyboard restoration;
- floating, dock-right, dock-bottom, narrow single-pane, and Back workflows;
- roving workspace keyboard navigation and zero serious/critical axe findings;
- automatic registration of three rendered list views through public hooks;
- original, patch, live, diff, entity history, view membership, causal rail,
  Activity correlation, and one-segment Graph Pulse attribution;
- a producer scheduled at 500 semantic publications/second for 10 seconds,
  while search and preloaded-panel interaction remained inside their explicit
  p95 budgets, no inspector-attributable task exceeded 50 ms, and retained
  history stayed capped at 500 events.

The receipt records both the 500 events/second generator target and a 490
events/second completion-window floor. The latter is a 2% allowance for
Chromium timer wake-up drift after the final scheduled publication; it does
not lower the generated workload. The gate version and complete threshold
snapshot are retained at the top level of both browser and packed receipts so
future evidence cannot be evaluated against an implicit or changed bar.

## Observed defects corrected by the gate

1. The packed core root exposed a literal optional `loro-crdt` import that
   Vite resolved even when the merge strategy was never invoked. The optional
   peer is now loaded through the existing runtime specifier, preserving the
   runtime error only for callers that invoke the strategy without installing
   it.
2. React DevTools automatic mode only read `process.env.NODE_ENV`, which is not
   present in Vite browser modules. It now reads Vite's statically replaced
   `import.meta.env.DEV` signal first and keeps the Node/Next fallback.
3. React list, query, view, and entity hooks had no bridge to the core rendered
   view registry. A store-scoped registration bridge now mirrors public hook
   lifetimes and ordered memberships into the attached controller.
4. Native/transparent buttons produced unstable low-contrast trace and Graph
   Pulse surfaces. Scoped Shadow DOM styles now give those interactive rows
   deterministic dark surfaces; the full-page axe rerun reports zero serious
   and critical violations.

## Retained evidence

- `task-11-packed-browser-acceptance.json`
- `task-11-browser-evidence.json`
- `task-11-playwright-report.json`
- `task-11-playwright-artifacts/**/trace.zip`
- `task-11-causal-inspector.png`
- `task-11-responsive-500-events.png`

Security boundary: browser persistence still accepts only the versioned
preference schema and recognized enum values. No entity values, secrets, or
transport payloads are written to browser storage or test output.
