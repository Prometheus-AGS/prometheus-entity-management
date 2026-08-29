# React inspector task 6 — Vite and Next public-entry scenarios

Date: 2026-08-29

## Result

COMPLETE. Both canonical React examples now explicitly opt into Graph DevTools
through published optional entries without bypassing their existing graph
ownership or component-to-hook-to-store layering.

## Vite scenario

- The client composition root checks `import.meta.env.DEV` and dynamically
  imports the public `./devtools/auto` entry.
- The auto entry attaches to the example's existing singleton graph and mounts
  the development launcher without application-owned enablement state.
- Vite's documented static replacement removes the development-only branch
  during a production build.

## Next.js scenario

- The server layout continues to create and serialize one request-owned graph.
- The existing client hydration provider still creates exactly one scoped
  browser `GraphStore` and supplies it through `GraphStoreProvider`.
- A dedicated client composition component waits for its first effect, rejects
  production activation, dynamically imports the public side-effect-free
  `./devtools` entry, and passes that exact scoped store to
  `<EntityGraphDevtools mode="auto" />`.
- The component renders `null` during server prerender and initial hydration,
  so debug UI neither changes SSR application markup nor attaches to the
  singleton fallback.

## Current documentation confirmation

Context7 resolved official high-reputation sources for Next.js 16.2.9
(`/vercel/next.js/v16.2.9`) and Vite 8.0.10
(`/vitejs/vite/v8.0.10`). Next documents the Server-to-Client serializable-prop
boundary and client state/effect capability. Vite documents
`import.meta.env.DEV` as a statically replaced condition whose development
branch is tree-shaken in production. The examples follow those current
contracts.

## Static confirmation

- Scoped ESLint passed all three task-touched example files with zero findings.
- TypeScript `transpileModule` parsed all three files with zero syntax
  diagnostics.
- Source assertions passed for Vite dev-only auto opt-in, Next public-entry
  use, post-hydration activation, production exclusion, scoped-store
  attachment, and retained provider layering.
- `git diff --check -- examples/vite-app examples/nextjs-app` passed.

These are parser/static confirmations, not test evidence. No typecheck, unit,
component, isolated, mock-backed, snapshot, partial integration, full
integration, or build command ran. Task 11 remains the sole assembled packed
Vite/Next/browser gate after task 10 completes the UI specification.

## Control-plane receipt

Task 6 started at canonical revision 370 and completed at revision 372 through
the canonical local runtime fallback. Sovereign sync was not changed. The
known task-after parent reset was restored through signed command
`codex-react-inspector-restore-after-task-6-20260829` at revision 373.
