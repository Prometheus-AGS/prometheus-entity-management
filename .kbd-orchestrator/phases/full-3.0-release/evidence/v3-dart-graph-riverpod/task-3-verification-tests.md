# Task 3 — permanent verification surface

## Acceptance-to-proof matrix

| Release promise | Permanent proof | Result |
| --- | --- | --- |
| One canonical graph; lists retain IDs only | `provider-contract_test.dart` remote list/detail test plus `view-contract_test.dart` graph reread test | Pass |
| Local, remote, and hybrid completeness | Provider contract tests assert local has zero transport calls, remote normalization, and local-first hybrid replacement | Pass |
| Optimistic create/update/delete and exact rollback | Provider contract tests cover confirmed update/create, prior-patch restoration, delete list-index restoration, and failed placeholder removal | Pass |
| Terminal versus transient failures | Terminal list error stops after one attempt; transient error stops at three total attempts | Pass |
| Realtime normalization and invalidation | Realtime update writes the graph and stales list membership; delete removes entity and membership | Pass |
| Pluggable transport and optional native seam | FFI contract delegates list/get/create/update/delete/change events while the verifier rejects required native dependencies | Pass |
| Generated Riverpod 3 public surface | Release verifier checks all seven generated provider families and the public barrel | Pass |
| Cross-view rendered propagation | Widget test asserts both joined surfaces change from `Alice Rivera` to `Alicia Rivera`; two golden receipts are hashed | Pass |

## BDD

The tagged Cucumber feature contains six scenarios and eighteen steps. It runs the permanent Flutter suite through the release verifier before making contract assertions. Machine-readable output is `task-3-cucumber.json`; the behavioral and visual receipt is `task-3-dart-report.json`.

## Visual inspection

Both 960×600 widget-harness states were inspected after golden generation. The Prometheus dark/orange surfaces remain aligned with no visible clipping, overflow, or collapsed cards. The optimistic state changes the same entity name in both the list and detail cards. This evidence intentionally certifies only the widget contract: it does not certify a full app, physical devices, mobile navigation, or accessibility. Those broader claims remain owned by `v3-flutter-riverpod-a2ui-example`.

## Feynman check

The simplest explanation is: the list remembers `User/1`, not a copy of Alice. Both cards ask the same graph what `User/1` looks like. An optimistic edit temporarily overlays that graph row, so both cards say Alicia. If the server rejects a write, the controller uses the graph-owned receipt to restore the previous patch, sync metadata, entity, and list position. A permanent test must therefore observe both surfaces and the hidden rollback metadata; a screenshot alone cannot prove either rule.

## Executed gates

| Command | Result |
| --- | --- |
| `pnpm exec eslint scripts/verify-dart-graph-riverpod.mjs tests/release/v3-dart-graph-riverpod.test.mjs tests/steps/v3-dart-graph-riverpod.steps.ts --max-warnings 0` | Pass |
| `pnpm run dart:format` | Pass; 17 files unchanged |
| `pnpm run dart:analyze` | Pass; no issues |
| `pnpm run dart:test` | Pass; 70 tests including automatically discovered contract and golden tests |
| `pnpm run test:dart-graph-riverpod` | Pass; structural and full Flutter release verifier tests |
| `pnpm run bdd:dart-graph-riverpod` | Pass; 6 scenarios, 18 steps |
| `pnpm exec openspec validate v3-dart-graph-riverpod --strict --no-interactive` | Pass; change is valid |
| `pnpm run dart:package` | Archive assembled and validated at 82 KB; command correctly remained non-green because Pub rejects this dirty transition state and the workspace lockfile is still in flight for task 5 |

## Explicit limits

- This task does not update coverage ledgers, skills, public guides, or change-level documentation; that is task 4.
- This task does not claim clean-repository, package-publish, platform-device, or release certification; those are tasks 5–6 and later changes.
- The Pub dry-run's two warnings are retained as evidence rather than bypassed with `--force`: the package lock transition and dirty working state require the explicit clean-state gate in task 5.
- Compatible transitive Dart packages report newer releases outside the stable pinned constraint solution. The stable top-level matrix remains the task-2 decision and is not silently widened here.
