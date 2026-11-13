## Context

KBD phase `phase-a2ui-1-0-agui-upgrade`. Plan: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`.
Assessment items addressed: W2; assessment §5 (harness is new work).

## Decisions

Adopted operator decisions that bind this change: D4 (W2 in scope).

## Open design records

Recorded here during execution, before dependent code: Pinned upstream commit and per-file digests; how an upstream case that cannot pass is reported (FAIL with case id; exclusion only by amendment).

## Record (tasks 10.1–10.3, authored 2026-11-12; nothing here was run)

### What was pinned (10.1)

`tests/conformance/a2ui/upstream/` holds unmodified copies from `https://github.com/a2ui-project/a2ui` at commit
`0d2fcf3714a7a3725ed994b2861ffdd7d1f995bd` (2026-11-11), in the upstream repository layout so the cases'
repository-relative paths resolve against that directory (the guide's `REPO_ROOT`):

| File | SHA-256 |
| --- | --- |
| `conformance/core/adapter_conformance.yaml` (22 cases, `render_surface`) | `bb5bef3871254621d268b7939848982718229bb03d6c7cf62a549f5af95ca2c4` |
| `conformance/core/accessibility.yaml` (7 cases, `accessibility_check`) | `186f58023152d816c3f93625b8b66009b158f1252a82a86d0d9417c6e4ea2d77` |
| `catalogs/basic/v1/catalog.json` (the cases' `catalogPaths`) | `d4ce11f8fff2da8d5fd0b2793db524f6aa7eef541eefb6fe2b71f0efc17cbfa9` |
| `specification/v1_0/json/renderer_to_agent.json` (outbound schema) | `58ecde02101f0f37566b5e238dc6ef6af628c3ff312fce0e17ab7670b7215465` |
| `specification/v1_0/json/common_types.json` (its `$ref` target) | `c4e78305be1de73eecb37f8179ba169730250611703683af291b18135a6430dc` |
| `LICENSE` (Apache-2.0) | `8c8b5b632d56c4c1658296963c693db5396772a33caaddb9a22593c4155c437a` |

`manifest.json` records the repository, commit and these digests; `NOTICE` gives attribution (upstream ships no
NOTICE). `scripts/verify-a2ui-conformance.mjs` recomputes every digest and refuses to run on a mismatch, a missing
file or an unlisted file. The clone was clean for these paths when they were copied.

### Harness architecture (10.2)

- **Page** (`tests/conformance/a2ui/harness/`): a Vite page built with `vite build` and served with `vite preview`
  on `127.0.0.1:4185`. `@prometheus-ags/a2ui-react` resolves to the file its `package.json` `exports["."].default`
  names (`dist/index.mjs`), never `src`; `react`, `react-dom` and `zod` resolve as if imported from that file, so the
  page shares the package's React and `zod/v3` instances. The config imports only Node built-ins (the workspace
  root has no `vite`/`@vitejs` package to import) and the page uses `createElement`, so no React plugin is needed.
  Logic is adapted from upstream `typescript/renderers/react/tests/adapter_harness.tsx` (Apache-2.0 headers kept,
  attribution added). It mounts `PrometheusA2uiProvider` + `PrometheusA2uiSurface` over
  `createPrometheusA2uiRuntime`, and exposes `window.__a2uiConformance` (`startCase`, `beginStep`, `settle`,
  `finishStep`).
- **Catalogs**: the basic catalog is `createPrometheusA2uiCatalog({ protocolVersion: "1.0", id: <pinned catalogId>,
  components, functions })` allowlisting exactly the names in the pinned `catalog.json` (18 components, 14
  functions including `openUrl`). The test function `incrementCounter` and the cases' schema-only agent functions
  are added to the catalog's function map after construction (the package allowlists official functions only;
  upstream registers the same functions in its catalog). Case-declared components (`StatusBadge`) use the public
  custom-component path (`createPrometheusA2uiComponent` + an allowlisted implementation).
- **Actions**: the runtime gets a `createA2uiActionPolicy` whose rules allow exactly the event names the case
  declares, so actions travel the package's real policy path; the default deny-all policy would emit nothing.
- **Interaction**: `user_input` and `user_gesture` are trusted Playwright actions (`fill`, `check`, `click`) on
  controls the page tags, because the official `openUrl` reads `navigator.userActivation`, which only trusted input
  sets. `programmatic_invoke` calls `dataContext.resolveAction(action, { userActivation: false })` from page code, as
  upstream does. `window.open` is stubbed and recorded.
- **Observation**: the page reads the official `ComponentNode` the bundled renderer sets as `node` on each host
  element, and the surface model through the package's public `runtime.processor` (`onSurfaceCreated`, `onAction`,
  `onError`) and `runtime.getSurface`. Errors are the surface error channel plus any `PrometheusA2uiError` that
  `runtime.processMessages` throws (mapped to `{ code: protocolCode ?? code, message, surfaceId }`). Outbound
  envelopes are exactly what `onRendererMessage` receives — the package's renderer-to-agent path.
- **Spec** (`tests/browser/a2ui-conformance.spec.ts`, config `a2ui-conformance.playwright.config.ts`): loads the
  pinned YAML with the root `yaml` package (YAML 1.2), enforces the strict dispatch rule (unknown action, op or key
  fails the case), validates every captured envelope against the pinned `renderer_to_agent.json` with Ajv 2020 (a
  `catalog.json` stub as upstream's `test_outbound_envelopes.py` uses; `date-time` checked by a local RFC 3339
  format), matches `expectOutbound` with `{"$match": "any"}`, and runs `@axe-core/playwright` restricted to each
  case's `axeCore` rules on the surface container. Results are appended per case to a JSON Lines file because
  Playwright restarts its worker after a failed test.
- **Status rule**: FAIL if any observed assertion fails (or the case has an unknown key, a harness error or an
  uncaught page error); otherwise UNSUPPORTED if the case uses a key in the `UNSUPPORTED` map
  (`tests/conformance/a2ui/node/suite.ts`); otherwise PASS. Unlike upstream, an UNSUPPORTED key does not skip the
  case: the observable assertions still run, so a failure is never hidden. Every `UNSUPPORTED` entry must match a
  loaded case.

### Assertion support

| Assertion | Support | How / why |
| --- | --- | --- |
| `expectViewTree` | supported | official node tree from host elements; DOM text for `text`/`badgeText`/`hints`; computed style for `occupiesLayout` |
| `expectSameViewIdentity` / `expectNewViewIdentity` | supported | node and host-element identity between steps |
| `expectDisposedNodes` | supported | the official node's public `disposed` getter, and absence from the mounted tree |
| `expectSurfaceRemoved` | supported (partly) | `runtime.getSurface` is empty and no host element remains; `SurfaceModel` in `@a2ui/web_core` 0.15.0 has no `disposed` flag, so disposal is checked only if that flag exists |
| `expectDataModel` | supported | `surface.dataModel.get("/")` |
| `expectActions` | supported | official `surface.onAction` |
| `expectErrors` | supported | `surface.onError` plus refusals thrown by `runtime.processMessages` |
| `expectAccessibilityTree` / `accessibilityTree` | supported | ARIA attributes on host elements, upstream's label/role/checked inference |
| `axeCore` | supported | real axe-core in Chromium (upstream React/Lit list it UNSUPPORTED under jsdom) |
| `expectThemeAbsent` | supported | `surface.theme` empty and no theme colour on any element |
| `expectOutbound` | supported | `onRendererMessage` capture, schema-validated, `$match` aware |
| `expectActiveSubscriptions` | **UNSUPPORTED** | listener counts are private fields of the official models; the package exposes no subscription-count API |
| case `strictMode` | not configurable | `CreatePrometheusA2uiRuntimeOptions` has no validation option; the case runs with package defaults and a failure says so |

### Expected outcomes, from reading the code (to be confirmed by the boundary run)

- `fallback_states_unknown_type_and_cyclic_diagnostics` — **FAIL**: `runtime-core.ts` `assertAllowedComponents`
  (lines 584–616) refuses `UnregisteredFutureWidget` with `component-not-allowed` during preflight, so the surface is
  never created; the case expects an `unknown-type` placeholder plus `UNKNOWN_COMPONENT_TYPE` and
  `CYCLIC_REFERENCE` diagnostics and error envelopes.
- `v10_theme_dropped_in_permissive_mode_renders_like_none` — **FAIL**: `strictMode: false` cannot be applied, and
  `v1-messages.ts` `parseV1Message` (line 66) parses with the strict official 1.0 schema, whose `createSurface` is
  `.strict()`, so `theme` is refused (`invalid-message`) instead of dropped.
- `user_activation_gated_function_gesture_vs_programmatic` — **FAIL** at the programmatic step: the
  `EXPRESSION_ERROR` reaches `surface.onError`, but the runtime never forwards surface-channel errors to
  `onRendererMessage` (it sends `error` only for a refused `processMessages` batch, `reportV1Failure`), so the
  expected `{version, error}` envelope is missing.
- `agent_function_action_failure_reports_expression_error` — **FAIL**: the bundled `@a2ui/web_core` 0.15.0 has no
  renderer-side fallback that routes a schema-only function in an action to the agent (`callAgentFunction` is only
  reachable through `processor.callAgentFunction`); the invoker throws "schema-only and has no implementation", so
  no `callAgentFunction` envelope is emitted. The later steps also need the surface-error forwarding above.
- `validation_results_error_disables_warning_allows` — **FAIL** on `hints`: the official basic `TextField` renders
  messages only when `isValid` is false, so the `info` hint text is absent. Upstream's React harness lists exactly
  this as UNSUPPORTED ("SHOULD ... not implemented in Web Basic Catalog TextField"); here it is observable, so FAIL.
- `test_accessibility_dynamic_label_and_hidden_binding` — likely **FAIL** at step 2 on real axe-core
  `aria-hidden-focus`: the official element sets `aria-hidden="true"` on the button host but leaves the inner
  `<button>` focusable. Upstream runners do not run axe for React/Lit, so they cannot see this.
- `teardown_unmount_releases_subscriptions`, `delete_surface_unmounts_view` — **UNSUPPORTED**
  (`expectActiveSubscriptions`), unless an observable assertion in them fails.
- The remaining 15 adapter and 6 accessibility cases are expected to PASS; `aria-allowed-attr` with
  `aria-description` on a role-less custom element is the main uncertainty.

**Against UPG-3.** UPG-3's oracle requires every case to pass. The script exits non-zero on any FAIL; UNSUPPORTED
cases do not change the exit code but set `allPassed: false` in the report, so they cannot satisfy the oracle
without an amendment (per the open design record above: exclusion only by amendment).

### Script and negative control (10.3)

`pnpm run verify:a2ui-conformance -- --report <file>` builds `entity-graph-core` and `a2ui-react`, verifies the
digests, runs the spec, then reruns one adapter case that PASSED (preferably `tree_hierarchy_declared_order`) with
its first expected `text` changed, and requires it to FAIL on that mutation. Artifacts go to `<report>-artifacts/`
next to the report. The report holds the commit, file digests, the built entry's digest, per-case status and
reasons, counts, `allPassed`, the negative control and every command's argv and exit code. The exit code is
non-zero when any case FAILs or is unrecorded, the divergence list is invalid, or any negative control is not
exercised or does not fail.

### Divergence list (10.3, contract amendment 3)

The separate UNSUPPORTED map is gone. Unobservable assertions are recorded as ordinary failures
(`harness cannot observe <key>`), and every excused failure now lives in `tests/conformance/a2ui/divergences.json`.
The verifier classifies each `steps[<i>] …` failure to an assertion key (`expectViewTree`, `expectErrors`,
`expectOutbound`, `axeCore:<rule>`, the unobservable key, and so on; anything else is `unclassified:` and can never be
allowed; page errors carry no step and can never be allowed). A listed case is DIVERGED only when every failure is
one of its `(step, assertion)` allowances; a listed case that passes is reported as not exercised. Two controls
replay the evaluation with a broken list (an entry for a missing case, and a diverged case with one allowance
removed) and must fail. The list's SHA-256 is in the report. The strictMode remark became a per-case note, not a
failure.

The seven entries were derived from the case YAML and the 0.15.0 renderer source, not from a run (implementation
first). Three of them (fallback, permissive theme, agent-function failure) fail on several assertions from one cause.
The signed UPG-3 oracle says "the only assertion allowed to fail", which those three cannot meet; a wording
amendment ("the step and assertion of each failure it allows") is pending operator approval. If the boundary run
shows a listed case failing elsewhere, that is a FAIL to report, not a list to widen.

## Notes

The spec deltas in `specs/` were written at plan time from the adopted decisions. The change's "write spec
deltas" task finalizes them against the shipped behaviour. Acceptance evidence comes only from the phase's single
post-implementation boundary run defined in `adopted-contract.json`.
