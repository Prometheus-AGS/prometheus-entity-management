# Verification — `v3-sync-persistence-path`

Date: 2026-08-01  
Verdict: **PASS TO ARCHIVE — publication remains unauthorized**

## Acceptance-to-evidence matrix

| Phase-plan requirement | Direct evidence | Result |
| --- | --- | --- |
| Mandatory PGlite and Loro installation | Exact `@electric-sql/pglite` 0.5.4 and `loro-crdt` 1.13.9 development dependencies; release guards resolve both modules | Pass |
| Real persistence reload | `pglite-persistence.integration.test.ts` creates a filesystem database, persists, closes, reopens, and hydrates it | Pass |
| Canonical entities and ID-only lists survive reload | The reopened graph verifies canonical entity data, one intentional local patch, and `ids: ["task-1"]` | Pass |
| Two-client offline convergence | Two isolated `createGraphStore()` and provider registries edit while disconnected, reconnect, and converge | Pass |
| Deterministic delivery behavior | Different-field and same-field cases pass under both FIFO and reverse delivery | Pass |
| Conflict policy | Equal-counter scalar conflicts select the higher deterministic Loro peer ID and converge on both graph stores | Pass |
| No inbound echo loop | The bridge marks peer applications synchronously; the convergence queue remains empty after projection | Pass |
| Lossless reconnect | The channel retains disconnected writes, flushes on open, and requests peer snapshots missed during an outage | Pass |
| Real WebSocket integration | A local `ws` relay socket is forcibly terminated; the client enters reconnecting state and both canonical stores converge without errors | Pass |
| Mandatory lanes cannot silently skip | Source guards reject `.skip`, `.todo`, conditional environment gates, and legacy dependency-availability early returns | Pass — zero mandatory skips/todos |
| Packed publication surface | Core and sync tarballs pass payload/manifest checks plus ESM, CommonJS, NodeNext, and cross-client loopback consumers | Pass |
| Sibling integration remains explicit opt-in | Manual-only `entity-sync-contract.yml` packs the current core into a fresh `prometheus-entity-sync` checkout; no push/PR trigger or local link | Pass |
| Coverage, exports, skills, and docs stay synchronized | Implemented npm-sync receipts only; 201 React exports, 16 sync exports, dedicated reference/skill docs, no showcase promotion | Pass |
| WebSocket lane is separately labeled | Unit channel tests and `real WebSocket relay reconnect integration` remain distinct deterministic suites and named commands | Pass |
| Visual evidence is truthful | This change renders no UI and claims no screenshot/accessibility/device receipt | Not applicable; downstream visual gates remain mandatory |

## Final executable evidence

- A fresh 21 MB source-only copy excluded `.git`, dependencies, build output, caches, coverage, tarballs, and native targets.
- `pnpm install --frozen-lockfile --prefer-offline` installed 777 locked packages, reused 766, and downloaded zero.
- `pnpm run ci` passed validation, lint, 17-task type checking, 14-task builds, package/release tests, 34/34 BDD scenarios and 185/185 steps, both export ledgers, and production security.
- `pnpm run test:sync-persistence` passed one real PGlite test, eight Loro/channel/relay tests, and nine release guards with zero skips or todos.
- Focused BDD passed 6/6 scenarios and 31/31 steps.
- The independent package gate passed 12/12 tarballs with Publint, Are The Types Wrong, ESM/CommonJS, and TypeScript NodeNext/Node16/Bundler consumers.
- `actionlint .github/workflows/entity-sync-contract.yml` passed.
- The locally reproduced opt-in sibling workflow used a packed current core at sibling commit `792a1046651fe75730d64c27c3f12e14cecc524a`; all four TypeScript workspaces typechecked and 21/21 protocol tests passed.

Machine-readable receipts are `final-verification.json`, `clean-gates.json`, `clean-package-contract-report.json`, `clean-sync-packed-consumer-report.json`, and `external-entity-sync-contract.json` in this directory.

## Unresolved platform and manual limits

- PGlite evidence intentionally closes one handle before reopening the same directory; it does not claim multi-process access or cross-device database replication.
- The certified Loro protocol currently exchanges full snapshots. Incremental oplog updates, compaction, large-dataset performance, and long-running peer churn are not claimed.
- The real relay is local and ephemeral. Production relay authentication, authorization, tenancy, horizontal scaling, observability, and recovery remain outside this package-level proof.
- `loro-crdt` remains a consumer-selectable peer dependency, but is mandatory and exact in release tests. Consumers selecting the Loro path must install it explicitly.
- The manual sibling contract proves packed-core TypeScript compatibility and reconnect/JWT unit behavior. Its Docker/Postgres gateway integration remains opt-in and is not promoted as mandatory release evidence.
- Flutter/Dart graph synchronization, Tauri/native persistence, and mobile platform behavior remain owned by later changes.
- All five showcase applications, browser/device execution, accessibility, screenshots/goldens, traces, video, and evidence hashes remain planned.
- The full Prometheus-branded Docusaurus site and GitHub Pages deployment remain planned under their dedicated documentation changes.
- Immutable-SHA certification, RC provenance, recovery rehearsal, registry ownership, stable npm publication, and movement of npm `latest` remain open.

## Visual-evidence decision

No UI, documentation page, native screen, or other rendered surface is produced by this change. A screenshot of terminal output would be decorative and weaker than the executable storage, convergence, socket, tarball, and clean-room receipts above. Real visual evidence is therefore **not applicable**, not “passed”; downstream showcase and Docusaurus changes retain the required rendered accessibility, screenshot, trace, video/golden, device, and hash gates.
