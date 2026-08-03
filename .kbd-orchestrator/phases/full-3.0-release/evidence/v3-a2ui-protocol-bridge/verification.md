# Verification — `v3-a2ui-protocol-bridge`

Date: 2026-08-01  
Verdict: **PASS TO ARCHIVE — full 3.0 and publication remain uncertified**

## Acceptance-to-evidence matrix

| Phase-plan requirement | Direct evidence | Result |
| --- | --- | --- |
| Official A2UI messages render through the official engine | `PrometheusA2uiRuntime` delegates to official `MessageProcessor`; `PrometheusA2uiSurface` delegates to official `A2uiSurface`; focused runtime/render tests, packed server render, and Chrome evidence pass | Pass |
| No alternate protocol implementation | Root sources import explicit `@a2ui/react/v0_9` and `@a2ui/web_core/v0_9`; architecture guards find no JSONL parser, AG-UI event parser, alternate surface store, or transport I/O in official/React layers | Pass |
| Allowlisted catalogs and validation | The catalog selects official basic-catalog implementations by exact allowlist, excludes `openUrl` by default, and rejects unknown components/functions; exact `v0.9.1` enforcement rejects v0.9 and v1 candidate input | Pass |
| Graph actions cross an explicit policy boundary | Official action schema validation precedes exact rule lookup, context validation, application authorization, and execution; the graph bridge owns store calls | Pass |
| Tenant/entity/action/field scope is enforced | Built-in graph policy requires explicit entity/action/field allowlists and an application authorization callback; browser and unit receipts include allowed, tenant/field denied, and malformed cases | Pass |
| Destructive actions require approval | Replace/remove rules are destructive and require a separate approval callback after authorization; agent context cannot approve itself; unit and browser receipts prove denial | Pass |
| Component → hook/provider → policy/store layering | Renderer and React wrapper sources have no graph-store or external-I/O access; graph mutations are isolated in `src/policy/entity-graph-policy.ts` | Pass |
| AG-UI consumers have an honest migration path | Package root contains only official A2UI exports; nine alpha chat/state APIs remain at `@prometheus-ags/a2ui-react/ag-ui`; README and changelog provide before/after imports | Pass |
| Published package works outside workspace aliases | Packed core/A2UI tarballs pass Node ESM, Node CommonJS, strict TypeScript NodeNext, strict TypeScript Node16, and server-render consumers; the independent twelve-tarball gate also passes Publint and ATTW | Pass |
| Public API, coverage, skills, and docs remain synchronized | Root 18 and compatibility 9 runtime exports match the A2UI ledger; React 201 and sync 16 also pass; coverage promotes only A2UI-owned evidence while all five showcases and docs stay planned | Pass |
| Mandatory lanes are not silently skipped | A task-owned test/verifier/feature scan finds zero `.skip`, `.todo`, `@skip`, or `@ignore` paths; clean CI and focused BDD pass | Pass — zero mandatory skips/todos |
| Visual behavior has direct evidence | Built artifact hash, three nonempty desktop/mobile screenshots, keyboard-only trace, WebM, focus/contrast/target checklist, and axe results are verified by `pnpm run verify:a2ui-visual` | Pass |

## Final executable evidence

- A third fresh 26 MB source-only copy was required after two clean verification attempts found and corrected a CommonJS declaration defect and two stale release-ledger assertions.
- `pnpm install --frozen-lockfile --prefer-offline` installed 790 locked packages across 15 workspaces, reused 779, and downloaded zero.
- `pnpm run ci` passed validation, lint, 17/17 typecheck tasks, 14/14 build tasks, tests, 40/40 BDD scenarios and 219/219 steps, skills, and production security.
- `pnpm run test:a2ui-bridge` passed 13 runtime/policy/React tests plus 6 release guards.
- Focused BDD passed 6/6 scenarios, 34/34 steps, and 4/4 hooks.
- The A2UI packed receipt passed ESM, CommonJS, NodeNext, Node16, and server rendering without workspace aliases.
- The independent package contract passed all twelve tarballs, payload/manifest policy, Publint, ATTW, and ESM/CommonJS/NodeNext/Node16/Bundler consumers.
- Visual verification tied the Chrome evidence to built runtime SHA-256 `24ad752b2e48555badbe30c7b9406231745dcee00beee194270d10f9b5a58ee6`.
- Strict OpenSpec validation, example/release validation, changeset status, JSON parsing, and `git diff --check` passed.

Machine-readable receipts are `final-verification.json`, `clean-gates.json`, `clean-a2ui-packed-consumer-report.json`, `clean-package-contract-report.json`, and `visual-evidence.json` in this directory.

## Unresolved platform and manual limits

- The stable bridge targets only A2UI `v0.9.1`. v1.0 remains an upstream candidate and is rejected until a separately governed version adapter selects it.
- The package processes decoded official message objects and message lists. It does not own agent transport, JSONL parsing, streaming, cancellation, task lifecycle, or A2A conformance.
- The default Prometheus catalog is an explicit subset of the official basic catalog. `openUrl` and application-specific components/functions require deliberate opt-in; this change does not certify arbitrary third-party catalogs.
- The graph policy is a secure boundary mechanism, not a replacement for application identity, tenant membership, audit retention, or backend authorization. Applications must provide real authorization and approval callbacks.
- The local deterministic Chrome fixture proves official rendering and policy outcomes. It is not the complete keyless agentic application, a production model/backend integration, or a remote-service reliability test.
- Desktop and 390px responsive browser screenshots are not native Flutter, Tauri, iOS, or Android device evidence.
- The compatibility subpath preserves the alpha AG-UI APIs, but the 3.0 root change is intentionally breaking for alpha consumers and requires the documented import migration.
- Exact upstream A2UI distribution pins must be reevaluated through dependency policy before any future protocol/distribution update; this archive does not claim upstream immutability.
- The full branded Docusaurus site, generated API reference, embedded examples, and GitHub Pages deployment remain owned by changes 21–26.
- Immutable-SHA certification, RC/recovery rehearsal, registry permissions, npm publication, and movement of `latest` remain open and unauthorized.

## Visual-evidence decision

Visual evidence is **mandatory and passed** because this change ships a rendered interactive surface. The reviewed desktop and mobile receipts visibly distinguish the official renderer, allowlisted catalog, default-deny actions, and executed/denied/approval-denied outcomes. Images are not used as protocol or authorization proof by themselves: the manifest couples them to keyboard outcomes, axe output, trace/video hashes, and the exact built artifact.
