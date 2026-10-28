# Proposal: a2ui-headless-export

Phase `phase-v4-a2ui-runtime-hardening` · issue #73 · **conditional**: proceeds only on a `go` from `a2ui-webcore-node-probe` and the operator's D2 decision (agreed: keep, last). If dropped, AUI-10..12 leave the contract by amendment and move to a follow-up.

## Problem

A host that wants to validate agent output exactly as the client will, or compact a long-lived surface, needs the official processor outside React and a lossless way back to messages. The shadow rebuild in `preflight` (`runtime.ts:~437-486`) is private and drops component `catalogId`/`rootId`; `v1-compat.ts:129-141` moves `wantResponse`/`responsePath` into a private map.

## Design

- Catalog split first: `catalog.ts:10` imports `@a2ui/react/v0_9` and `runtime.ts` imports the catalog, so a React-free entry needs the catalog separated from React. The Node probe covers `web_core` only.
- Headless entry (no React, no DOM) with the same catalog, allowlist, component, function and limits validation as the React runtime; it also needs a `tsup.config.ts` entry, the package `exports` entry and the `entryPoints` update in `scripts/skills-package-registry.mjs`.
- Public `exportSurfaceMessages(surfaceId)`, preferably one v1.0 inline `createSurface`, preserving catalog, root, theme, `sendDataModel`, component `catalogId`/`rootId` and v1 action metadata.
- Orphan pruning on export with accounting: `web_core` 0.12.0 never removes a component the producer stops referencing, so unreachable components would otherwise be exported.
- Independent of the tracking in `a2ui-activity-idempotency` and `a2ui-versioned-deltas` in data, serialized after them only because `runtime.ts` and `v1-compat.ts` have a single writer.

## Acceptance

AUI-10..12 at the phase's final boundary.
